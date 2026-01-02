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
} from 'firebase/firestore';
import { db } from './firebase';
import type { WhitelistUser, AdminUser, RegistrationConfig } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const firebaseService = {
  // ========== SUPER ADMIN BOOTSTRAP ==========
  async bootstrapSuperAdmin(email: string, userId: string): Promise<void> {
    try {
      console.log('🔧 Bootstrapping super admin:', email);
      
      // Use email as document ID
      const adminDocRef = doc(db, 'admin_users', email);
      const existing = await getDoc(adminDocRef);
      
      if (existing.exists()) {
        console.log('✅ Super admin already exists');
        return;
      }

      const superAdminData = {
        email: email,
        name: 'Super Administrator',
        userId: userId,
        role: 'super_admin' as const,
        isActive: true,
        createdAt: Date.now(),
        createdBy: 'system',
        lastLogin: Date.now(),
        fcmToken: '',
        fcmTokenUpdatedAt: 0,
      };

      await setDoc(adminDocRef, superAdminData);
      console.log('✅ Super admin created successfully');
    } catch (error: any) {
      console.error('❌ Bootstrap error:', error);
      throw error;
    }
  },

  // ========== WHITELIST USERS ==========
  async getWhitelistUsers(adminEmail: string, isSuperAdmin: boolean): Promise<WhitelistUser[]> {
    try {
      const usersRef = collection(db, 'whitelist_users');
      let q;
      
      if (isSuperAdmin) {
        q = query(usersRef, orderBy('createdAt', 'desc'));
      } else {
        q = query(usersRef, where('addedBy', '==', adminEmail), orderBy('createdAt', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhitelistUser));
    } catch (error) {
      console.error('Error getting whitelist users:', error);
      throw error;
    }
  },

  async addWhitelistUser(user: Omit<WhitelistUser, 'id'>, addedBy: string): Promise<string> {
    try {
      // Check if userId already exists
      const usersRef = collection(db, 'whitelist_users');
      const existingQuery = query(usersRef, where('userId', '==', user.userId));
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        throw new Error(`User with userId "${user.userId}" already exists`);
      }

      const newUser = {
        ...user,
        createdAt: Date.now(),
        addedAt: Date.now(),
        addedBy,
        isActive: true,
        lastLogin: 0,
        fcmToken: '',
        fcmTokenUpdatedAt: 0,
      };
      
      const docRef = await addDoc(usersRef, newUser);
      return docRef.id;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  },

  async updateWhitelistUser(userId: string, data: Partial<WhitelistUser>): Promise<void> {
    try {
      const userRef = doc(db, 'whitelist_users', userId);
      await updateDoc(userRef, data);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  async deleteWhitelistUser(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'whitelist_users', userId);
      await deleteDoc(userRef);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // ========== DELETE ALL USERS ==========
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

    try {
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
          batchDocs.forEach(document => {
            batch.delete(document.ref);
          });

          await batch.commit();
          success += batchDocs.length;

          if (onProgress) {
            onProgress(success + failed, total);
          }

          if (i + BATCH_SIZE < snapshot.docs.length) {
            await delay(500);
          }
        } catch (error: any) {
          failed += batchDocs.length;
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
          
          if (onProgress) {
            onProgress(success + failed, total);
          }
        }
      }

      return { success, failed, errors };
    } catch (error) {
      console.error('Error deleting all users:', error);
      throw error;
    }
  },

  // ========== ADMIN USERS (Email as Document ID) ==========
  async getAdminUsers(): Promise<AdminUser[]> {
    try {
      const adminsRef = collection(db, 'admin_users');
      const snapshot = await getDocs(adminsRef);
      
      return snapshot.docs.map(doc => ({ 
        id: doc.id, // This is the email
        ...doc.data() 
      } as AdminUser));
    } catch (error) {
      console.error('Error getting admin users:', error);
      throw error;
    }
  },

  async addAdminUser(admin: Omit<AdminUser, 'id'>, createdBy: string): Promise<string> {
    try {
      // Use email as document ID
      const adminDocRef = doc(db, 'admin_users', admin.email);
      
      // Check if already exists
      const existing = await getDoc(adminDocRef);
      if (existing.exists()) {
        throw new Error('Admin with this email already exists');
      }

      const newAdmin = {
        email: admin.email,
        name: admin.name,
        userId: admin.userId,
        role: admin.role,
        createdAt: Date.now(),
        createdBy,
        isActive: true,
        lastLogin: 0,
        fcmToken: '',
        fcmTokenUpdatedAt: 0,
      };
      
      await setDoc(adminDocRef, newAdmin);
      return admin.email; // Return email as ID
    } catch (error) {
      console.error('Error adding admin:', error);
      throw error;
    }
  },

  async updateAdminUser(adminEmail: string, data: Partial<AdminUser>): Promise<void> {
    try {
      const adminRef = doc(db, 'admin_users', adminEmail);
      
      // Remove id from update data if present
      const { id, ...updateData } = data as any;
      
      await updateDoc(adminRef, updateData);
    } catch (error) {
      console.error('Error updating admin:', error);
      throw error;
    }
  },

  async deleteAdminUser(adminEmail: string): Promise<void> {
    try {
      const adminRef = doc(db, 'admin_users', adminEmail);
      await deleteDoc(adminRef);
    } catch (error) {
      console.error('Error deleting admin:', error);
      throw error;
    }
  },

  async checkIsAdmin(email: string): Promise<boolean> {
    try {
      const adminRef = doc(db, 'admin_users', email);
      const adminDoc = await getDoc(adminRef);
      
      return adminDoc.exists() && adminDoc.data()?.isActive === true;
    } catch (error) {
      console.error('Error checking admin:', error);
      return false;
    }
  },

  async checkIsSuperAdmin(email: string): Promise<boolean> {
    try {
      const adminRef = doc(db, 'admin_users', email);
      const adminDoc = await getDoc(adminRef);
      
      return adminDoc.exists() && 
             adminDoc.data()?.role === 'super_admin' && 
             adminDoc.data()?.isActive === true;
    } catch (error) {
      console.error('Error checking super admin:', error);
      return false;
    }
  },

  async getAdminByEmail(email: string): Promise<AdminUser | null> {
    try {
      const adminRef = doc(db, 'admin_users', email);
      const adminDoc = await getDoc(adminRef);
      
      if (!adminDoc.exists()) return null;
      
      return { 
        id: adminDoc.id, 
        ...adminDoc.data() 
      } as AdminUser;
    } catch (error) {
      console.error('Error getting admin by email:', error);
      return null;
    }
  },

  async updateLastLogin(email: string): Promise<void> {
    try {
      const adminRef = doc(db, 'admin_users', email);
      await updateDoc(adminRef, { 
        lastLogin: Date.now() 
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  },

  // ========== CONFIG ==========
  async getRegistrationConfig(): Promise<RegistrationConfig> {
    try {
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
    } catch (error) {
      console.error('Error getting config:', error);
      throw error;
    }
  },

  async updateRegistrationConfig(config: Partial<RegistrationConfig>): Promise<void> {
    try {
      const configRef = doc(db, 'app_config', 'registration_config');
      await updateDoc(configRef, {
        ...config,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  },

  // ========== EXPORT ==========
  async exportWhitelistAsJSON(): Promise<string> {
    try {
      const usersRef = collection(db, 'whitelist_users');
      const snapshot = await getDocs(usersRef);
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return JSON.stringify(users, null, 2);
    } catch (error) {
      console.error('Error exporting JSON:', error);
      throw error;
    }
  },

  async exportWhitelistAsCSV(): Promise<string> {
    try {
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
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  },

  // ========== BULK IMPORT ==========
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
    const processedUserIds = new Set<string>();

    // Validate and filter users
    const validUsers = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      try {
        if (!user.name?.trim()) {
          throw new Error(`Row ${i + 1}: Name is required`);
        }
        if (user.email && !user.email.includes('@')) {
          throw new Error(`Row ${i + 1}: Invalid email format`);
        }
        if (!user.userId?.trim()) {
          throw new Error(`Row ${i + 1}: User ID is required`);
        }
        if (!user.deviceId?.trim()) {
          throw new Error(`Row ${i + 1}: Device ID is required`);
        }

        // Check for duplicates in import file
        if (processedUserIds.has(user.userId)) {
          skipped++;
          errors.push(`Row ${i + 1}: Duplicate userId "${user.userId}" in import file`);
          continue;
        }

        processedUserIds.add(user.userId);
        validUsers.push({ ...user, rowNumber: i + 1 });
      } catch (error: any) {
        failed++;
        errors.push(error.message);
      }
    }

    // Process in batches
    for (let i = 0; i < validUsers.length; i += BATCH_SIZE) {
      const batch = validUsers.slice(i, i + BATCH_SIZE);
      
      for (const user of batch) {
        try {
          // Check if user already exists in database
          const usersRef = collection(db, 'whitelist_users');
          const existingQuery = query(usersRef, where('userId', '==', user.userId));
          const existingSnapshot = await getDocs(existingQuery);
          
          if (!existingSnapshot.empty) {
            skipped++;
            errors.push(`Row ${user.rowNumber}: User with ID "${user.userId}" already exists in database`);
            continue;
          }

          const newUser = {
            name: user.name.trim(),
            email: user.email?.trim() || '',
            userId: user.userId.trim(),
            deviceId: user.deviceId.trim(),
            isActive: user.isActive !== undefined ? Boolean(user.isActive) : true,
            createdAt: Date.now(),
            addedAt: Date.now(),
            addedBy,
            lastLogin: 0,
            fcmToken: '',
            fcmTokenUpdatedAt: 0,
          };
          
          await addDoc(usersRef, newUser);
          success++;
          
          if (onProgress) {
            onProgress(success + failed + skipped, users.length);
          }
        } catch (error: any) {
          failed++;
          const errorMsg = error.message || 'Unknown error';
          errors.push(`Row ${user.rowNumber}: ${errorMsg}`);
          
          if (onProgress) {
            onProgress(success + failed + skipped, users.length);
          }
        }
      }
      
      // Delay between batches
      if (i + BATCH_SIZE < validUsers.length) {
        await delay(DELAY_MS);
      }
    }

    return { success, failed, errors, skipped };
  },
};