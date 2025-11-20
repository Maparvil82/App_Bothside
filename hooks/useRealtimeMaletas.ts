import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserMaleta } from '../services/database';

export const useRealtimeMaletas = () => {
  const { user } = useAuth();
  const [lists, setLists] = useState<UserMaleta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      console.log('🔍 useRealtimeMaletas: No user, clearing lists');
      setLists([]);
      setLoading(false);
      return;
    }

    console.log('🔍 useRealtimeMaletas: Setting up for user:', user.id);

    // Cargar listas iniciales
    const loadInitialLists = async () => {
      try {
        setLoading(true);
        console.log('🔍 useRealtimeMaletas: Loading initial lists...');

        const { data, error } = await supabase
          .from('user_maletas')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ useRealtimeMaletas: Error loading initial lists:', error);
          return;
        }

        console.log('✅ useRealtimeMaletas: Initial lists loaded:', data?.length || 0);
        setLists(data || []);
      } catch (error) {
        console.error('❌ useRealtimeMaletas: Error in loadInitialLists:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialLists();

    // Suscripción en tiempo real para user_maletas
    const listsSubscription = supabase
      .channel(`user_maletas_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_maletas',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 useRealtimeMaletas: Realtime change:', payload);

          if (payload.eventType === 'INSERT') {
            console.log('➕ useRealtimeMaletas: Adding new list:', payload.new);
            // Verificar que la lista no esté ya en el estado
            setLists(prev => {
              const exists = prev.some(list => list.id === payload.new.id);
              if (exists) {
                console.log('⚠️ useRealtimeMaletas: List already exists, skipping');
                return prev;
              }
              console.log('✅ useRealtimeMaletas: Adding new list to state');
              return [payload.new as UserMaleta, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ useRealtimeMaletas: Updating list:', payload.new);
            setLists(prev =>
              prev.map(list =>
                list.id === payload.new.id ? payload.new as UserMaleta : list
              )
            );
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ useRealtimeMaletas: Deleting list:', payload.old);
            setLists(prev =>
              prev.filter(list => list.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 useRealtimeMaletas: Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ useRealtimeMaletas: Successfully subscribed to realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ useRealtimeMaletas: Channel error, trying to resubscribe...');
        }
      });

    return () => {
      console.log('🔌 useRealtimeMaletas: Unsubscribing from channel');
      listsSubscription.unsubscribe();
    };
  }, [user]);

  return { lists, loading };
}; 