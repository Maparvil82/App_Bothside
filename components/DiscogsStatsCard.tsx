import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DiscogsStatsService } from '../services/discogs-stats';
import { useTranslation } from '../src/i18n/useTranslation';

interface DiscogsStatsCardProps {
  album: {
    title?: string;
    album_stats?: {
      avg_price?: number;
      low_price?: number;
      high_price?: number;
      have?: number;
      want?: number;
      last_sold?: string;
    };
  };
}

export const DiscogsStatsCard: React.FC<DiscogsStatsCardProps> = ({ album }) => {
  const { t } = useTranslation();
  // Verificar si hay datos de Discogs
  const stats = album.album_stats;
  const hasDiscogsData = stats && (
    stats.avg_price ||
    stats.have ||
    stats.want ||
    stats.low_price ||
    stats.high_price
  );

  console.log('📊 DiscogsStatsCard - Album:', album.title);
  console.log('📊 DiscogsStatsCard - Stats:', stats);
  console.log('📊 DiscogsStatsCard - Has data:', hasDiscogsData);

  if (!hasDiscogsData) {
    console.log('📊 DiscogsStatsCard - No data, returning null');
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('discogs_stats_title')}</Text>

      {/* Precio medio destacado */}
      {stats?.avg_price && (
        <View style={styles.avgPriceContainer}>
          <Text style={styles.avgPriceLabel}>{t('discogs_stats_avg_price')}</Text>
          <Text style={styles.avgPriceValue}>
            {DiscogsStatsService.formatPrice(stats.avg_price)}
          </Text>
        </View>
      )}

      <View style={styles.statsGrid}>
        {/* Columna izquierda */}
        <View style={styles.column}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t('discogs_stats_have')}</Text>
            <Text style={styles.statValue}>{stats?.have || 0}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t('discogs_stats_want')}</Text>
            <Text style={styles.statValue}>{stats?.want || 0}</Text>
          </View>
        </View>

        {/* Columna derecha */}
        <View style={styles.column}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t('discogs_stats_last_sold')}</Text>
            <Text style={styles.statValue}>
              {DiscogsStatsService.formatLastSoldDate(stats?.last_sold || '')}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t('discogs_stats_low')}</Text>
            <Text style={styles.statValue}>
              {DiscogsStatsService.formatPrice(stats?.low_price || 0)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t('discogs_stats_high')}</Text>
            <Text style={styles.statValue}>
              {DiscogsStatsService.formatPrice(stats?.high_price || 0)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  avgPriceContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  avgPriceLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  avgPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  statLabel: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'right',
  },
}); 