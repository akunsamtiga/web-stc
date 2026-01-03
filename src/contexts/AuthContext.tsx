import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
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
  loginWithEmailLink: (email: string) => Promise<void>;
  completeEmailLinkSignIn: () => Promise<void>;
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
          const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
          if (SUPER_ADMIN_EMAIL && user.email && user.email === SUPER_ADMIN_EMAIL) {
            await firebaseService.bootstrapSuperAdmin(user.email, user.uid);
          }
          
          const adminCheck = await firebaseService.checkIsAdmin(user.email || '');
          const superAdminCheck = await firebaseService.checkIsSuperAdmin(user.email || '');
          
          setIsAdmin(adminCheck);
          setIsSuperAdmin(superAdminCheck);
          
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

  // Check if completing email link sign-in on component mount
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      completeEmailLinkSignIn();
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
      if (SUPER_ADMIN_EMAIL && email === SUPER_ADMIN_EMAIL) {
        await firebaseService.bootstrapSuperAdmin(email, userCredential.user.uid);
        toast.success('Welcome, Super Admin!');
        return;
      }
      
      const adminCheck = await firebaseService.checkIsAdmin(email);
      
      if (!adminCheck) {
        await signOut(auth);
        throw new Error('Access denied. You are not authorized as an admin.');
      }
      
      toast.success('Login successful!');
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/user-not-found') {
        toast.error('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect password');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many failed attempts. Please try again later');
      } else {
        toast.error(error.message || 'Login failed');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmailLink = async (email: string) => {
    try {
      setLoading(true);

      const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
      if (!SUPER_ADMIN_EMAIL || email !== SUPER_ADMIN_EMAIL) {
        throw new Error('Passwordless login is only available for super admin');
      }

      const actionCodeSettings = {
        url: window.location.origin + '/complete-login',
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Save email to localStorage to complete sign-in
      window.localStorage.setItem('emailForSignIn', email);
      
      toast.success('Login link sent to your email! Check your inbox.');
    } catch (error: any) {
      console.error('Email link error:', error);
      toast.error(error.message || 'Failed to send login link');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeEmailLinkSignIn = async () => {
    try {
      setLoading(true);
      
      let email = window.localStorage.getItem('emailForSignIn');
      
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      
      if (!email) {
        throw new Error('Email is required to complete sign-in');
      }

      const result = await signInWithEmailLink(auth, email, window.location.href);
      
      window.localStorage.removeItem('emailForSignIn');
      
      const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
      if (SUPER_ADMIN_EMAIL && email === SUPER_ADMIN_EMAIL) {
        await firebaseService.bootstrapSuperAdmin(email, result.user.uid);
      }
      
      toast.success('Successfully signed in!');
      
      // Redirect to home
      window.location.href = '/';
    } catch (error: any) {
      console.error('Complete sign-in error:', error);
      toast.error(error.message || 'Failed to complete sign-in');
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
      loginWithEmailLink,
      completeEmailLinkSignIn,
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