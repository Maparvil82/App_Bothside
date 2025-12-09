import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BothsideLoader } from './BothsideLoader';
import { LineChart } from 'react-native-chart-kit';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useStats } from '../contexts/StatsContext';

interface PriceByStyleChartProps {
  onPress?: () => void;
}

const { width } = Dimensions.get('window');

export const PriceByStyleChart: React.FC<PriceByStyleChartProps> = ({ onPress }) => {
  const { stylePriceData, loading } = useStats();
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(1)}K`;
    }
    return `$${price.toFixed(0)}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="trending-up" size={20} color="#000" />
          <Text style={styles.title}>Valor Total por Estilo</Text>
        </View>
        <View style={styles.loadingContainer}>
          <BothsideLoader size="small" fullscreen={false} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      </View>
    );
  }

  if (stylePriceData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="trending-up" size={20} color="#000" />
          <Text style={styles.title}>Valor Total por Estilo</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={24} color="#9CA3AF" />
          <Text style={styles.emptyText}>No hay datos suficientes para mostrar</Text>
        </View>
      </View>
    );
  }

  // Preparar datos para la gráfica
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => mode === 'dark' ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: primaryColor,
    },
  };

  const data = {
    labels: stylePriceData.map(item => item.style.substring(0, 8)),
    datasets: [
      {
        data: stylePriceData.map(item => item.totalValue),
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  return (
    <View style={[styles.container, { shadowColor: primaryColor }]}>
      <View style={styles.header}>
        <Ionicons name="trending-up" size={20} color="#000" />
        <Text style={styles.title}>Valor Total por Estilo</Text>
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          data={data}
          width={width - 32}
          height={180}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withDots={true}
          withShadow={false}
          withInnerLines={false}
          withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={true}
        />
      </View>

      {/* Lista de estilos con valores totales */}
      <View style={styles.stylesList}>
        {stylePriceData.slice(0, 8).map((item, index) => (
          <View key={item.style} style={styles.styleItem}>
            <View style={styles.styleInfo}>
              <Text style={styles.styleName}>{item.style}</Text>
              <Text style={styles.albumCount}>{item.albumCount} álbumes</Text>
            </View>
            <Text style={[styles.averagePrice, { color: primaryColor }]}>
              {formatPrice(item.totalValue)}
            </Text>
          </View>
        ))}
      </View>

      {stylePriceData.length > 8 && (
        <Text style={styles.moreStylesText}>
          +{stylePriceData.length - 8} estilos más
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: AppColors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  stylesList: {
    gap: 8,
  },
  styleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  styleInfo: {
    flex: 1,
  },
  styleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  albumCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  averagePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: AppColors.primary,
  },
  moreStylesText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
}); 