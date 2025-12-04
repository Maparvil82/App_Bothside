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
      setLists([]);
      setLoading(false);
      return;
    }

    loadListsManually();

    // Suscripción a mis maletas
    const myMaletasSub = supabase
      .channel(`user_maletas_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_maletas', filter: `user_id=eq.${user.id}` },
        () => loadListsManually()
      )
      .subscribe();

    // Suscripción a colaboraciones (para saber si me invitan o acepto)
    const myCollabsSub = supabase
      .channel(`my_collabs_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maleta_collaborators', filter: `user_id=eq.${user.id}` },
        () => loadListsManually()
      )
      .subscribe();

    return () => {
      myMaletasSub.unsubscribe();
      myCollabsSub.unsubscribe();
    };
  }, [user, loadListsManually]);

  // Función para forzar recarga manual
  const refreshLists = useCallback(async () => {
    await loadListsManually();
  }, [loadListsManually]);

  // Función para recargar después de cambios
  const refreshAfterChange = useCallback(async () => {
    setTimeout(async () => {
      await loadListsManually();
    }, 1000);
  }, [loadListsManually]);

  // Función para añadir lista localmente
  const addListLocally = useCallback((newList: UserMaleta) => {
    setLists(prev => {
      if (prev.some(list => list.id === newList.id)) return prev;
      return [newList, ...prev];
    });
  }, []);

  // Función para eliminar lista localmente
  const removeListLocally = useCallback((maletaId: string) => {
    setLists(prev => prev.filter(list => list.id !== maletaId));
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