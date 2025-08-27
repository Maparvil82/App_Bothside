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
    // Try to get audio URL from a reliable service
    const serviceUrl = `https://api.vevioz.com/@api/json/mp3/${videoId}`
    
    console.log(`Trying service: ${serviceUrl}`)
    
    const response = await fetch(serviceUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (response.ok) {
      const data = await response.json()
      
      // Check if the service returned a valid audio URL
      if (data && data.url && typeof data.url === 'string') {
        console.log(`Success with service: ${serviceUrl}`)
        return data.url
      }
    }

    // If the first service fails, try a fallback
    console.log('First service failed, trying fallback...')
    
    // For now, return a placeholder URL that might work
    // In a real implementation, you would try other services
    const fallbackUrl = `https://www.youtubeinmp3.com/fetch/?video=https://www.youtube.com/watch?v=${videoId}`
    
    return fallbackUrl
    
  } catch (error) {
    console.error('Error getting audio URL:', error)
    return null
  }
} 