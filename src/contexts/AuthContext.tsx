import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Check if this is super admin email
          const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
          if (SUPER_ADMIN_EMAIL && user.email && user.email === SUPER_ADMIN_EMAIL) {
            // Try to bootstrap super admin if not exists
            await firebaseService.bootstrapSuperAdmin(user.email, user.uid);
          }
          
          // Check admin status from Firestore
          const adminCheck = await firebaseService.checkIsAdmin(user.email || '');
          const superAdminCheck = await firebaseService.checkIsSuperAdmin(user.email || '');
          
          setIsAdmin(adminCheck);
          setIsSuperAdmin(superAdminCheck);
          
          // Update last login
          if (adminCheck) {
            await firebaseService.updateLastLogin(user.email || '');
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
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
      
      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if super admin email
      const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
      if (SUPER_ADMIN_EMAIL && email === SUPER_ADMIN_EMAIL) {
        // Bootstrap super admin if needed
        await firebaseService.bootstrapSuperAdmin(email, userCredential.user.uid);
        toast.success('Welcome, Super Admin!');
        return;
      }
      
      // Check if user is admin
      const adminCheck = await firebaseService.checkIsAdmin(email);
      
      if (!adminCheck) {
        await signOut(auth);
        throw new Error('Access denied. You are not authorized as an admin.');
      }
      
      toast.success('Login successful!');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/user-not-found') {
        toast.error('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect password');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many failed attempts. Please try again later');
      } else if (error.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password');
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
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin, 
      isSuperAdmin, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};