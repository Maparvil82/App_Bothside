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

  // Asignar colores según el tipo de gráfica
  const getChartColor = () => {
    switch (icon) {
      case 'people': // Artistas
        return '#007AFF'; // Azul de la app
      case 'business': // Sellos
        return '#4ECDC4'; // Turquesa
      case 'musical-notes': // Estilos
        return '#45B7D1'; // Azul
      case 'calendar': // Décadas
        return '#96CEB4'; // Verde menta
      default:
        return '#007AFF'; // Azul por defecto
    }
  };

  const chartColor = getChartColor();

  const chartData = {
    labels: top5Data.map(item => truncateLabel(String(item[keyName]), 8)),
    datasets: [
      {
        data: top5Data.map(item => item.count),
        color: (opacity = 1) => `${chartColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
        strokeWidth: 3,
      },
    ],
  };

  const bgColor = colors.card || '#ffffff';
  // Asegurar que el texto sea siempre visible - usar siempre negro para el título
  const titleColor = '#212529'; // Negro oscuro siempre visible
  const isLightBg = bgColor === '#ffffff' || bgColor === '#fff' || !bgColor || (typeof bgColor === 'string' && bgColor.toLowerCase().includes('fff'));
  // Usar siempre negro para los labels para asegurar visibilidad
  const labelTextColor = '#212529';
  
  const chartConfig = {
    backgroundColor: bgColor,
    backgroundGradientFrom: bgColor,
    backgroundGradientTo: bgColor,
    decimalPlaces: 0,
    color: (opacity = 1) => `${chartColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    labelColor: (opacity = 1) => {
      // Siempre usar negro con opacidad para asegurar visibilidad
      return `rgba(33, 37, 41, ${opacity})`; // #212529 con opacidad
    },
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: chartColor,
    },
    propsForLabels: {
      fontSize: 11,
      fill: labelTextColor,
      fontWeight: '500',
    },
    propsForVerticalLabels: {
      fontSize: 11,
      fill: labelTextColor,
      fontWeight: '500',
    },
    propsForHorizontalLabels: {
      fontSize: 10,
      fill: labelTextColor,
      fontWeight: '500',
      rotation: -45,
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <Ionicons name={icon as any} size={20} color={chartColor} />
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>{title}</Text>
      </View>
      
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={width - 56}
          height={250}
          yAxisLabel=""
          chartConfig={chartConfig}
          bezier={true}
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
          withDots={true}
          withShadow={false}
          withScrollableDot={false}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          horizontalLabelRotation={-45}
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
    margin: 0,
    borderRadius: 8,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#212529', // Color fijo para asegurar visibilidad
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
}); 