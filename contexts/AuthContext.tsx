import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { CreditService } from '../services/CreditService';
import { User, Session } from '@supabase/supabase-js';
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
  signUp: (email: string, password: string, username: string) => Promise<{ user: User | null; session: Session | null }>;
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

      // Lanzar las 3 consultas en paralelo para no bloquear entre ellas
      const [subscriptionResult, creditsResult, profileResult] = await Promise.allSettled([
        supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", userId)
          .single(),
        supabase
          .from("ia_credits")
          .select("*")
          .eq("user_id", userId)
          .limit(1),
        supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('id', userId)
          .single()
      ]);

      const subscription = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value.data : null;

      // Procesar créditos
      let creditsData: { credits_total: number; credits_used: number } | null = null;
      if (creditsResult.status === 'fulfilled') {
        const { data: creditsResponse, error: creditsError } = creditsResult.value as any;
        if (!creditsError || creditsError.code === 'PGRST116') {
          if (Array.isArray(creditsResponse) && creditsResponse.length > 0) {
            creditsData = creditsResponse[0];
            CreditService.cleanupDuplicates(userId).then(cleaned => {
              if (cleaned) console.log('🧹 Limpieza de duplicados realizada en background');
            });
          }
        } else {
          console.error('❌ Error fetching credits:', creditsError);
        }
      }

      // Si no hay créditos, inicializar en background (no bloqueante)
      if (!creditsData) {
        console.log('✨ User has no credits row. Initializing 50 credits...');
        supabase
          .from('ia_credits')
          .insert({
            user_id: userId,
            credits_total: 50,
            credits_used: 0,
            period_start: new Date().toISOString(),
            period_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
          })
          .select()
          .single()
          .then(({ data: newCredits, error: insertError }) => {
            if (newCredits && !insertError) {
              creditsData = newCredits;
              console.log('✅ Credits initialized successfully.');
            } else if (insertError) {
              console.error('❌ Failed to auto-initialize credits:', insertError);
            }
          });
      } else {
        console.log('💰 Credits Found:', creditsData);
      }

      const profileData = profileResult.status === 'fulfilled' ? (profileResult.value as any).data : null;

      // Actualizar estado global
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

        return { ...prev, ...newData };
      });

      console.log('✅ Subscription data loaded');
    } catch (error) {
      console.error('❌ Error loading subscription data:', error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Timeout de seguridad: si por cualquier motivo el loading no se resuelve en 8s, lo forzamos
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        console.warn('⚠️ Safety timeout reached: forcing setLoading(false)');
        setLoading(false);
      }
    }, 8000);

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        const authUser = session?.user;
        if (authUser) {
          // 1. Mostrar la app inmediatamente con el usuario básico
          if (mounted) setUser(authUser as AppUser);
        } else {
          if (mounted) setUser(null);
        }
      } catch (error) {
        console.error('Error checking user session en inicialización:', error);
      } finally {
        // Quitar el loader SIEMPRE, aunque loadUserSubscriptionAndCredits no haya terminado
        clearTimeout(safetyTimer);
        if (mounted) setLoading(false);
      }
    };

    // Arrancar initializeAuth y, en paralelo, cargar datos extra sin bloquear el loader
    initializeAuth().then(async () => {
      // Después de quitar el loader, cargar datos extra en background
      try {
        const currentUser = (await supabase.auth.getSession()).data.session?.user;
        if (currentUser && mounted) {
          await loadUserSubscriptionAndCredits(currentUser.id);
        }
      } catch (e) {
        console.error('Error loading subscription data in background:', e);
      }
    });

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Prevenir condición de carrera al inicio
        if (event === 'INITIAL_SESSION') {
          return;
        }

        const currentUser = session?.user ?? null;

        if (currentUser) {
          setUser(currentUser as AppUser);
          // Cargar datos extra sin bloquear la navegación
          loadUserSubscriptionAndCredits(currentUser.id).catch(e =>
            console.error('Error loading subscription on auth change:', e)
          );
        } else {
          setUser(null);
        }

        if (mounted) setLoading(false);

        // Guardar/limpiar sesión en AsyncStorage
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

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
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
      console.log('[AUTH] Starting signUp process for email:', email);
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
      
      console.log('[AUTH] signUp response user:', data?.user?.id, 'session active:', !!data?.session);

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
      
      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('[AUTH] Error during sign up:', error);
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