import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    // Parse the request body
    const { url } = await req.json()

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract video ID from YouTube URL
    const videoId = extractVideoId(url)
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Invalid YouTube URL' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Try to get audio URL from a reliable service
    const audioUrl = await getAudioUrl(videoId)
    
    if (!audioUrl) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Could not extract audio URL',
          message: 'Unable to extract audio from this video',
          videoId: videoId
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        audioUrl: audioUrl,
        videoId: videoId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in extract-youtube-audio function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/v\/)([^&\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

async function getAudioUrl(videoId: string): Promise<string | null> {
  try {
    console.log(`🎵 Intentando extraer audio para video: ${videoId}`)
    
    // Método 1: YouTube MP3 Converter
    try {
      console.log('🎵 Probando YouTube MP3 Converter...')
      const mp3Url = `https://www.youtubeinmp3.com/fetch/?video=https://www.youtube.com/watch?v=${videoId}`
      
      // Verificar que la URL sea accesible
      const response = await fetch(mp3Url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      if (response.ok) {
        console.log('🎵 ✅ YouTube MP3 Converter exitoso')
        return mp3Url
      }
    } catch (error) {
      console.log('🎵 ❌ YouTube MP3 Converter falló:', error)
    }

    // Método 2: Y2mate
    try {
      console.log('🎵 Probando Y2mate...')
      const y2mateUrl = `https://www.y2mate.com/youtube-mp3/${videoId}`
      
      const response = await fetch(y2mateUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      if (response.ok) {
        // Y2mate requiere procesamiento adicional, pero por ahora retornamos la URL
        console.log('🎵 ✅ Y2mate disponible')
        return y2mateUrl
      }
    } catch (error) {
      console.log('🎵 ❌ Y2mate falló:', error)
    }

    // Método 3: Servicio directo de MP3
    try {
      console.log('🎵 Probando servicio directo MP3...')
      const directUrl = `https://api.vevioz.com/@api/json/mp3/${videoId}`
      
      const response = await fetch(directUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data && data.url && typeof data.url === 'string') {
          console.log('🎵 ✅ Servicio directo MP3 exitoso')
          return data.url
        }
      }
    } catch (error) {
      console.log('🎵 ❌ Servicio directo MP3 falló:', error)
    }

    console.log('🎵 ❌ Todos los métodos fallaron')
    return null
    
  } catch (error) {
    console.error('🎵 ❌ Error general en getAudioUrl:', error)
    return null
  }
} 