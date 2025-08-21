import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🏆 Fetching leaderboard data...')

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .not('username', 'is', null)

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`👥 Found ${profiles.length} profiles`)

    // Get collection data for each user
    const collectorsWithStats = await Promise.all(
      profiles.map(async (profile) => {
        try {
          console.log(`🔍 Processing user: ${profile.username} (ID: ${profile.id})`)
          
          const { data: collection, error: collectionError } = await supabase
            .from('user_collection')
            .select(`
              album_id,
              albums (
                title,
                artist,
                album_stats (
                  avg_price
                )
              )
            `)
            .eq('user_id', profile.id)

          if (collectionError) {
            console.error(`❌ Error fetching collection for ${profile.username}:`, collectionError)
            return {
              id: profile.id,
              username: profile.username || 'Usuario',
              full_name: profile.full_name || profile.username || 'Usuario',
              total_albums: 0,
              collection_value: 0,
              rank_title: 'Principiante',
              position: 0,
            }
          }

          const totalAlbums = collection?.length || 0
          const collectionValue = collection?.reduce((sum, item) => {
            const albumStats = item.albums?.album_stats
            const avgPrice = albumStats?.avg_price || 0
            return sum + avgPrice
          }, 0) || 0

          console.log(`📊 ${profile.username}: ${totalAlbums} albums, €${collectionValue.toFixed(2)}`)

          // Determine rank based on collection value
          let rankTitle = 'Principiante'
          if (collectionValue >= 10000) rankTitle = 'Coleccionista Experto'
          else if (collectionValue >= 5000) rankTitle = 'Coleccionista Avanzado'
          else if (collectionValue >= 1000) rankTitle = 'Coleccionista Intermedio'
          else if (collectionValue >= 100) rankTitle = 'Coleccionista Novato'

          return {
            id: profile.id,
            username: profile.username || 'Usuario',
            full_name: profile.full_name || profile.username || 'Usuario',
            total_albums: totalAlbums,
            collection_value: collectionValue,
            rank_title: rankTitle,
            position: 0, // Will be set after sorting
          }
        } catch (error) {
          console.error(`❌ Error processing user ${profile.username}:`, error)
          return {
            id: profile.id,
            username: profile.username || 'Usuario',
            full_name: profile.full_name || profile.username || 'Usuario',
            total_albums: 0,
            collection_value: 0,
            rank_title: 'Principiante',
            position: 0,
          }
        }
      })
    )

    // Sort by collection value, then by total albums
    const sortedCollectors = collectorsWithStats
      .sort((a, b) => {
        if (b.collection_value !== a.collection_value) {
          return b.collection_value - a.collection_value
        }
        return b.total_albums - a.total_albums
      })
      .map((collector, index) => ({
        ...collector,
        position: index + 1,
      }))

    console.log('🏆 Leaderboard final:')
    sortedCollectors.forEach((collector, index) => {
      console.log(`${index + 1}. ${collector.username}: ${collector.total_albums} albums, €${collector.collection_value.toFixed(2)}`)
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: sortedCollectors,
        total_users: sortedCollectors.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 