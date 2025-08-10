import { useState, useEffect } from 'react';
import { AuthService } from '../services/auth';
import { User } from '../types/auth';

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    try {
      unsubscribe = AuthService.onAuthStateChanged((user) => {
        setUser(user);
        
        if (initializing) {
          setInitializing(false);
        }
        
        setLoading(false);
      });
    } catch (e) {
      console.error("Error setting up auth listener:", e);
      setLoading(false);
      setInitializing(false);
    }

    // Cleanup subscription on unmount
    return () => { 
      if (unsubscribe) unsubscribe(); 
    };
  }, [initializing]);

  return {
    user,
    loading,
    initializing,
    isAuthenticated: !!user,
  };
};