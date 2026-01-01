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
} from 'firebase/firestore';
import { db } from './firebase';
import type { WhitelistUser, AdminUser, RegistrationConfig } from '../types';

const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || '';

export const firebaseService = {
  // ========== SUPER ADMIN BOOTSTRAP ==========
  async bootstrapSuperAdmin(email: string, userId: string): Promise<void> {
    // Only bootstrap if email matches super admin email
    if (!SUPER_ADMIN_EMAIL) {
      throw new Error('Super admin email not configured. Set VITE_SUPER_ADMIN_EMAIL in .env');
    }
    if (email !== SUPER_ADMIN_EMAIL) {
      throw new Error('Not authorized to bootstrap super admin');
    }

    // Check if super admin already exists
    const existing = await this.getAdminByEmail(email);
    if (existing) {
      console.log('Super admin already exists');
      return;
    }

    // Create super admin document
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

  async addWhitelistUser(user: Omit<WhitelistUser, 'id'>, addedBy: string): Promise<string> {
    const usersRef = collection(db, 'whitelist_users');
    const newUser = {
      ...user,
      createdAt: Date.now(),
      addedAt: Date.now(),
      addedBy,
      isActive: true,
      lastLogin: 0,
    };
    const docRef = await addDoc(usersRef, newUser);
    return docRef.id;
  },

  async updateWhitelistUser(userId: string, data: Partial<WhitelistUser>): Promise<void> {
    const userRef = doc(db, 'whitelist_users', userId);
    await updateDoc(userRef, data);
  },

  async deleteWhitelistUser(userId: string): Promise<void> {
    const userRef = doc(db, 'whitelist_users', userId);
    await deleteDoc(userRef);
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

  // ========== IMPORT ==========
  async bulkImportWhitelistUsers(
    users: Array<{
      name: string;
      email: string;
      userId: string;
      deviceId: string;
      isActive?: boolean;
    }>,
    addedBy: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const usersRef = collection(db, 'whitelist_users');
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Validate required fields
        if (!user.name || !user.email || !user.userId || !user.deviceId) {
          throw new Error(`Missing required fields for user: ${user.email || 'unknown'}`);
        }

        // Check if user already exists
        const existingQuery = query(
          usersRef,
          where('userId', '==', user.userId)
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (!existingSnapshot.empty) {
          throw new Error(`User with ID ${user.userId} already exists`);
        }

        // Add user
        const newUser: Omit<WhitelistUser, 'id'> = {
          name: user.name,
          email: user.email,
          userId: user.userId,
          deviceId: user.deviceId,
          isActive: user.isActive !== undefined ? user.isActive : true,
          createdAt: Date.now(),
          addedAt: Date.now(),
          addedBy,
          lastLogin: 0,
        };
        
        await addDoc(usersRef, newUser);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(error.message || 'Unknown error');
      }
    }

    return { success, failed, errors };
  },
};