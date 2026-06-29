import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
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

    // Get all collection items with album stats (N+1 query optimization)
    const { data: collections, error: collectionError } = await supabase
      .from('user_collection')
      .select(`
        user_id,
        albums (
          album_stats (
            avg_price
          )
        )
      `)

    if (collectionError) {
      console.error('❌ Error fetching collections:', collectionError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch collections' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Found ${collections.length} collection items`)

    // Group collection items by user_id
    const userStats = new Map<string, { totalAlbums: number; collectionValue: number }>()
    for (const item of (collections || []) as any[]) {
      const userId = item.user_id
      const avgPrice = item.albums?.album_stats?.avg_price || 0
      
      const stats = userStats.get(userId) || { totalAlbums: 0, collectionValue: 0 }
      stats.totalAlbums++
      stats.collectionValue += avgPrice
      userStats.set(userId, stats)
    }

    // Map profiles to their calculated stats
    const collectorsWithStats = (profiles as any[])
      .map((profile: any) => {
        const stats = userStats.get(profile.id) || { totalAlbums: 0, collectionValue: 0 }
        
        // Determine rank based on collection value
        let rankTitle = 'Principiante'
        if (stats.collectionValue >= 10000) rankTitle = 'Coleccionista Experto'
        else if (stats.collectionValue >= 5000) rankTitle = 'Coleccionista Avanzado'
        else if (stats.collectionValue >= 1000) rankTitle = 'Coleccionista Intermedio'
        else if (stats.collectionValue >= 100) rankTitle = 'Coleccionista Novato'

        return {
          id: profile.id,
          username: profile.username || 'Usuario',
          full_name: profile.full_name || profile.username || 'Usuario',
          total_albums: stats.totalAlbums,
          collection_value: stats.collectionValue,
          rank_title: rankTitle,
          position: 0,
        }
      })
      .filter((collector: any) => collector.total_albums > 0)

    // Sort by collection value, then by total albums
    const sortedCollectors = collectorsWithStats
      .sort((a: any, b: any) => {
        if (b.collection_value !== a.collection_value) {
          return b.collection_value - a.collection_value
        }
        return b.total_albums - a.total_albums
      })
      .map((collector: any, index: number) => ({
        ...collector,
        position: index + 1,
      }))

    console.log('🏆 Leaderboard final:')
    sortedCollectors.forEach((collector: any, index: number) => {
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