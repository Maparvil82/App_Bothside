import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/i18n/useTranslation';

interface TopStyle {
  style: string;
  count: number;
}

interface TopStylesChartProps {
  data: TopStyle[];
}

const { width } = Dimensions.get('window');

export const TopStylesChart: React.FC<TopStylesChartProps> = ({ data }) => {
  const { t } = useTranslation();
  if (!data || data.length === 0) {
    return null;
  }

  // Tomar solo los top 5 estilos
  const top5Data = data.slice(0, 5);

  const chartData = {
    labels: top5Data.map(item => item.style),
    datasets: [
      {
        data: top5Data.map(item => item.count),
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    barPercentage: 0.7,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="musical-notes" size={20} color="#000" />
        <Text style={styles.title}>{t('top_styles_title')}</Text>
      </View>

      <View style={styles.chartContainer}>
        <BarChart
          data={chartData}
          width={width - 40}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={chartConfig}
          verticalLabelRotation={0}
          horizontalLabelRotation={45}
          showBarTops={true}
          showValuesOnTopOfBars={true}
          fromZero={true}
          withInnerLines={false}
          withVerticalLabels={true}
          withHorizontalLabels={true}
        />
      </View>

      <View style={styles.legend}>
        {top5Data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: `rgba(0, 122, 255, ${0.8 - index * 0.1})` }]} />
            <Text style={styles.legendText}>
              {item.style} ({item.count})
            </Text>
          </View>
        ))}
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
  legend: {
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
  },
}); 