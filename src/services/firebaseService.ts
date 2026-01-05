import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  setDoc,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import type { WhitelistUser, AdminUser, RegistrationConfig } from '../types';

const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || '';

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ⭐ NEW: Generate safe document ID from userId
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

    const existing = await this.getAdminByEmail(email);
    if (existing) {
      console.log('Super admin already exists');
      return;
    }

    const adminsRef = collection(db, 'admin_users');
    const superAdminData = {
      email: email,
      name: 'Super Administrator',
      userId: userId,
      role: 'super_admin' as const,
      isActive: true,
      createdAt: Date.now(),
      createdBy: 'system',
      lastLogin: Date.now(),
    };

    await addDoc(adminsRef, superAdminData);
    console.log('Super admin created successfully');
  },

  // ========== WHITELIST USERS ==========
  async getWhitelistUsers(adminEmail: string, isSuperAdmin: boolean): Promise<WhitelistUser[]> {
    const usersRef = collection(db, 'whitelist_users');
    let q;
    
    if (isSuperAdmin) {
      q = query(usersRef, orderBy('createdAt', 'desc'));
    } else {
      q = query(usersRef, where('addedBy', '==', adminEmail), orderBy('createdAt', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhitelistUser));
  },

  // ⭐ IMPROVED: Use userId as document ID to prevent duplicates
  async addWhitelistUser(user: Omit<WhitelistUser, 'id'>, addedBy: string): Promise<string> {
    const docId = sanitizeDocId(user.userId);
    const userRef = doc(db, 'whitelist_users', docId);
    
    // Check if already exists
    const existingDoc = await getDoc(userRef);
    if (existingDoc.exists()) {
      throw new Error(`User with ID "${user.userId}" already exists`);
    }

    const newUser = {
      ...user,
      createdAt: Date.now(),
      addedAt: Date.now(),
      addedBy,
      isActive: true,
      lastLogin: 0,
    };
    
    await setDoc(userRef, newUser);
    return docId;
  },

  async updateWhitelistUser(userId: string, data: Partial<WhitelistUser>): Promise<void> {
    const userRef = doc(db, 'whitelist_users', userId);
    await updateDoc(userRef, data);
  },

  async deleteWhitelistUser(userId: string): Promise<void> {
    const userRef = doc(db, 'whitelist_users', userId);
    await deleteDoc(userRef);
  },

  // ========== DELETE ALL USERS (SUPER ADMIN ONLY) ==========
  async deleteAllWhitelistUsers(
    isSuperAdmin: boolean,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ 
    success: number; 
    failed: number; 
    errors: string[];
  }> {
    if (!isSuperAdmin) {
      throw new Error('Only super admin can delete all users');
    }

    const usersRef = collection(db, 'whitelist_users');
    const snapshot = await getDocs(usersRef);
    
    const BATCH_SIZE = 500; // Firestore batch limit
    const total = snapshot.docs.length;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchDocs = snapshot.docs.slice(i, i + BATCH_SIZE);

      try {
        batchDocs.forEach(document => {
          batch.delete(document.ref);
        });

        await batch.commit();
        success += batchDocs.length;

        // Report progress
        if (onProgress) {
          onProgress(success + failed, total);
        }

        // Small delay between batches
        if (i + BATCH_SIZE < snapshot.docs.length) {
          await delay(500);
        }
      } catch (error: any) {
        failed += batchDocs.length;
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
        
        // Report progress
        if (onProgress) {
          onProgress(success + failed, total);
        }
      }
    }

    return { success, failed, errors };
  },

  // ⭐ NEW: Remove duplicate users based on userId
  async removeDuplicateUsers(
    isSuperAdmin: boolean,
    onProgress?: (current: number, total: number) => void
  ): Promise<{
    totalScanned: number;
    duplicatesFound: number;
    duplicatesRemoved: number;
    errors: string[];
  }> {
    if (!isSuperAdmin) {
      throw new Error('Only super admin can remove duplicates');
    }

    const usersRef = collection(db, 'whitelist_users');
    const snapshot = await getDocs(usersRef);
    
    const userIdMap = new Map<string, string[]>(); // userId -> [docId1, docId2, ...]
    
    // Group documents by userId
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;
      
      if (!userIdMap.has(userId)) {
        userIdMap.set(userId, []);
      }
      userIdMap.get(userId)!.push(doc.id);
    });

    const duplicates: string[] = [];
    userIdMap.forEach((docIds, userId) => {
      if (docIds.length > 1) {
        // Keep the first one (oldest), delete the rest
        duplicates.push(...docIds.slice(1));
      }
    });

    let removed = 0;
    const errors: string[] = [];
    const BATCH_SIZE = 500;

    // Delete duplicates in batches
    for (let i = 0; i < duplicates.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchIds = duplicates.slice(i, i + BATCH_SIZE);

      try {
        batchIds.forEach(docId => {
          const docRef = doc(db, 'whitelist_users', docId);
          batch.delete(docRef);
        });

        await batch.commit();
        removed += batchIds.length;

        if (onProgress) {
          onProgress(removed, duplicates.length);
        }

        if (i + BATCH_SIZE < duplicates.length) {
          await delay(500);
        }
      } catch (error: any) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      }
    }

    return {
      totalScanned: snapshot.docs.length,
      duplicatesFound: duplicates.length,
      duplicatesRemoved: removed,
      errors,
    };
  },

  // ========== ADMIN USERS ==========
  async getAdminUsers(): Promise<AdminUser[]> {
    const adminsRef = collection(db, 'admin_users');
    const q = query(adminsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminUser));
  },

  async addAdminUser(admin: Omit<AdminUser, 'id'>, createdBy: string): Promise<string> {
    const adminsRef = collection(db, 'admin_users');
    const newAdmin = {
      ...admin,
      createdAt: Date.now(),
      createdBy,
      isActive: true,
      lastLogin: 0,
    };
    const docRef = await addDoc(adminsRef, newAdmin);
    return docRef.id;
  },

  async updateAdminUser(adminId: string, data: Partial<AdminUser>): Promise<void> {
    const adminRef = doc(db, 'admin_users', adminId);
    await updateDoc(adminRef, data);
  },

  async deleteAdminUser(adminId: string): Promise<void> {
    const adminRef = doc(db, 'admin_users', adminId);
    await deleteDoc(adminRef);
  },

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
    const q = query(
      adminsRef,
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
    await updateDoc(configRef, {
      ...config,
      updatedAt: Date.now(),
    });
  },

  // ========== EXPORT ==========
  async exportWhitelistAsJSON(): Promise<string> {
    const usersRef = collection(db, 'whitelist_users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return JSON.stringify(users, null, 2);
  },

  async exportWhitelistAsCSV(): Promise<string> {
    const usersRef = collection(db, 'whitelist_users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as WhitelistUser));
    
    const headers = ['ID', 'Name', 'Email', 'UserID', 'DeviceID', 'IsActive', 'CreatedAt', 'AddedBy', 'AddedAt'];
    const csv = [
      headers.join(','),
      ...users.map(user => [
        user.id,
        user.name || '',
        user.email || '',
        user.userId || '',
        user.deviceId || '',
        user.isActive ? 'true' : 'false',
        new Date(user.createdAt || 0).toISOString(),
        user.addedBy || '',
        new Date(user.addedAt || 0).toISOString(),
      ].join(','))
    ].join('\n');
    
    return csv;
  },

  // ========== JSON IMPORT ==========
  async importWhitelistFromJSON(
    jsonData: string,
    addedBy: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
    skipped: number;
  }> {
    try {
      const users = JSON.parse(jsonData);
      if (!Array.isArray(users)) {
        throw new Error('Invalid JSON format. Must be an array of user objects.');
      }
      
      return await this.bulkImportWhitelistUsers(users, addedBy, onProgress);
    } catch (error: any) {
      throw new Error(`JSON Import Error: ${error.message}`);
    }
  },
  
  // ⭐ COMPLETELY REWRITTEN: Bulk import with proper duplicate prevention
  async bulkImportWhitelistUsers(
    users: Array<{
      name: string;
      email?: string;
      userId: string;
      deviceId: string;
      isActive?: boolean;
    }>,
    addedBy: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ 
    success: number; 
    failed: number; 
    errors: string[];
    skipped: number;
  }> {
    const BATCH_SIZE = 50;
    const DELAY_MS = 1000;
    
    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Step 1: Validate all users first
    const validUsers: Array<{
      userId: string;
      name: string;
      email: string;
      deviceId: string;
      isActive: boolean;
      rowNumber: number;
    }> = [];
    
    const seenUserIds = new Set<string>();

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const rowNum = i + 1;
      
      try {
        // Validation
        if (!user.name?.trim()) {
          throw new Error('Name is required');
        }
        if (user.email && !user.email.includes('@')) {
          throw new Error('Valid email is required');
        }
        if (!user.userId?.trim()) {
          throw new Error('User ID is required');
        }
        if (!user.deviceId?.trim()) {
          throw new Error('Device ID is required');
        }

        // Check for duplicates within import file
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

    // Step 2: Batch check existing users in database
    const existingUserIds = new Set<string>();
    
    for (let i = 0; i < validUsers.length; i += 30) {
      const batch = validUsers.slice(i, i + 30);
      const userIds = batch.map(u => u.userId);
      
      try {
        const usersRef = collection(db, 'whitelist_users');
        const q = query(usersRef, where('userId', 'in', userIds));
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          existingUserIds.add(data.userId);
        });
      } catch (error: any) {
        console.error('Error checking existing users:', error);
      }
    }

    // Step 3: Filter out existing users
    const usersToImport = validUsers.filter(user => {
      if (existingUserIds.has(user.userId)) {
        skipped++;
        errors.push(`Row ${user.rowNumber}: User "${user.userId}" already exists in database`);
        return false;
      }
      return true;
    });

    // Step 4: Import in batches using document IDs based on userId
    for (let i = 0; i < usersToImport.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchUsers = usersToImport.slice(i, i + BATCH_SIZE);
      
      try {
        batchUsers.forEach(user => {
          const docId = sanitizeDocId(user.userId);
          const userRef = doc(db, 'whitelist_users', docId);
          
          batch.set(userRef, {
            name: user.name,
            email: user.email,
            userId: user.userId,
            deviceId: user.deviceId,
            isActive: user.isActive,
            createdAt: Date.now(),
            addedAt: Date.now(),
            addedBy,
            lastLogin: 0,
          });
        });

        await batch.commit();
        success += batchUsers.length;
        
        if (onProgress) {
          onProgress(success + failed + skipped, users.length);
        }
      } catch (error: any) {
        // If batch fails, try individual imports
        for (const user of batchUsers) {
          try {
            const docId = sanitizeDocId(user.userId);
            const userRef = doc(db, 'whitelist_users', docId);
            
            await setDoc(userRef, {
              name: user.name,
              email: user.email,
              userId: user.userId,
              deviceId: user.deviceId,
              isActive: user.isActive,
              createdAt: Date.now(),
              addedAt: Date.now(),
              addedBy,
              lastLogin: 0,
            });
            
            success++;
          } catch (individualError: any) {
            failed++;
            errors.push(`Row ${user.rowNumber}: ${individualError.message}`);
          }
          
          if (onProgress) {
            onProgress(success + failed + skipped, users.length);
          }
        }
      }
      
      // Delay between batches
      if (i + BATCH_SIZE < usersToImport.length) {
        await delay(DELAY_MS);
      }
    }

    return { success, failed, errors, skipped };
  },
};