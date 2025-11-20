import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserMaleta } from '../services/database';
import { UserMaletaService } from '../services/database';

export const useHybridMaletas = () => {
  const { user } = useAuth();
  const [lists, setLists] = useState<UserMaleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastManualRefresh, setLastManualRefresh] = useState<Date | null>(null);

  // Función para cargar listas manualmente
  const loadListsManually = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔄 useHybridMaletas: Manual load triggered');
      setLoading(true);
      const userLists = await UserMaletaService.getUserMaletasWithAlbums(user.id);
      console.log('✅ useHybridMaletas: Manual load completed, lists:', userLists.length);
      setLists(userLists || []);
      setLastManualRefresh(new Date());
    } catch (error) {
      console.error('❌ useHybridMaletas: Manual load failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      console.log('🔍 useHybridMaletas: No user, clearing lists');
      setLists([]);
      setLoading(false);
      return;
    }

    console.log('🔍 useHybridMaletas: Setting up for user:', user.id);

    // Cargar listas iniciales
    loadListsManually();

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
          console.log('🔄 useHybridMaletas: Realtime change:', payload);

          if (payload.eventType === 'INSERT') {
            console.log('➕ useHybridMaletas: Adding new list:', payload.new);
            // Verificar que la lista no esté ya en el estado
            setLists(prev => {
              const exists = prev.some(list => list.id === payload.new.id);
              if (exists) {
                console.log('⚠️ useHybridMaletas: List already exists, skipping');
                return prev;
              }
              console.log('✅ useHybridMaletas: Adding new list to state');
              return [payload.new as UserMaleta, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ useHybridMaletas: Updating list:', payload.new);
            setLists(prev =>
              prev.map(list =>
                list.id === payload.new.id ? payload.new as UserMaleta : list
              )
            );
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ useHybridMaletas: Deleting list:', payload.old);
            setLists(prev =>
              prev.filter(list => list.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 useHybridMaletas: Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ useHybridMaletas: Successfully subscribed to realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ useHybridMaletas: Channel error, will use manual refresh');
          // Si hay error en tiempo real, recargar manualmente después de un delay
          setTimeout(() => {
            console.log('🔄 useHybridMaletas: Triggering manual refresh due to channel error');
            loadListsManually();
          }, 2000);
        } else {
          console.log('⚠️ useHybridMaletas: Unknown subscription status:', status);
        }
      });

    return () => {
      console.log('🔌 useHybridMaletas: Unsubscribing from channel');
      listsSubscription.unsubscribe();
    };
  }, [user, loadListsManually]);

  // Función para forzar recarga manual
  const refreshLists = useCallback(async () => {
    await loadListsManually();
  }, [loadListsManually]);

  // Función para recargar después de cambios
  const refreshAfterChange = useCallback(async () => {
    console.log('🔄 useHybridMaletas: Refreshing after change...');
    setTimeout(async () => {
      await loadListsManually();
    }, 1000); // Esperar 1 segundo para que se complete la operación
  }, [loadListsManually]);

  // Función para añadir lista localmente (sin esperar tiempo real)
  const addListLocally = useCallback((newList: UserMaleta) => {
    console.log('➕ useHybridMaletas: Adding list locally:', newList);
    setLists(prev => {
      const exists = prev.some(list => list.id === newList.id);
      if (exists) {
        console.log('⚠️ useHybridMaletas: List already exists locally, skipping');
        return prev;
      }
      console.log('✅ useHybridMaletas: Adding new list to local state');
      return [newList, ...prev];
    });
  }, []);

  // Función para eliminar lista localmente (sin esperar tiempo real)
  const removeListLocally = useCallback((maletaId: string) => {
    console.log('🗑️ useHybridMaletas: Removing list locally:', maletaId);
    setLists(prev => {
      const filtered = prev.filter(list => list.id !== maletaId);
      console.log('✅ useHybridMaletas: Removed list from local state');
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