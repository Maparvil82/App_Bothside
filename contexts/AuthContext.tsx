import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { CreditService } from '../services/CreditService';
import { User } from '@supabase/supabase-js';

// Extend Supabase User type
export type AppUser = User & {
  planType: string | null;
  isPremium: boolean;
  creditsTotal: number | null;
  creditsUsed: number | null;
  creditsRemaining: number | null;
  renewalDate: string | null;
  // Profile data
  username?: string;
  fullName?: string;
  avatarUrl?: string; // Add explicit field
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

  const loadUserSubscriptionAndCredits = useCallback(async (userId: string) => {
    try {
      console.log('🔄 Loading subscription and credits for:', userId);

      // (a) Read user_subscriptions
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .single();

      // (b) Read ia_credits with limit(1) to handle duplicates
      let creditsData = null;

      const { data: creditsResponse, error: creditsError } = await supabase
        .from("ia_credits")
        .select("*")
        .eq("user_id", userId)
        .limit(1);

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error('❌ Error fetching credits:', creditsError);
      } else {
        // Handle array result
        if (Array.isArray(creditsResponse) && creditsResponse.length > 0) {
          creditsData = creditsResponse[0];
          // Trigger cleanup independently of this query result length (because we use limit(1))
          // We call it in background to ensure data consistency
          // Check if imports are correct (CreditService is imported)
          CreditService.cleanupDuplicates(userId).then(cleaned => {
            if (cleaned) console.log('🧹 Limpieza de duplicados realizada en background');
          });
        }
      }

      // If missing, initialize
      if (!creditsData && (!creditsError || creditsError.code === 'PGRST116')) {
        console.log('✨ User has no credits row. Initializing 50 credits...');
        const { data: newCredits, error: insertError } = await supabase
          .from('ia_credits')
          .insert({
            user_id: userId,
            credits_total: 50,
            credits_used: 0,
            period_start: new Date().toISOString(),
            period_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
          })
          .select()
          .single();

        if (newCredits && !insertError) {
          creditsData = newCredits;
          console.log('✅ Credits initialized successfully.');
        } else {
          console.error('❌ Failed to auto-initialize credits:', insertError);
        }
      } else if (creditsData) {
        console.log('💰 Credits Found:', creditsData);
      }

      // (c) Read Profile Data (avatar, username)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', userId)
        .single();

      // (c) Update global state
      setUser(prev => {
        if (!prev) return null;

        const newData = {
          planType: subscription?.plan_type || null,
          isPremium: subscription?.status === 'active' || subscription?.status === 'trialing',
          creditsTotal: creditsData?.credits_total || 0,
          creditsUsed: creditsData?.credits_used || 0,
          creditsRemaining: creditsData ? (creditsData.credits_total || 0) - (creditsData.credits_used || 0) : 0,
          renewalDate: subscription?.current_period_end || null,
          username: profileData?.username || prev.user_metadata?.username,
          fullName: profileData?.full_name || prev.user_metadata?.full_name,
          avatarUrl: profileData?.avatar_url || prev.user_metadata?.avatar_url,
        };

        // Simple comparison to avoid unnecessary updates
        if (
          prev.planType === newData.planType &&
          prev.isPremium === newData.isPremium &&
          prev.creditsTotal === newData.creditsTotal &&
          prev.creditsUsed === newData.creditsUsed &&
          prev.creditsRemaining === newData.creditsRemaining &&
          prev.renewalDate === newData.renewalDate &&
          prev.avatarUrl === newData.avatarUrl
        ) {
          return prev;
        }

        return {
          ...prev,
          ...newData
        };
      });

      console.log('✅ Subscription data loaded');
    } catch (error) {
      console.error('❌ Error loading subscription data:', error);
    }
  }, []);

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
          setUser(prev => {
            // Si el usuario básico es el mismo (por ID), mantenemos la referencia 'prev' si es posible,
            // o actualizamos solo campos básicos.
            // Sin embargo, session.user puede traer token refrescado.
            // Para simplificar, actualizamos si cambia ID o email, pero
            // lo mejor es confiar en que si session cambia, actualizamos.
            return currentUser as AppUser;
          });

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
  }, [loadUserSubscriptionAndCredits]);

  const signIn = useCallback(async (email: string, password: string) => {
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
  }, [loadUserSubscriptionAndCredits]);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
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

        // Initialize AI Credits with 50 (Welcome Gift)
        const { error: creditsError } = await supabase
          .from('ia_credits')
          .insert({
            user_id: data.user.id,
            credits_total: 50,
            credits_used: 0,
            period_start: new Date().toISOString(),
            period_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
          });

        if (creditsError) {
          console.error('Error initializing credits:', creditsError);
          // Non-blocking, can function without it (will treat as 0) or logic in service checks.
        } else {
          console.log('✅ Initialized 50 AI credits for new user');
        }

        // Load initial empty subscription data
        await loadUserSubscriptionAndCredits(data.user.id);
      }
    } catch (error) {
      console.error('Error during sign up:', error);
      throw error;
    }
  }, [loadUserSubscriptionAndCredits]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  }, []);

  const value = React.useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut,
    setUser,
    loadUserSubscriptionAndCredits
  }), [user, loading, signIn, signUp, signOut, loadUserSubscriptionAndCredits]);

  return (
    <AuthContext.Provider value={value}>
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