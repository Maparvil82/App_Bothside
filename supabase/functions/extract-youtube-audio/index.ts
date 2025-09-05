import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import ytdl from "npm:ytdl-core@4.11.5"

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
    
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    
    // Método 1: ytdl-core (más confiable)
    try {
      console.log('🎵 Probando ytdl-core...')
      
      // Verificar que la URL es válida
      if (!ytdl.validateURL(videoUrl)) {
        throw new Error('URL de YouTube no válida')
      }
      
      // Obtener información del video
      const info = await ytdl.getInfo(videoUrl)
      console.log('🎵 Información del video obtenida:', {
        title: info.videoDetails.title,
        duration: info.videoDetails.lengthSeconds
      })
      
      // Buscar formato de audio
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly')
      console.log('🎵 Formatos de audio disponibles:', audioFormats.length)
      
      if (audioFormats.length > 0) {
        // Seleccionar el mejor formato de audio
        const bestAudio = audioFormats.reduce((prev, current) => {
          const prevBitrate = parseInt(prev.bitrate) || 0
          const currentBitrate = parseInt(current.bitrate) || 0
          return currentBitrate > prevBitrate ? current : prev
        })
        
        console.log('🎵 ✅ ytdl-core exitoso - URL obtenida')
        console.log('🎵 Formato seleccionado:', {
          quality: bestAudio.quality,
          bitrate: bestAudio.bitrate,
          container: bestAudio.container
        })
        
        return bestAudio.url
      } else {
        console.warn('🎵 No se encontraron formatos de audio')
      }
    } catch (error) {
      console.log('🎵 ❌ ytdl-core falló:', error)
    }

    // Método 2: Cobalt API (fallback)
    try {
      console.log('🎵 Probando Cobalt API como fallback...')
      const response = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'BothsideApp/1.0'
        },
        body: JSON.stringify({
          url: videoUrl,
          vCodec: 'h264',
          vQuality: '720',
          aFormat: 'mp3',
          isAudioOnly: true,
          isNoTTWatermark: false,
          dubLang: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('🎵 Respuesta de Cobalt:', data)
        
        if (data.status === 'success' && data.url) {
          console.log('🎵 ✅ Cobalt exitoso - URL obtenida')
          return data.url
        } else if (data.status === 'error') {
          console.warn('🎵 Error de Cobalt:', data.text)
        }
      } else {
        console.warn('🎵 Cobalt HTTP error:', response.status, response.statusText)
      }
    } catch (error) {
      console.log('🎵 ❌ Cobalt falló:', error)
    }

    // Método 3: Loader.to API (fallback)
    try {
      console.log('🎵 Probando Loader.to API como fallback...')
      const response = await fetch('https://loader.to/ajax/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `query=${videoUrl}`
      })

      if (response.ok) {
        const data = await response.json()
        console.log('🎵 Respuesta de Loader.to:', data)
        
        if (data.status === 'success' && data.links && data.links.mp3) {
          const mp3Links = Object.values(data.links.mp3)
          if (mp3Links.length > 0) {
            const audioLink = (mp3Links[0] as any).url
            if (audioLink) {
              console.log('🎵 ✅ Loader.to exitoso')
              return audioLink
            }
          }
        }
      }
    } catch (error) {
      console.log('🎵 ❌ Loader.to falló:', error)
    }

    console.log('🎵 ❌ Todos los métodos fallaron')
    return null
    
  } catch (error) {
    console.error('🎵 ❌ Error general en getAudioUrl:', error)
    return null
  }
} 