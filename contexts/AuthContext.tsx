import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

// Extend Supabase User type
export type AppUser = User & {
  planType: string | null;
  isPremium: boolean;
  creditsTotal: number | null;
  creditsUsed: number | null;
  creditsRemaining: number | null;
  renewalDate: string | null;
};

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AppUser | null) => void;
  loadUserSubscriptionAndCredits: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserSubscriptionAndCredits = async (userId: string) => {
    try {
      console.log('🔄 Loading subscription and credits for:', userId);

      // (a) Leer la tabla user_subscriptions
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .single();

      // (b) Leer la tabla ia_credits
      const { data: credits } = await supabase
        .from("ia_credits")
        .select("*")
        .eq("user_id", userId)
        .single();

      // (c) Guardar en el estado global del usuario
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          planType: subscription?.plan_type || null,
          isPremium: subscription?.status === 'active' || subscription?.status === 'trialing',
          creditsTotal: credits?.credits_total || 0,
          creditsUsed: credits?.credits_used || 0,
          creditsRemaining: credits ? (credits.credits_total || 0) - (credits.credits_used || 0) : 0,
          renewalDate: subscription?.current_period_end || null,
        };
      });

      console.log('✅ Subscription data loaded');
    } catch (error) {
      console.error('❌ Error loading subscription data:', error);
    }
  };

  useEffect(() => {
    // Verificar sesión actual
    const checkUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          // Set basic user first
          setUser(authUser as AppUser);
          // Then load extra data
          await loadUserSubscriptionAndCredits(authUser.id);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking user session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        let currentUser = session?.user ?? null;

        if (currentUser) {
          // Set basic user
          setUser(currentUser as AppUser);
          // Load extra data
          await loadUserSubscriptionAndCredits(currentUser.id);
        } else {
          setUser(null);
        }

        setLoading(false);

        // Guardar/limpiar sesión en AsyncStorage con manejo de errores
        try {
          if (currentUser) {
            await AsyncStorage.setItem('user_session', JSON.stringify(currentUser));
          } else {
            await AsyncStorage.removeItem('user_session');
          }
        } catch (storageError) {
          console.warn('Error saving session to AsyncStorage:', storageError);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        await loadUserSubscriptionAndCredits(data.user.id);
      }
    } catch (error) {
      console.error('Error during sign in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      // First create the auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      });

      if (error) throw error;

      // If user is created, wait a moment for triggers to complete, then update profile
      if (data.user) {
        // Small delay to allow database triggers to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update the profile with username (profile should exist from trigger)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            username: username,
            full_name: username,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          console.log('Attempting upsert as fallback...');

          // Fallback: try upsert in case profile doesn't exist yet
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              username: username,
              full_name: username,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });

          if (upsertError) {
            console.error('Error with upsert fallback:', upsertError);
          } else {
            console.log('✅ Profile created/updated successfully with upsert');
          }
        } else {
          console.log('✅ Profile updated successfully');
        }

        // Load initial empty subscription data
        await loadUserSubscriptionAndCredits(data.user.id);
      }
    } catch (error) {
      console.error('Error during sign up:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, setUser, loadUserSubscriptionAndCredits }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 