import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión actual
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
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
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Guardar/limpiar sesión en AsyncStorage con manejo de errores
        try {
          if (session?.user) {
            await AsyncStorage.setItem('user_session', JSON.stringify(session.user));
          } else {
            await AsyncStorage.removeItem('user_session');
          }
        } catch (storageError) {
          console.warn('Error saving session to AsyncStorage:', storageError);
          // No fallar la aplicación por errores de storage
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
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
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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