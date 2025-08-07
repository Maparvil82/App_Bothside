/*
  Backfill de rankings de coleccionista para todos los usuarios.
  Requisitos de entorno:
    - SUPABASE_URL
    - SUPABASE_SERVICE_ROLE_KEY (o SERVICE_ROLE_KEY)

  Ejecutar:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-user-rankings.js
*/

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan variables de entorno SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ALBUM_MILESTONES = [0, 20, 60, 120, 240, 480];
const VALUE_MILESTONES = [0, 800, 2500, 7000, 15000, 30000];
const TIER_TITLES = ['Novato', 'Aficionado', 'Coleccionista', 'Curador', 'Virtuoso', 'Legendario'];

function computeLevel(current, milestones) {
  let level = 0;
  for (let i = 0; i < milestones.length; i++) {
    if (current >= milestones[i]) level = i;
  }
  const isMax = level >= milestones.length - 1;
  const nextTarget = isMax ? undefined : milestones[level + 1];
  const base = milestones[level];
  const progress = isMax ? 1 : Math.max(0, Math.min(1, (current - base) / (nextTarget - base)));
  return { level, progress, nextTarget };
}

function computeRank(totalAlbums, collectionValue) {
  const album = computeLevel(totalAlbums, ALBUM_MILESTONES);
  const value = computeLevel(collectionValue, VALUE_MILESTONES);
  const minLevel = Math.min(album.level, value.level);
  const tier = TIER_TITLES[minLevel];
  return {
    tier,
    levelIndex: minLevel,
    albumLevelIndex: album.level,
    valueLevelIndex: value.level,
  };
}

async function getAllUserIds() {
  // Preferimos perfiles, pero si falla, tomamos de user_collection
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id');

  if (!profilesError && Array.isArray(profiles)) {
    return profiles.map((p) => p.id);
  }

  console.warn('No se pudo leer perfiles, usando user_collection (ids distintos)');
  const { data: uc, error: ucError } = await supabase
    .from('user_collection')
    .select('user_id');

  if (ucError || !uc) throw ucError || new Error('No se pudo obtener usuarios');
  return Array.from(new Set(uc.map((r) => r.user_id)));
}

async function getSummaryForUser(userId) {
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
  const collectionValue = (data || []).reduce((sum, item) => {
    const avg = item?.albums?.album_stats?.avg_price;
    return sum + (typeof avg === 'number' ? avg : 0);
  }, 0);

  return { totalAlbums, collectionValue };
}

async function upsertRanking(userId, summary, rank) {
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
}

async function run() {
  const userIds = await getAllUserIds();
  console.log(`Encontrados ${userIds.length} usuarios. Procesando...`);

  let processed = 0;
  for (const userId of userIds) {
    try {
      const summary = await getSummaryForUser(userId);
      const rank = computeRank(summary.totalAlbums, summary.collectionValue);
      await upsertRanking(userId, summary, rank);
      processed += 1;
      if (processed % 25 === 0) {
        console.log(`Actualizados ${processed}/${userIds.length}`);
      }
    } catch (e) {
      console.warn(`Error procesando usuario ${userId}:`, e.message || e);
    }
  }

  console.log(`Backfill completado. Usuarios actualizados: ${processed}/${userIds.length}`);
}

run().catch((e) => {
  console.error('Backfill falló:', e);
  process.exit(1);
}); 