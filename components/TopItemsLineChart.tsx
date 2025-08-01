import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

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
  if (!data || data.length === 0) {
    return null;
  }

  // Tomar solo los top 5 items
  const top5Data = data.slice(0, 5);

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
    labels: top5Data.map(item => String(item[keyName])),
    datasets: [
      {
        data: top5Data.map(item => item.count),
        color: (opacity = 1) => `${chartColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `${chartColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: chartColor,
    },
    propsForLabels: {
      fontSize: 10,
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name={icon as any} size={20} color={chartColor} />
        <Text style={styles.title}>{title}</Text>
      </View>
      
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={width}
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
          fromZero={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    margin: 10,
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
    color: '#212529',
    marginLeft: 8,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
}); 