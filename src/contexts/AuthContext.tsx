import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { firebaseService } from '../services/firebaseService';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    console.log('🔧 Setting up auth state listener...');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('👤 Auth state changed:', user?.email || 'No user');
      setUser(user);
      
      if (user && user.email) {
        try {
          // Check if user is super admin from environment
          const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
          
          if (SUPER_ADMIN_EMAIL && user.email === SUPER_ADMIN_EMAIL) {
            console.log('🔑 Super admin detected from env:', user.email);
            
            // Try to bootstrap super admin if not exists
            try {
              await firebaseService.bootstrapSuperAdmin(user.email, user.uid);
              console.log('✅ Super admin bootstrap completed');
            } catch (error) {
              console.error('❌ Bootstrap error:', error);
            }
          }
          
          // Check admin status
          console.log('🔍 Checking admin status for:', user.email);
          const adminCheck = await firebaseService.checkIsAdmin(user.email);
          const superAdminCheck = await firebaseService.checkIsSuperAdmin(user.email);
          
          console.log('📋 Admin check results:', { 
            isAdmin: adminCheck, 
            isSuperAdmin: superAdminCheck 
          });
          
          setIsAdmin(adminCheck);
          setIsSuperAdmin(superAdminCheck);
          
          // Update last login if admin
          if (adminCheck) {
            try {
              await firebaseService.updateLastLogin(user.email);
              console.log('✅ Last login updated');
            } catch (error) {
              console.warn('⚠️ Could not update last login:', error);
            }
          }
        } catch (error) {
          console.error('❌ Error checking admin status:', error);
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔐 Attempting login for:', email);
      
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase authentication successful');
      
      // Check if super admin email
      const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
      if (SUPER_ADMIN_EMAIL && email === SUPER_ADMIN_EMAIL) {
        console.log('🔑 Super admin login detected');
        
        // Bootstrap super admin if needed
        try {
          await firebaseService.bootstrapSuperAdmin(email, userCredential.user.uid);
          console.log('✅ Super admin ready');
          toast.success('Welcome, Super Admin!');
          return;
        } catch (error) {
          console.error('❌ Bootstrap error:', error);
        }
      }
      
      // Check if user is an admin
      console.log('🔍 Verifying admin access...');
      const adminCheck = await firebaseService.checkIsAdmin(email);
      
      if (!adminCheck) {
        console.log('❌ User is not an admin');
        await signOut(auth);
        throw new Error('Access denied. You are not authorized as an admin.');
      }
      
      console.log('✅ Admin access verified');
      toast.success('Login successful!');
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      // Handle Firebase auth errors
      if (error.code === 'auth/user-not-found') {
        toast.error('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect password');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many failed attempts. Please try again later');
      } else if (error.code === 'auth/network-request-failed') {
        toast.error('Network error. Please check your internet connection');
      } else {
        toast.error(error.message || 'Login failed');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      await signOut(auth);
      toast.success('Logged out successfully');
      console.log('✅ Logout successful');
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      toast.error(error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isSuperAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};