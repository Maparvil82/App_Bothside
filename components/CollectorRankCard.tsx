import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GamificationService, CollectorRank } from '../services/gamification';
import { useAuth } from '../contexts/AuthContext';

interface CollectorRankCardProps {
  totalAlbums: number;
  collectionValue: number;
}

const TIER_EMOJI: Record<CollectorRank['tier'], string> = {
  Novato: '🌱',
  Aficionado: '🎧',
  Coleccionista: '💿',
  Curador: '📚',
  Virtuoso: '🏆',
  Legendario: '👑',
};

export const CollectorRankCard: React.FC<CollectorRankCardProps> = ({ totalAlbums, collectionValue }) => {
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

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.ceil(value));
    } catch {
      return Math.ceil(value).toString();
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Rango de Coleccionista</Text>
        <Ionicons name="trophy" size={20} color="#FFD700" />
      </View>

      <View style={styles.rankRow}>
        <Text style={styles.rankEmoji}>{emoji}</Text>
        <Text style={styles.rankText}>{rank.tier}</Text>
      </View>

      <View style={styles.progressGroup}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Álbumes</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${rank.albumProgressToNext * 100}%` }]} />
          </View>
          <Text style={styles.progressValue}>-{nextAlbumsMissing}</Text>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Valor</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${rank.valueProgressToNext * 100}%` }]} />
          </View>
          <Text style={styles.progressValue}>-{formatCurrency(nextValueMissing)} €</Text>
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
    </View>
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
}); 