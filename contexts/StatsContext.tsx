import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface StylePriceData {
  style: string;
  totalValue: number;
  albumCount: number;
}

interface StatsContextType {
  stylePriceData: StylePriceData[];
  loading: boolean;
  refreshStats: () => Promise<void>;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export const useStats = () => {
  const context = useContext(StatsContext);
  if (!context) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
};

export const StatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [stylePriceData, setStylePriceData] = useState<StylePriceData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStylePriceData = useCallback(async () => {
    if (!user) {
      setStylePriceData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('📊 StatsContext: Loading style price data for user:', user.id);

      // Obtener la colección del usuario con estilos y precios
      const { data: collection, error } = await supabase
        .from('user_collection')
        .select(`
          *,
          albums (
            *,
            album_styles (
              styles (*)
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ StatsContext: Error loading collection:', error);
        setStylePriceData([]);
        return;
      }

      // Procesar datos para calcular SUMA TOTAL de precios por estilo
      const stylePriceMap = new Map<string, { totalPrice: number; count: number }>();

      collection?.forEach((item) => {
        const album = item.albums;
        if (!album) return;

        // Obtener estilos del álbum
        const styles = album.album_styles?.map((as: any) => as.styles?.name).filter(Boolean) || [];
        
        // Usar precio estimado o un valor por defecto
        const price = parseFloat(album.estimated_value || '0') || 0;

        // Distribuir el precio entre los estilos del álbum
        if (styles.length > 0) {
          const pricePerStyle = price / styles.length;
          styles.forEach((style: string) => {
            const current = stylePriceMap.get(style) || { totalPrice: 0, count: 0 };
            stylePriceMap.set(style, {
              totalPrice: current.totalPrice + pricePerStyle,
              count: current.count + 1
            });
          });
        }
      });

      // Convertir a array y usar SUMA TOTAL
      const processedData: StylePriceData[] = Array.from(stylePriceMap.entries())
        .map(([style, data]) => ({
          style,
          totalValue: data.totalPrice,
          albumCount: data.count
        }))
        .filter(item => item.totalValue > 0 && item.albumCount > 0)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 12);

      setStylePriceData(processedData);
      console.log('✅ StatsContext: Style price data loaded:', processedData.length, 'styles');

    } catch (error) {
      console.error('❌ StatsContext: Error processing data:', error);
      setStylePriceData([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshStats = useCallback(async () => {
    await loadStylePriceData();
  }, [loadStylePriceData]);

  // Cargar datos cuando cambia el usuario
  useEffect(() => {
    loadStylePriceData();
  }, [loadStylePriceData]);

  const value: StatsContextType = {
    stylePriceData,
    loading,
    refreshStats,
  };

  return (
    <StatsContext.Provider value={value}>
      {children}
    </StatsContext.Provider>
  );
}; 