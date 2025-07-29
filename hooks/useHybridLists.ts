import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserList } from '../services/database';
import { UserListService } from '../services/database';

export const useHybridLists = () => {
  const { user } = useAuth();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastManualRefresh, setLastManualRefresh] = useState<Date | null>(null);

  // Función para cargar listas manualmente
  const loadListsManually = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('🔄 useHybridLists: Manual load triggered');
      setLoading(true);
      const userLists = await UserListService.getUserLists(user.id);
      console.log('✅ useHybridLists: Manual load completed, lists:', userLists.length);
      setLists(userLists || []);
      setLastManualRefresh(new Date());
    } catch (error) {
      console.error('❌ useHybridLists: Manual load failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      console.log('🔍 useHybridLists: No user, clearing lists');
      setLists([]);
      setLoading(false);
      return;
    }

    console.log('🔍 useHybridLists: Setting up for user:', user.id);

    // Cargar listas iniciales
    loadListsManually();

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
          console.log('🔄 useHybridLists: Realtime change:', payload);
          
          if (payload.eventType === 'INSERT') {
            console.log('➕ useHybridLists: Adding new list:', payload.new);
            // Verificar que la lista no esté ya en el estado
            setLists(prev => {
              const exists = prev.some(list => list.id === payload.new.id);
              if (exists) {
                console.log('⚠️ useHybridLists: List already exists, skipping');
                return prev;
              }
              console.log('✅ useHybridLists: Adding new list to state');
              return [payload.new as UserList, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ useHybridLists: Updating list:', payload.new);
            setLists(prev => 
              prev.map(list => 
                list.id === payload.new.id ? payload.new as UserList : list
              )
            );
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ useHybridLists: Deleting list:', payload.old);
            setLists(prev => 
              prev.filter(list => list.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 useHybridLists: Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ useHybridLists: Successfully subscribed to realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ useHybridLists: Channel error, will use manual refresh');
          // Si hay error en tiempo real, recargar manualmente después de un delay
          setTimeout(() => {
            console.log('🔄 useHybridLists: Triggering manual refresh due to channel error');
            loadListsManually();
          }, 2000);
        } else {
          console.log('⚠️ useHybridLists: Unknown subscription status:', status);
        }
      });

    return () => {
      console.log('🔌 useHybridLists: Unsubscribing from channel');
      listsSubscription.unsubscribe();
    };
  }, [user, loadListsManually]);

  // Función para forzar recarga manual
  const refreshLists = useCallback(async () => {
    await loadListsManually();
  }, [loadListsManually]);

  // Función para recargar después de cambios
  const refreshAfterChange = useCallback(async () => {
    console.log('🔄 useHybridLists: Refreshing after change...');
    setTimeout(async () => {
      await loadListsManually();
    }, 1000); // Esperar 1 segundo para que se complete la operación
  }, [loadListsManually]);

  // Función para añadir lista localmente (sin esperar tiempo real)
  const addListLocally = useCallback((newList: UserList) => {
    console.log('➕ useHybridLists: Adding list locally:', newList);
    setLists(prev => {
      const exists = prev.some(list => list.id === newList.id);
      if (exists) {
        console.log('⚠️ useHybridLists: List already exists locally, skipping');
        return prev;
      }
      console.log('✅ useHybridLists: Adding new list to local state');
      return [newList, ...prev];
    });
  }, []);

  // Función para eliminar lista localmente (sin esperar tiempo real)
  const removeListLocally = useCallback((listId: string) => {
    console.log('🗑️ useHybridLists: Removing list locally:', listId);
    setLists(prev => {
      const filtered = prev.filter(list => list.id !== listId);
      console.log('✅ useHybridLists: Removed list from local state');
      return filtered;
    });
  }, []);

  return { 
    lists, 
    loading, 
    refreshLists,
    refreshAfterChange,
    addListLocally,
    removeListLocally,
    lastManualRefresh 
  };
}; 