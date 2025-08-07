import { supabase } from '../lib/supabase';

export type CollectorTier = 'Novato' | 'Aficionado' | 'Coleccionista' | 'Curador' | 'Virtuoso' | 'Legendario';

export interface CollectorRank {
  tier: CollectorTier;
  levelIndex: number; // 0..5
  progressToNext: number; // 0..1
  albumLevelIndex: number; // 0..5
  albumProgressToNext: number; // 0..1
  valueLevelIndex: number; // 0..5
  valueProgressToNext: number; // 0..1
  nextTargets?: {
    nextAlbums?: number;
    nextValue?: number;
  };
}

export interface CollectionSummary {
  totalAlbums: number;
  collectionValue: number; // suma de avg_price de album_stats
}

const ALBUM_MILESTONES = [0, 20, 60, 120, 240, 480];
const VALUE_MILESTONES = [0, 800, 2500, 7000, 15000, 30000];
const TIER_TITLES: CollectorTier[] = ['Novato', 'Aficionado', 'Coleccionista', 'Curador', 'Virtuoso', 'Legendario'];

function computeLevelAndProgress(current: number, milestones: number[]) {
  let level = 0;
  for (let i = 0; i < milestones.length; i++) {
    if (current >= milestones[i]) level = i;
  }
  const isMax = level >= milestones.length - 1;
  if (isMax) {
    return { levelIndex: level, progressToNext: 1, nextTarget: undefined };
  }
  const currentBase = milestones[level];
  const nextBase = milestones[level + 1];
  const delta = Math.max(0, Math.min(1, (current - currentBase) / (nextBase - currentBase)));
  return { levelIndex: level, progressToNext: delta, nextTarget: nextBase };
}

export const GamificationService = {
  computeCollectorRank(totalAlbums: number, collectionValue: number): CollectorRank {
    const album = computeLevelAndProgress(totalAlbums, ALBUM_MILESTONES);
    const value = computeLevelAndProgress(collectionValue, VALUE_MILESTONES);

    // Rango global limitado por la dimensión más baja
    const minLevel = Math.min(album.levelIndex, value.levelIndex);

    // Determinar la dimensión limitante (si empatan, la de menor progreso)
    let limiting: 'album' | 'value';
    if (album.levelIndex < value.levelIndex) limiting = 'album';
    else if (value.levelIndex < album.levelIndex) limiting = 'value';
    else limiting = album.progressToNext <= value.progressToNext ? 'album' : 'value';

    const progressToNext = limiting === 'album' ? album.progressToNext : value.progressToNext;

    const nextTargets: { nextAlbums?: number; nextValue?: number } = {};

    const sameLevel = album.levelIndex === value.levelIndex;
    if (sameLevel) {
      if (album.levelIndex < ALBUM_MILESTONES.length - 1) {
        nextTargets.nextAlbums = ALBUM_MILESTONES[album.levelIndex + 1];
      }
      if (value.levelIndex < VALUE_MILESTONES.length - 1) {
        nextTargets.nextValue = VALUE_MILESTONES[value.levelIndex + 1];
      }
    } else {
      if (limiting === 'album' && album.levelIndex < ALBUM_MILESTONES.length - 1) {
        nextTargets.nextAlbums = ALBUM_MILESTONES[album.levelIndex + 1];
      }
      if (limiting === 'value' && value.levelIndex < VALUE_MILESTONES.length - 1) {
        nextTargets.nextValue = VALUE_MILESTONES[value.levelIndex + 1];
      }
    }

    return {
      tier: TIER_TITLES[minLevel],
      levelIndex: minLevel,
      progressToNext,
      albumLevelIndex: album.levelIndex,
      albumProgressToNext: album.progressToNext,
      valueLevelIndex: value.levelIndex,
      valueProgressToNext: value.progressToNext,
      nextTargets: Object.keys(nextTargets).length ? nextTargets : undefined,
    };
  },

  async getUserCollectionSummary(userId: string): Promise<CollectionSummary> {
    // Obtener colección con precios medios para sumar valor
    const { data, error } = await supabase
      .from('user_collection')
      .select(`
        album_id,
        albums (
          album_stats ( avg_price )
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    const totalAlbums = data?.length || 0;
    const collectionValue = (data || []).reduce((sum: number, item: any) => {
      const avg = item?.albums?.album_stats?.avg_price;
      return sum + (typeof avg === 'number' ? avg : 0);
    }, 0);

    return { totalAlbums, collectionValue };
  },

  async getRankForUser(userId: string): Promise<{ summary: CollectionSummary; rank: CollectorRank }> {
    const summary = await this.getUserCollectionSummary(userId);
    const rank = this.computeCollectorRank(summary.totalAlbums, summary.collectionValue);
    return { summary, rank };
  },
}; 