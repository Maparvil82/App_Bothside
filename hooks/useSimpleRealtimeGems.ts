import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserCollectionService } from '../services/database';

export const useSimpleRealtimeGems = () => {
  const { user } = useAuth();
  const [gems, setGems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Función para cargar gems manualmente
  const loadGemsManually = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('🔍 useSimpleRealtimeGems: Loading gems manually for user:', user.id);
      const gemsData = await UserCollectionService.getUserGems(user.id);
      console.log('✅ useSimpleRealtimeGems: Gems loaded manually:', gemsData?.length || 0, 'gems');
      setGems(gemsData || []);
    } catch (error) {
      console.error('❌ useSimpleRealtimeGems: Error loading gems manually:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Función para refrescar gems
  const refreshGems = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadGemsManually();
    } catch (error) {
      console.error('❌ useSimpleRealtimeGems: Error refreshing gems:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadGemsManually]);

  useEffect(() => {
    if (!user) {
      console.log('⚠️ useSimpleRealtimeGems: No user, clearing gems');
      setGems([]);
      setLoading(false);
      return;
    }

    console.log('🔌 useSimpleRealtimeGems: Setting up simple realtime subscription for user:', user.id);

    // Cargar gems inicialmente
    loadGemsManually();

    // Configurar suscripción en tiempo real simplificada
    const gemsSubscription = supabase
      .channel(`simple_gems_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_collection',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 useSimpleRealtimeGems: UPDATE event received:', payload);
          
          const oldRecord = payload.old;
          const newRecord = payload.new;
          
          console.log('📝 useSimpleRealtimeGems: Old record:', oldRecord);
          console.log('📝 useSimpleRealtimeGems: New record:', newRecord);
          
          // Solo reaccionar a cambios en is_gem
          if (oldRecord.is_gem !== newRecord.is_gem) {
            console.log('🔄 useSimpleRealtimeGems: is_gem changed from', oldRecord.is_gem, 'to', newRecord.is_gem);
            
            // Recargar todos los gems cuando hay un cambio
            console.log('🔄 useSimpleRealtimeGems: Reloading gems due to change');
            loadGemsManually();
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 useSimpleRealtimeGems: Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ useSimpleRealtimeGems: Successfully subscribed to realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ useSimpleRealtimeGems: Channel error, will use manual refresh');
          // Si hay error en tiempo real, recargar manualmente después de un delay
          setTimeout(() => {
            console.log('🔄 useSimpleRealtimeGems: Triggering manual refresh due to channel error');
            loadGemsManually();
          }, 2000);
        } else {
          console.log('⚠️ useSimpleRealtimeGems: Unknown subscription status:', status);
        }
      });

    return () => {
      console.log('🔌 useSimpleRealtimeGems: Unsubscribing from channel');
      gemsSubscription.unsubscribe();
    };
  }, [user, loadGemsManually]);

  return {
    gems,
    loading,
    refreshing,
    refreshGems
  };
}; 