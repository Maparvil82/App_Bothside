import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserCollectionService } from '../services/database';

export const useRealtimeGems = () => {
  const { user } = useAuth();
  const [gems, setGems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Función para cargar gems manualmente
  const loadGemsManually = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('🔍 useRealtimeGems: Loading gems manually for user:', user.id);
      const gemsData = await UserCollectionService.getUserGems(user.id);
      console.log('✅ useRealtimeGems: Gems loaded manually:', gemsData?.length || 0, 'gems');
      setGems(gemsData || []);
    } catch (error) {
      console.error('❌ useRealtimeGems: Error loading gems manually:', error);
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
      console.error('❌ useRealtimeGems: Error refreshing gems:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadGemsManually]);

  // Función para añadir gem localmente (inmediato)
  const addGemLocally = useCallback((newGem: any) => {
    console.log('➕ useRealtimeGems: Adding gem locally:', newGem);
    console.log('📋 useRealtimeGems: Current gems count before adding:', gems.length);
    
    setGems(prev => {
      console.log('🔄 useRealtimeGems: Updating gems state, current count:', prev.length);
      const exists = prev.some(gem => gem.id === newGem.id);
      if (exists) {
        console.log('⚠️ useRealtimeGems: Gem already exists locally, skipping');
        return prev;
      }
      console.log('✅ useRealtimeGems: Adding new gem to local state');
      const newGems = [newGem, ...prev];
      console.log('📊 useRealtimeGems: New gems count after adding:', newGems.length);
      return newGems;
    });
  }, [gems.length]);

  // Función para remover gem localmente (inmediato)
  const removeGemLocally = useCallback((gemId: string) => {
    console.log('➖ useRealtimeGems: Removing gem locally:', gemId);
    setGems(prev => prev.filter(gem => gem.id !== gemId));
  }, []);

  // Función para actualizar gem localmente
  const updateGemLocally = useCallback((updatedGem: any) => {
    console.log('🔄 useRealtimeGems: Updating gem locally:', updatedGem);
    setGems(prev => prev.map(gem => gem.id === updatedGem.id ? updatedGem : gem));
  }, []);

  useEffect(() => {
    if (!user) {
      console.log('⚠️ useRealtimeGems: No user, clearing gems');
      setGems([]);
      setLoading(false);
      return;
    }

    console.log('🔌 useRealtimeGems: Setting up realtime subscription for user:', user.id);

    // Cargar gems inicialmente
    loadGemsManually();

    // Configurar suscripción en tiempo real
    const gemsSubscription = supabase
      .channel(`user_gems_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_collection',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 useRealtimeGems: Realtime event received:', payload);
          console.log('📋 useRealtimeGems: Event details:', {
            eventType: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            old: payload.old,
            new: payload.new
          });
          
          if (payload.eventType === 'INSERT') {
            // Nuevo registro añadido a la colección
            const newRecord = payload.new;
            console.log('📥 useRealtimeGems: INSERT event - new record:', newRecord);
            if (newRecord.is_gem === true) {
              console.log('➕ useRealtimeGems: New gem added via realtime');
              // Necesitamos obtener los datos completos del álbum
              UserCollectionService.getUserGems(user.id)
                .then(gemsData => {
                  console.log('📊 useRealtimeGems: Fetched gems data:', gemsData?.length || 0, 'gems');
                  const newGem = gemsData.find(gem => gem.id === newRecord.id);
                  console.log('🔍 useRealtimeGems: Looking for gem with ID:', newRecord.id);
                  console.log('📋 useRealtimeGems: Found gem:', newGem);
                  if (newGem) {
                    addGemLocally(newGem);
                  } else {
                    console.log('⚠️ useRealtimeGems: New gem not found in fetched data');
                  }
                })
                .catch(error => {
                  console.error('❌ useRealtimeGems: Error fetching new gem data:', error);
                });
            } else {
              console.log('📋 useRealtimeGems: New record is not a gem (is_gem =', newRecord.is_gem, ')');
            }
          } else if (payload.eventType === 'UPDATE') {
            // Registro actualizado
            const oldRecord = payload.old;
            const newRecord = payload.new;
            
            console.log('📝 useRealtimeGems: UPDATE event - old:', oldRecord, 'new:', newRecord);
            
            if (oldRecord.is_gem !== newRecord.is_gem) {
              console.log('🔄 useRealtimeGems: is_gem changed from', oldRecord.is_gem, 'to', newRecord.is_gem);
              
              if (newRecord.is_gem === true) {
                // Gem añadido
                console.log('➕ useRealtimeGems: Gem added via realtime');
                UserCollectionService.getUserGems(user.id)
                  .then(gemsData => {
                    console.log('📊 useRealtimeGems: Fetched gems data after update:', gemsData?.length || 0, 'gems');
                    const newGem = gemsData.find(gem => gem.id === newRecord.id);
                    console.log('🔍 useRealtimeGems: Looking for updated gem with ID:', newRecord.id);
                    console.log('📋 useRealtimeGems: Found updated gem:', newGem);
                    if (newGem) {
                      addGemLocally(newGem);
                    } else {
                      console.log('⚠️ useRealtimeGems: Updated gem not found in fetched data');
                    }
                  })
                  .catch(error => {
                    console.error('❌ useRealtimeGems: Error fetching updated gem data:', error);
                  });
              } else if (newRecord.is_gem === false) {
                // Gem removido
                console.log('➖ useRealtimeGems: Gem removed via realtime');
                removeGemLocally(newRecord.id);
              }
            } else {
              // Otros cambios en el registro
              console.log('🔄 useRealtimeGems: Gem updated via realtime (no is_gem change)');
              updateGemLocally(newRecord);
            }
          } else if (payload.eventType === 'DELETE') {
            // Registro eliminado
            console.log('➖ useRealtimeGems: Gem deleted via realtime');
            removeGemLocally(payload.old.id);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 useRealtimeGems: Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ useRealtimeGems: Successfully subscribed to realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ useRealtimeGems: Channel error, will use manual refresh');
          // Si hay error en tiempo real, recargar manualmente después de un delay
          setTimeout(() => {
            console.log('🔄 useRealtimeGems: Triggering manual refresh due to channel error');
            loadGemsManually();
          }, 2000);
        } else {
          console.log('⚠️ useRealtimeGems: Unknown subscription status:', status);
        }
      });

    return () => {
      console.log('🔌 useRealtimeGems: Unsubscribing from channel');
      gemsSubscription.unsubscribe();
    };
  }, [user, loadGemsManually, addGemLocally, removeGemLocally, updateGemLocally]);

  return {
    gems,
    loading,
    refreshing,
    refreshGems,
    addGemLocally,
    removeGemLocally,
    updateGemLocally
  };
}; 