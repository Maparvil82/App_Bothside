import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

interface TopItem {
  [key: string]: string | number;
  count: number;
}

interface TopItemsLineChartProps {
  data: TopItem[];
  title: string;
  keyName: string;
  icon: string;
}

const { width } = Dimensions.get('window');

export const TopItemsLineChart: React.FC<TopItemsLineChartProps> = ({
  data,
  title,
  keyName,
  icon
}) => {
  const { colors } = useTheme();

  if (!data || data.length === 0) {
    return null;
  }

  // Tomar solo los top 5 items
  const top5Data = data.slice(0, 5);

  // Función para truncar labels largos
  const truncateLabel = (label: string, maxLength: number = 10): string => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength) + '...';
  };

  // Asignar colores según el tipo de gráfica con gradientes más vibrantes
  const getChartColor = () => {
    switch (icon) {
      case 'people': // Artistas
        return '#FF6B6B'; // Rojo coral vibrante
      case 'business': // Sellos
        return '#4ECDC4'; // Turquesa
      case 'musical-notes': // Estilos
        return '#A78BFA'; // Púrpura
      case 'calendar': // Décadas
        return '#34D399'; // Verde esmeralda
      default:
        return '#007AFF'; // Azul por defecto
    }
  };

  const getGradientColors = () => {
    switch (icon) {
      case 'people':
        return { from: '#FF6B6B', to: '#FF8E8E' };
      case 'business':
        return { from: '#4ECDC4', to: '#6FE5DC' };
      case 'musical-notes':
        return { from: '#A78BFA', to: '#C4B5FD' };
      case 'calendar':
        return { from: '#34D399', to: '#6EE7B7' };
      default:
        return { from: '#007AFF', to: '#4DA3FF' };
    }
  };

  const chartColor = getChartColor();
  const gradientColors = getGradientColors();

  const chartData = {
    labels: top5Data.map(item => truncateLabel(String(item[keyName]), 8)),
    datasets: [
      {
        data: top5Data.map(item => item.count),
        color: (opacity = 1) => `${chartColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
        strokeWidth: 4,
      },
    ],
  };

  const bgColor = colors.card || '#ffffff';
  const titleColor = '#1F2937';
  const labelTextColor = '#4B5563';

  const chartConfig = {
    backgroundColor: bgColor,
    backgroundGradientFrom: gradientColors.from,
    backgroundGradientTo: gradientColors.to,
    backgroundGradientFromOpacity: 0.05,
    backgroundGradientToOpacity: 0.05,
    decimalPlaces: 0,
    color: (opacity = 1) => `${chartColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    labelColor: (opacity = 1) => {
      return `rgba(75, 85, 99, ${opacity})`;
    },
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '7',
      strokeWidth: '3',
      stroke: chartColor,
      fill: bgColor,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#E5E7EB',
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 12,
      fill: labelTextColor,
      fontWeight: '600',
    },
    propsForVerticalLabels: {
      fontSize: 12,
      fill: labelTextColor,
      fontWeight: '600',
    },
    propsForHorizontalLabels: {
      fontSize: 11,
      fill: labelTextColor,
      fontWeight: '600',
      rotation: -45,
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { borderLeftColor: chartColor }]}>
        <View style={[styles.iconContainer, { backgroundColor: `${chartColor}15` }]}>
          <Ionicons name={icon as any} size={24} color={chartColor} />
        </View>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>{title}</Text>
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={width - 56}
          height={260}
          yAxisLabel=""
          chartConfig={chartConfig}
          bezier={true}
          style={{
            marginVertical: 12,
            borderRadius: 16,
          }}
          withDots={true}
          withShadow={true}
          withScrollableDot={false}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          horizontalLabelRotation={-45}
          verticalLabelRotation={0}
          fromZero={true}
          segments={5}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F3F4F6',
    borderLeftWidth: 4,
    paddingLeft: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
}); 