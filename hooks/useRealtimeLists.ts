import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserList } from '../services/database';

export const useRealtimeLists = () => {
  const { user } = useAuth();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      console.log('🔍 useRealtimeLists: No user, clearing lists');
      setLists([]);
      setLoading(false);
      return;
    }

    console.log('🔍 useRealtimeLists: Setting up for user:', user.id);

    // Cargar listas iniciales
    const loadInitialLists = async () => {
      try {
        setLoading(true);
        console.log('🔍 useRealtimeLists: Loading initial lists...');
        
        const { data, error } = await supabase
          .from('user_lists')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ useRealtimeLists: Error loading initial lists:', error);
          return;
        }

        console.log('✅ useRealtimeLists: Initial lists loaded:', data?.length || 0);
        setLists(data || []);
      } catch (error) {
        console.error('❌ useRealtimeLists: Error in loadInitialLists:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialLists();

    // Suscripción en tiempo real para user_lists
    const listsSubscription = supabase
      .channel(`user_lists_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_lists',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 useRealtimeLists: Realtime change:', payload);
          
          if (payload.eventType === 'INSERT') {
            console.log('➕ useRealtimeLists: Adding new list:', payload.new);
            // Verificar que la lista no esté ya en el estado
            setLists(prev => {
              const exists = prev.some(list => list.id === payload.new.id);
              if (exists) {
                console.log('⚠️ useRealtimeLists: List already exists, skipping');
                return prev;
              }
              console.log('✅ useRealtimeLists: Adding new list to state');
              return [payload.new as UserList, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ useRealtimeLists: Updating list:', payload.new);
            setLists(prev => 
              prev.map(list => 
                list.id === payload.new.id ? payload.new as UserList : list
              )
            );
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ useRealtimeLists: Deleting list:', payload.old);
            setLists(prev => 
              prev.filter(list => list.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 useRealtimeLists: Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ useRealtimeLists: Successfully subscribed to realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ useRealtimeLists: Channel error, trying to resubscribe...');
        }
      });

    return () => {
      console.log('🔌 useRealtimeLists: Unsubscribing from channel');
      listsSubscription.unsubscribe();
    };
  }, [user]);

  return { lists, loading };
}; 