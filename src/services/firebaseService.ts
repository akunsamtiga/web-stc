import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { WhitelistUser, AdminUser, RegistrationConfig } from '../types';

const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || '';

const sanitizeDocId = (userId: string): string => {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
};

export const firebaseService = {

  // ========== SUPER ADMIN BOOTSTRAP ==========
  async bootstrapSuperAdmin(email: string, userId: string): Promise<void> {
    if (!SUPER_ADMIN_EMAIL) {
      throw new Error('Super admin email not configured. Set VITE_SUPER_ADMIN_EMAIL in .env');
    }
    if (email !== SUPER_ADMIN_EMAIL) {
      throw new Error('Not authorized to bootstrap super admin');
    }

    // ✅ OPTIMIZED: Direct doc lookup by UID instead of collection query
    const adminRef = doc(db, 'admin_users', userId);
    const existing = await getDoc(adminRef);
    if (existing.exists()) {
      console.log('Super admin already exists');
      return;
    }

    await setDoc(adminRef, {
      email,
      name: 'Super Administrator',
      userId,
      role: 'super_admin' as const,
      isActive: true,
      createdAt: Date.now(),
      createdBy: 'system',
      lastLogin: Date.now(),
    });
    console.log('Super admin created successfully');
  },

  // ========== ✅ NEW: Single lookup replacing 3–4 sequential queries ==========
  // Since doc ID === Firebase UID, one getDoc() replaces:
  //   checkIsAdmin() + checkIsSuperAdmin() + getAdminByEmail() in updateLastLogin()
  async getAdminInfoByUID(uid: string): Promise<{
    isAdmin: boolean;
    isSuperAdmin: boolean;
    adminData: AdminUser | null;
  }> {
    try {
      const adminRef = doc(db, 'admin_users', uid);
      const snapshot = await getDoc(adminRef);

      if (!snapshot.exists()) {
        return { isAdmin: false, isSuperAdmin: false, adminData: null };
      }

      const data = snapshot.data() as Omit<AdminUser, 'id'>;

      if (!data.isActive) {
        return { isAdmin: false, isSuperAdmin: false, adminData: null };
      }

      return {
        isAdmin: true,
        isSuperAdmin: data.role === 'super_admin',
        adminData: { id: uid, ...data },
      };
    } catch {
      return { isAdmin: false, isSuperAdmin: false, adminData: null };
    }
  },

  // ✅ OPTIMIZED: Direct write by UID — no prior getAdminByEmail() query needed
  async updateLastLoginByUID(uid: string): Promise<void> {
    const adminRef = doc(db, 'admin_users', uid);
    await updateDoc(adminRef, { lastLogin: Date.now() });
  },

  // ========== WHITELIST USERS ==========
  async getWhitelistUsers(adminEmail: string, isSuperAdmin: boolean): Promise<WhitelistUser[]> {
    const usersRef = collection(db, 'whitelist_users');
    const q = isSuperAdmin
      ? query(usersRef, orderBy('createdAt', 'desc'))
      : query(usersRef, where('addedBy', '==', adminEmail), orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhitelistUser));
  },

  async addWhitelistUser(user: Omit<WhitelistUser, 'id'>, addedBy: string): Promise<WhitelistUser> {
    const docId = sanitizeDocId(user.userId);
    const userRef = doc(db, 'whitelist_users', docId);

    const existingDoc = await getDoc(userRef);
    if (existingDoc.exists()) {
      throw new Error(`User with ID "${user.userId}" already exists`);
    }

    const newUser: Omit<WhitelistUser, 'id'> = {
      ...user,
      createdAt: Date.now(),
      addedAt: Date.now(),
      addedBy,
      isActive: true,
      lastLogin: 0,
    };

    await setDoc(userRef, newUser);
    // ✅ Return the full user object so caller can do optimistic update without re-fetch
    return { id: docId, ...newUser };
  },

  async updateWhitelistUser(userId: string, data: Partial<WhitelistUser>): Promise<void> {
    const userRef = doc(db, 'whitelist_users', userId);
    await updateDoc(userRef, data);
  },

  async deleteWhitelistUser(userId: string): Promise<void> {
    const userRef = doc(db, 'whitelist_users', userId);
    await deleteDoc(userRef);
  },

  // ========== DELETE ALL USERS ==========
  async deleteAllWhitelistUsers(
    isSuperAdmin: boolean,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    if (!isSuperAdmin) throw new Error('Only super admin can delete all users');

    const usersRef = collection(db, 'whitelist_users');
    const snapshot = await getDocs(usersRef);

    const BATCH_SIZE = 500;
    const total = snapshot.docs.length;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchDocs = snapshot.docs.slice(i, i + BATCH_SIZE);

      try {
        batchDocs.forEach(document => batch.delete(document.ref));
        await batch.commit();
        success += batchDocs.length;
        onProgress?.(success + failed, total);
      } catch (error: any) {
        failed += batchDocs.length;
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
        onProgress?.(success + failed, total);
      }
    }

    return { success, failed, errors };
  },

  // ========== ADMIN USERS ==========
  async getAdminUsers(): Promise<AdminUser[]> {
    const adminsRef = collection(db, 'admin_users');
    const q = query(adminsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminUser));
  },

  async addAdminUser(admin: Omit<AdminUser, 'id'>, createdBy: string): Promise<string> {
    if (!admin.userId?.trim()) {
      throw new Error('User ID (Firebase UID) is required to create an admin');
    }

    const docId = admin.userId.trim();
    const adminRef = doc(db, 'admin_users', docId);

    const existingDoc = await getDoc(adminRef);
    if (existingDoc.exists()) {
      throw new Error(`Admin dengan UID "${docId}" sudah terdaftar`);
    }

    await setDoc(adminRef, {
      ...admin,
      createdAt: Date.now(),
      createdBy,
      isActive: true,
      lastLogin: 0,
    });
    return docId;
  },

  async updateAdminUser(adminId: string, data: Partial<AdminUser>): Promise<void> {
    const adminRef = doc(db, 'admin_users', adminId);
    await updateDoc(adminRef, data);
  },

  async deleteAdminUser(adminId: string): Promise<void> {
    const adminRef = doc(db, 'admin_users', adminId);
    await deleteDoc(adminRef);
  },

  // Kept for backward compat (used in Admins.tsx indirectly), but prefer getAdminInfoByUID
  async checkIsAdmin(email: string): Promise<boolean> {
    if (email === SUPER_ADMIN_EMAIL) return true;
    const adminsRef = collection(db, 'admin_users');
    const q = query(adminsRef, where('email', '==', email), where('isActive', '==', true));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  },

  async checkIsSuperAdmin(email: string): Promise<boolean> {
    if (email === SUPER_ADMIN_EMAIL) return true;
    const adminsRef = collection(db, 'admin_users');
    const q = query(adminsRef,
      where('email', '==', email),
      where('role', '==', 'super_admin'),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  },

  async getAdminByEmail(email: string): Promise<AdminUser | null> {
    const adminsRef = collection(db, 'admin_users');
    const q = query(adminsRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as AdminUser;
  },

  // ✅ DEPRECATED: Use updateLastLoginByUID(uid) instead
  async updateLastLogin(email: string): Promise<void> {
    const admin = await this.getAdminByEmail(email);
    if (admin) {
      await this.updateAdminUser(admin.id, { lastLogin: Date.now() });
    }
  },

  // ========== CONFIG ==========
  async getRegistrationConfig(): Promise<RegistrationConfig> {
    const configRef = doc(db, 'app_config', 'registration_config');
    const snapshot = await getDoc(configRef);

    if (!snapshot.exists()) {
      const defaultConfig: RegistrationConfig = {
        id: 'registration_config',
        registrationUrl: 'https://stockity.id/registered?a=25db72fbbc00',
        whatsappHelpUrl: 'https://wa.me/6285959860015',
        isActive: true,
        description: 'Default registration link',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        updatedBy: '',
      };
      await setDoc(configRef, defaultConfig);
      return defaultConfig;
    }

    return { id: snapshot.id, ...snapshot.data() } as RegistrationConfig;
  },

  async updateRegistrationConfig(config: Partial<RegistrationConfig>): Promise<void> {
    const configRef = doc(db, 'app_config', 'registration_config');
    await updateDoc(configRef, { ...config, updatedAt: Date.now() });
  },

  // ========== EXPORT (kept for bulk/server use) ==========
  async exportWhitelistAsJSON(): Promise<string> {
    const usersRef = collection(db, 'whitelist_users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return JSON.stringify(users, null, 2);
  },

  async exportWhitelistAsCSV(): Promise<string> {
    const usersRef = collection(db, 'whitelist_users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhitelistUser));

    const headers = ['ID', 'Name', 'Email', 'UserID', 'DeviceID', 'IsActive', 'CreatedAt', 'AddedBy', 'AddedAt'];
    const csv = [
      headers.join(','),
      ...users.map(user => [
        user.id, user.name || '', user.email || '', user.userId || '',
        user.deviceId || '', user.isActive ? 'true' : 'false',
        new Date(user.createdAt || 0).toISOString(),
        user.addedBy || '', new Date(user.addedAt || 0).toISOString(),
      ].join(','))
    ].join('\n');

    return csv;
  },

  // ========== JSON IMPORT ==========
  async importWhitelistFromJSON(
    jsonData: string,
    addedBy: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ success: number; failed: number; errors: string[]; skipped: number }> {
    try {
      const users = JSON.parse(jsonData);
      if (!Array.isArray(users)) throw new Error('Invalid JSON format. Must be an array.');
      return await this.bulkImportWhitelistUsers(users, addedBy, onProgress);
    } catch (error: any) {
      throw new Error(`JSON Import Error: ${error.message}`);
    }
  },

  async bulkImportWhitelistUsers(
    users: Array<{ name: string; email?: string; userId: string; deviceId: string; isActive?: boolean }>,
    addedBy: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ success: number; failed: number; errors: string[]; skipped: number }> {
    // ✅ OPTIMIZED: Removed artificial delay(1000ms) between batches
    // The 1s sleep per batch was adding huge latency (e.g. 1000 users = 20s of pure waiting)
    const BATCH_SIZE = 50;

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Step 1: Validate
    const validUsers: Array<{
      userId: string; name: string; email: string;
      deviceId: string; isActive: boolean; rowNumber: number;
    }> = [];
    const seenUserIds = new Set<string>();

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const rowNum = i + 1;
      try {
        if (!user.name?.trim()) throw new Error('Name is required');
        if (user.email && !user.email.includes('@')) throw new Error('Valid email is required');
        if (!user.userId?.trim()) throw new Error('User ID is required');
        if (!user.deviceId?.trim()) throw new Error('Device ID is required');

        if (seenUserIds.has(user.userId)) {
          skipped++;
          errors.push(`Row ${rowNum}: Duplicate userId "${user.userId}" in import file`);
          continue;
        }
        seenUserIds.add(user.userId);
        validUsers.push({
          userId: user.userId.trim(),
          name: user.name.trim(),
          email: user.email?.trim().toLowerCase() || `no-email-${user.userId}@placeholder.local`,
          deviceId: user.deviceId.trim(),
          isActive: user.isActive !== undefined ? Boolean(user.isActive) : true,
          rowNumber: rowNum,
        });
      } catch (error: any) {
        failed++;
        errors.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    // Step 2: Batch check existing (30 at a time — Firestore 'in' limit)
    const existingUserIds = new Set<string>();
    for (let i = 0; i < validUsers.length; i += 30) {
      const batch = validUsers.slice(i, i + 30);
      try {
        const usersRef = collection(db, 'whitelist_users');
        const q = query(usersRef, where('userId', 'in', batch.map(u => u.userId)));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => existingUserIds.add(doc.data().userId));
      } catch (error: any) {
        console.error('Error checking existing users:', error);
      }
    }

    // Step 3: Filter duplicates
    const usersToImport = validUsers.filter(user => {
      if (existingUserIds.has(user.userId)) {
        skipped++;
        errors.push(`Row ${user.rowNumber}: User "${user.userId}" already exists`);
        return false;
      }
      return true;
    });

    // Step 4: Import in batches (no artificial delay)
    const now = Date.now();
    for (let i = 0; i < usersToImport.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchUsers = usersToImport.slice(i, i + BATCH_SIZE);

      try {
        batchUsers.forEach(user => {
          const docId = sanitizeDocId(user.userId);
          batch.set(doc(db, 'whitelist_users', docId), {
            name: user.name, email: user.email, userId: user.userId,
            deviceId: user.deviceId, isActive: user.isActive,
            createdAt: now, addedAt: now, addedBy, lastLogin: 0,
          });
        });

        await batch.commit();
        success += batchUsers.length;
        onProgress?.(success + failed + skipped, users.length);
      } catch (error: any) {
        // Fallback: try individual writes
        for (const user of batchUsers) {
          try {
            const docId = sanitizeDocId(user.userId);
            await setDoc(doc(db, 'whitelist_users', docId), {
              name: user.name, email: user.email, userId: user.userId,
              deviceId: user.deviceId, isActive: user.isActive,
              createdAt: now, addedAt: now, addedBy, lastLogin: 0,
            });
            success++;
          } catch (individualError: any) {
            failed++;
            errors.push(`Row ${user.rowNumber}: ${individualError.message}`);
          }
          onProgress?.(success + failed + skipped, users.length);
        }
      }
    }

    return { success, failed, errors, skipped };
  },
};