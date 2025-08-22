import { supabase } from '../lib/supabase';

export type CollectorTier = 'Novato' | 'Aficionado' | 'Coleccionista' | 'Experto' | 'Virtuoso' | 'Legendario';

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
  nextTier?: CollectorTier; // added
}

export interface CollectionSummary {
  totalAlbums: number;
  collectionValue: number; // suma de avg_price de album_stats
}

const ALBUM_MILESTONES = [0, 20, 60, 120, 240, 480];
const VALUE_MILESTONES = [0, 800, 2500, 7000, 15000, 30000];
const TIER_TITLES: CollectorTier[] = ['Novato', 'Aficionado', 'Coleccionista', 'Experto', 'Virtuoso', 'Legendario'];

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

    const isMaxTier = minLevel >= TIER_TITLES.length - 1;

    return {
      tier: TIER_TITLES[minLevel],
      levelIndex: minLevel,
      progressToNext,
      albumLevelIndex: album.levelIndex,
      albumProgressToNext: album.progressToNext,
      valueLevelIndex: value.levelIndex,
      valueProgressToNext: value.progressToNext,
      nextTargets: Object.keys(nextTargets).length ? nextTargets : undefined,
      nextTier: isMaxTier ? undefined : TIER_TITLES[minLevel + 1],
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

  async upsertUserRanking(userId: string) {
    const { summary, rank } = await this.getRankForUser(userId);

    const { error } = await supabase
      .from('user_rankings')
      .upsert({
        user_id: userId,
        tier: rank.tier,
        level_index: rank.levelIndex,
        album_level_index: rank.albumLevelIndex,
        value_level_index: rank.valueLevelIndex,
        total_albums: summary.totalAlbums,
        collection_value: summary.collectionValue,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw error;

    return { summary, rank };
  },

  async getUserRanking(userId: string) {
    const { data, error } = await supabase
      .from('user_rankings')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getLeaderboard(limit: number = 20) {
    const { data, error } = await supabase
      .from('user_rankings')
      .select('user_id, tier, level_index, total_albums, collection_value, updated_at')
      .order('level_index', { ascending: false })
      .order('collection_value', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async getTierDistribution() {
    const { data, error } = await supabase.rpc('get_user_rankings_summary');
    if (error) throw error;
    // data: Array<{ tier: string; users: number; total: number }>
    return data as Array<{ tier: string; users: number; total: number }>;
  },

  async getCurrentUserTierShare(userId: string) {
    const current = await this.getUserRanking(userId);
    if (!current?.tier) return null;
    const dist = await this.getTierDistribution();
    const row = dist.find(d => d.tier === current.tier);
    if (!row || !row.total || row.total === 0) return { tier: current.tier as CollectorTier, share: 0 };
    return { tier: current.tier as CollectorTier, share: row.users / row.total };
  },
}; 