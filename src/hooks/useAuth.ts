import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current user
    authService.getCurrentUser().then(user => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await authService.signIn(email, password);
    return { error };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const result = await authService.signUp(email, password, username);
    return result;
  };

  const signOut = async () => {
    const { error } = await authService.signOut();
    return { error };
  };

  const resendConfirmation = async (email: string) => {
    const { error } = await authService.resendConfirmation(email);
    return { error };
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resendConfirmation,
  };
};