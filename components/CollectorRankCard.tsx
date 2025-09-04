import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GamificationService, CollectorRank } from '../services/gamification';
import { useAuth } from '../contexts/AuthContext';

interface CollectorRankCardProps {
  totalAlbums: number;
  collectionValue: number;
  onPress?: () => void;
  userPosition?: number;
}

const TIER_EMOJI: Record<CollectorRank['tier'], string> = {
  Novato: '🌱',
  Aficionado: '🎧',
  Coleccionista: '💿',
  Experto: '📚',
  Virtuoso: '🏆',
  Legendario: '👑',
};

export const CollectorRankCard: React.FC<CollectorRankCardProps> = ({ totalAlbums, collectionValue, onPress, userPosition }) => {
  const { user } = useAuth();
  const [tierShare, setTierShare] = useState<number | null>(null);

  const rank = GamificationService.computeCollectorRank(totalAlbums, collectionValue);
  const emoji = TIER_EMOJI[rank.tier];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!user?.id) return;
        // Intentar con el ranking persistido del usuario
        const res = await GamificationService.getCurrentUserTierShare(user.id);
        if (res && mounted) {
          setTierShare(res.share);
          return;
        }
        // Fallback: usar el tier calculado en cliente y la distribución global
        const dist = await GamificationService.getTierDistribution();
        const row = dist.find(d => d.tier === rank.tier);
        if (mounted) setTierShare(row && row.total ? row.users / row.total : null);
        // Lanzar upsert en background para futuras lecturas
        GamificationService.upsertUserRanking(user.id).catch(() => {});
      } catch (e) {
        if (mounted) setTierShare(null);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id, rank.tier]);

  const hasNextAlbums = rank.nextTargets?.nextAlbums !== undefined;
  const hasNextValue = rank.nextTargets?.nextValue !== undefined;

  const nextAlbumsMissing = hasNextAlbums
    ? Math.max(0, (rank.nextTargets!.nextAlbums as number) - totalAlbums)
    : 0;
  const nextValueMissing = hasNextValue
    ? Math.max(0, (rank.nextTargets!.nextValue as number) - collectionValue)
    : 0;

  // Calcular el progreso de las barras individuales
  // Si ya se alcanzó el máximo nivel, mostrar 100%
  // Si ya se alcanzó el valor del nivel actual (no hay siguiente objetivo), mostrar 100%
  const albumProgress = rank.albumLevelIndex >= 5 ? 1 : rank.albumProgressToNext;
  const valueProgress = rank.valueLevelIndex >= 5 ? 1 : rank.valueProgressToNext;
  
  // Verificar si ya se alcanzó el valor del nivel actual
  const hasReachedCurrentValueLevel = !hasNextValue && rank.valueLevelIndex < 5;
  const hasReachedCurrentAlbumLevel = !hasNextAlbums && rank.albumLevelIndex < 5;
  
  const finalAlbumProgress = hasReachedCurrentAlbumLevel ? 1 : albumProgress;
  const finalValueProgress = hasReachedCurrentValueLevel ? 1 : valueProgress;

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.ceil(value));
    } catch {
      return Math.ceil(value).toString();
    }
  };

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Rango de Coleccionista</Text>
        <View style={styles.headerIcons}>
          <View style={styles.rankingContainer}>
            {userPosition && (
              <Text style={styles.positionNumber}>#{userPosition}</Text>
            )}
            <Text style={styles.rankingText}>Ranking</Text>
          </View>
          {onPress && (
            <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginLeft: 8 }} />
          )}
        </View>
      </View>

      <View style={styles.rankRow}>
        <Text style={styles.rankEmoji}>{emoji}</Text>
        <Text style={styles.rankText}>{rank.tier}</Text>
      </View>

      <View style={styles.progressGroup}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Álbumes</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${finalAlbumProgress * 100}%` }]} />
          </View>
          <Text style={[styles.progressValue, (rank.albumLevelIndex >= 5 || hasReachedCurrentAlbumLevel) && styles.completedText]}>
            {(rank.albumLevelIndex >= 5 || hasReachedCurrentAlbumLevel) ? '¡Completado!' : `-${nextAlbumsMissing}`}
          </Text>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Valor</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${finalValueProgress * 100}%` }]} />
          </View>
          <Text style={[styles.progressValue, (rank.valueLevelIndex >= 5 || hasReachedCurrentValueLevel) && styles.completedText]}>
            {(rank.valueLevelIndex >= 5 || hasReachedCurrentValueLevel) ? '¡Completado!' : `-${formatCurrency(nextValueMissing)} €`}
          </Text>
        </View>
      </View>

      {(hasNextAlbums || hasNextValue) && (
        <View style={styles.nextRow}>
          <Ionicons name="arrow-up-circle" size={16} color="#0d6efd" />
          {hasNextAlbums && hasNextValue ? (
            <Text style={styles.nextText}>
              Necesitas ambos: {nextAlbumsMissing} álbum(es) y {formatCurrency(nextValueMissing)} €
            </Text>
          ) : hasNextAlbums ? (
            <Text style={styles.nextText}>Te faltan: {nextAlbumsMissing} álbum(es)</Text>
          ) : (
            <Text style={styles.nextText}>Te faltan: {formatCurrency(nextValueMissing)} €</Text>
          )}
        </View>
      )}

      {tierShare !== null && (
        <View style={styles.shareRow}>
          <Ionicons name="people" size={14} color="#6c757d" />
          <Text style={styles.shareText}>
            {new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(tierShare)} de usuarios (del total global) están en este nivel
          </Text>
        </View>
      )}

      {rank.nextTier && (
        <View style={styles.nextTierRow}
        >
          <Ionicons name="star-outline" size={14} color="#6c757d" />
          <Text style={styles.nextTierText}>Siguiente nivel: {rank.nextTier}</Text>
        </View>
      )}
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankingContainer: {
    alignItems: 'center',
    marginRight: 4,
  },
  positionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  rankingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  rankEmoji: {
    fontSize: 24,
  },
  rankText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  shareText: {
    fontSize: 12,
    color: '#6c757d',
  },
  nextTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  nextTierText: {
    fontSize: 12,
    color: '#6c757d',
  },
  progressGroup: {
    gap: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressLabel: {
    width: 80,
    fontSize: 12,
    color: '#6c757d',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0d6efd',
  },
  progressValue: {
    minWidth: 80,
    textAlign: 'right',
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '700',
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  nextText: {
    fontSize: 12,
    color: '#0d6efd',
    fontWeight: '500',
  },
  completedText: {
    color: '#28a745',
    fontWeight: '700',
  },
}); 