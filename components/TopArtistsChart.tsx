import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/i18n/useTranslation';

interface TopArtist {
  artist: string;
  count: number;
}

interface TopArtistsChartProps {
  data: TopArtist[];
}

const { width } = Dimensions.get('window');

export const TopArtistsChart: React.FC<TopArtistsChartProps> = ({ data }) => {
  const { t } = useTranslation();
  if (!data || data.length === 0) {
    return null;
  }

  // Tomar solo los top 5 artistas
  const top5Data = data.slice(0, 5);

  const chartData = {
    labels: top5Data.map(item => item.artist),
    datasets: [
      {
        data: top5Data.map(item => item.count),
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 3,
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
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#007AFF',
    },
    propsForLabels: {
      fontSize: 10,
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="people" size={20} color="#007AFF" />
        <Text style={styles.title}>{t('top_artists_title')}</Text>
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

      <View style={styles.legend}>
        {top5Data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: `rgba(0, 122, 255, ${0.8 - index * 0.1})` }]} />
            <Text style={styles.legendText}>
              {item.artist} ({t('top_artists_albums_count').replace('{0}', item.count.toString())})
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