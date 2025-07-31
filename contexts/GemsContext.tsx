import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { UserCollectionService } from '../services/database';

interface GemsContextType {
  gems: any[];
  loading: boolean;
  refreshGems: () => Promise<void>;
  addGem: (gem: any) => void;
  removeGem: (gemId: string) => void;
  isGem: (albumId: string) => boolean;
  updateGemStatus: (albumId: string, isGem: boolean) => void;
}

const GemsContext = createContext<GemsContextType | undefined>(undefined);

export const useGems = () => {
  const context = useContext(GemsContext);
  if (!context) {
    throw new Error('useGems must be used within a GemsProvider');
  }
  return context;
};

export const GemsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [gems, setGems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Función para cargar gems
  const loadGems = useCallback(async () => {
    if (!user) {
      setGems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 GemsContext: Loading gems for user:', user.id);
      const gemsData = await UserCollectionService.getUserGems(user.id);
      console.log('✅ GemsContext: Gems loaded:', gemsData?.length || 0, 'gems');
      setGems(gemsData || []);
    } catch (error) {
      console.error('❌ GemsContext: Error loading gems:', error);
      setGems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Función para refrescar gems
  const refreshGems = useCallback(async () => {
    await loadGems();
  }, [loadGems]);

  // Función para añadir gem localmente
  const addGem = useCallback((gem: any) => {
    console.log('➕ GemsContext: Adding gem locally:', gem);
    setGems(prev => {
      const exists = prev.some(g => g.id === gem.id);
      if (exists) {
        console.log('⚠️ GemsContext: Gem already exists, skipping');
        return prev;
      }
      console.log('✅ GemsContext: Adding new gem to state');
      return [gem, ...prev];
    });
  }, []);

  // Función para remover gem localmente
  const removeGem = useCallback((gemId: string) => {
    console.log('➖ GemsContext: Removing gem locally:', gemId);
    setGems(prev => prev.filter(gem => gem.id !== gemId));
  }, []);

  // Función para actualizar el estado de gem (para sincronizar con la colección)
  const updateGemStatus = useCallback((albumId: string, isGem: boolean) => {
    console.log('🔄 GemsContext: Updating gem status for album:', albumId, 'isGem:', isGem);
    
    if (isGem) {
      // Si se añadió como gem, añadirlo a la lista si no existe
      setGems(prev => {
        const exists = prev.some(g => g.album_id === albumId);
        if (!exists) {
          // Buscar el item en la colección (esto se manejará desde SearchScreen)
          console.log('✅ GemsContext: Gem status updated to true for album:', albumId);
        }
        return prev;
      });
    } else {
      // Si se removió como gem, removerlo de la lista
      setGems(prev => {
        const filtered = prev.filter(gem => gem.album_id !== albumId);
        console.log('✅ GemsContext: Gem status updated to false for album:', albumId);
        return filtered;
      });
    }
  }, []);

  // Función para verificar si un álbum es gem
  const isGem = useCallback((albumId: string) => {
    return gems.some(gem => gem.album_id === albumId);
  }, [gems]);

  // Cargar gems cuando cambia el usuario
  useEffect(() => {
    loadGems();
  }, [loadGems]);

  const value: GemsContextType = {
    gems,
    loading,
    refreshGems,
    addGem,
    removeGem,
    isGem,
    updateGemStatus
  };

  return (
    <GemsContext.Provider value={value}>
      {children}
    </GemsContext.Provider>
  );
}; 