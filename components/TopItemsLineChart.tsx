import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';
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
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;

  if (!data || data.length === 0) {
    return null;
  }

  // Tomar solo los top 5 items
  const top5Data = data.slice(0, 5);

  // Función para truncar labels largos - Ajustado a 8 caracteres para evitar solapamiento
  const truncateLabel = (label: string, maxLength: number = 8): string => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength) + '..';
  };

  // Asignar colores según el tipo de gráfica
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
        return primaryColor; // Azul por defecto
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
        return { from: primaryColor, to: '#4DA3FF' };
    }
  };

  const chartColor = getChartColor();

  // Configuración para fondo de color sólido
  const bgColor = chartColor;
  const titleColor = '#FFFFFF';
  const labelTextColor = 'rgba(255, 255, 255, 0.9)';
  const gridColor = 'rgba(255, 255, 255, 0.2)';

  const chartData = {
    labels: top5Data.map(item => truncateLabel(String(item[keyName]))),
    datasets: [
      {
        data: top5Data.map(item => item.count),
        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  // Configuración ajustada para fondo de color
  const chartConfig = {
    backgroundColor: chartColor,
    backgroundGradientFrom: chartColor,
    backgroundGradientTo: chartColor,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => labelTextColor,
    style: {
      borderRadius: 16,

    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#FFFFFF',
      fill: chartColor,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: gridColor,
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 10,
      fontWeight: '600',
    },
    fillShadowGradient: '#FFFFFF',
    fillShadowGradientOpacity: 0.3,
  };

  // Calcular ancho disponible: 
  // Pantalla (width)
  // - Margen Dashboard (16 * 2 = 32) 
  // - Padding Container (16 * 2 = 32) 
  // - Margen ChartContainer (10 * 2 = 20)
  // Total a restar: 84
  const chartWidth = width - 84;

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor: bgColor }]}>
      <View style={[styles.header, { borderBottomColor: 'rgba(255, 255, 255, 0.2)' }]}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <Ionicons name={icon as any} size={20} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>{title}</Text>
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={250}
          xLabelsOffset={5}
          yAxisLabel=""
          chartConfig={chartConfig}
          bezier={true}
          style={{
            borderRadius: 16,
            paddingRight: 24,
          }}
          withDots={true}
          withShadow={true}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          horizontalLabelRotation={-30}
          verticalLabelRotation={0}
          fromZero={true}
          segments={4}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    margin: 0,
    borderRadius: 8,
    padding: 16,
    paddingBottom: 24, // Espacio para los dots de paginación
    borderWidth: 1,

    // borderColor se sobreescribe en línea
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    // borderBottomColor se sobreescribe en línea
    // Eliminado borderLeftWidth para estilo más limpio en tarjeta de color
    paddingLeft: 0,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    // color se sobreescribe en línea
    letterSpacing: 0.2,
  },
  chartContainer: {
    alignItems: 'center',
    margin: 10,
  },
}); 