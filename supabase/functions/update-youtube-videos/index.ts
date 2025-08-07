import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};

serve(async (req) => {
  // Manejar preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Obtener variables de entorno
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const discogsToken = Deno.env.get("DISCOGS_TOKEN");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing environment variables:", { 
        supabaseUrl: !!supabaseUrl, 
        serviceRoleKey: !!supabaseServiceRoleKey 
      });
      return new Response(JSON.stringify({ 
        error: "Configuración del servidor incorrecta",
        details: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!discogsToken) {
      console.error("Missing DISCOGS_TOKEN environment variable");
      return new Response(JSON.stringify({ 
        error: "Token de Discogs no configurado",
        details: "Missing DISCOGS_TOKEN environment variable"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parsear el body de la request
    let body = {};
    const contentType = req.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      try {
        const rawBody = await req.text();
        if (rawBody.trim()) {
          body = JSON.parse(rawBody);
        }
      } catch (e) {
        console.error("Error parsing JSON body:", e);
        return new Response(JSON.stringify({ 
          error: "Invalid JSON in request body" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const { albumId, discogsId } = body as { albumId?: string; discogsId?: string };

    // Validar parámetros para álbum específico
    if (req.method === "POST" && (!albumId || !discogsId)) {
      return new Response(JSON.stringify({ 
        error: "Parámetros requeridos: albumId y discogsId" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (albumId && discogsId) {
      // Procesar un álbum específico
      console.log(`Procesando álbum específico: ${albumId} (Discogs ID: ${discogsId})`);
      
      try {
        // Verificar que el álbum existe en la base de datos
        const { data: albumExists, error: albumError } = await supabaseAdmin
          .from('albums')
          .select('id, title, artist')
          .eq('id', albumId)
          .single();

        if (albumError || !albumExists) {
          console.error(`Álbum no encontrado: ${albumId}`, albumError);
          return new Response(JSON.stringify({ 
            error: `Álbum no encontrado: ${albumId}` 
          }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Obtener datos del release desde Discogs
        const releaseResponse = await fetch(`https://api.discogs.com/releases/${discogsId}`, {
          headers: {
            "Authorization": `Discogs token=${discogsToken}`,
            "User-Agent": "BothsideApp/1.0"
          }
        });

        if (!releaseResponse.ok) {
          console.error(`Error obteniendo release ${discogsId}:`, releaseResponse.status);
          const errorText = await releaseResponse.text();
          console.error(`Discogs API response:`, errorText);
          
          return new Response(JSON.stringify({ 
            error: `Error obteniendo release: ${releaseResponse.status}`,
            details: errorText
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const releaseData = await releaseResponse.json();
        const videos = releaseData.videos || [];

        console.log(`Encontrados ${videos.length} videos en el release`);

        if (videos.length > 0) {
          // Filtrar videos de YouTube con validación mejorada
          const youtubeVideos = videos.filter((video: any) => {
            if (!video || typeof video.uri !== 'string') {
              return false;
            }
            
            const uri = video.uri.toLowerCase();
            return uri.includes('youtube.com') || uri.includes('youtu.be');
          });

          console.log(`Encontrados ${youtubeVideos.length} videos de YouTube`);

          if (youtubeVideos.length > 0) {
            // Eliminar videos existentes importados desde Discogs
            const { error: deleteError } = await supabaseAdmin
              .from("album_youtube_urls")
              .delete()
              .eq("album_id", albumId)
              .eq("imported_from_discogs", true);

            if (deleteError) {
              console.error("Error eliminando videos existentes:", deleteError);
            }

            // Preparar datos para inserción con validación
            const urlsToInsert = youtubeVideos
              .filter((video: any) => video.uri) // Filtrar videos sin URI
              .map((video: any) => ({
                album_id: albumId,
                url: video.uri,
                title: video.title || `Video para ${albumExists.title}`,
                is_playlist: false,
                imported_from_discogs: true,
                discogs_video_id: video.id?.toString() || null
              }));

            if (urlsToInsert.length === 0) {
              return new Response(JSON.stringify({
                success: true,
                message: "No se encontraron videos válidos para insertar",
                videosCount: 0
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }

            // Insertar nuevos videos
            const { error: insertError } = await supabaseAdmin
              .from("album_youtube_urls")
              .insert(urlsToInsert);

            if (insertError) {
              console.error(`Error insertando videos:`, insertError);
              return new Response(JSON.stringify({ 
                error: `Error insertando videos: ${insertError.message}`,
                details: insertError
              }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }

            console.log(`✅ Insertados ${urlsToInsert.length} videos para el álbum`);
            return new Response(JSON.stringify({
              success: true,
              message: `Insertados ${urlsToInsert.length} videos de YouTube`,
              videosCount: urlsToInsert.length,
              albumTitle: albumExists.title
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          } else {
            return new Response(JSON.stringify({
              success: true,
              message: "No se encontraron videos de YouTube en este release",
              videosCount: 0
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        } else {
          return new Response(JSON.stringify({
            success: true,
            message: "No se encontraron videos en este release",
            videosCount: 0
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

      } catch (error) {
        console.error("Error procesando álbum específico:", error);
        return new Response(JSON.stringify({ 
          error: `Error procesando álbum: ${error.message}`,
          details: error.toString()
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } else {
      // Procesar todos los álbumes (comportamiento original)
      console.log("Procesando todos los álbumes...");
      
      const { data: albums, error: albumsError } = await supabaseAdmin
        .from('albums')
        .select('id, discogs_id, title, artist')
        .not('discogs_id', 'is', null)
        .limit(50); // Limitar para evitar timeouts

      if (albumsError) {
        console.error("Error obteniendo álbumes:", albumsError);
        return new Response(JSON.stringify({ 
          error: "Error obteniendo álbumes",
          details: albumsError
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`Procesando ${albums.length} álbumes para actualizar videos de YouTube`);

      let updatedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const album of albums) {
        try {
          console.log(`Procesando álbum: ${album.title} (Discogs ID: ${album.discogs_id})`);

          // Obtener datos del release desde Discogs
          const releaseResponse = await fetch(`https://api.discogs.com/releases/${album.discogs_id}`, {
            headers: {
              "Authorization": `Discogs token=${discogsToken}`,
              "User-Agent": "BothsideApp/1.0"
            }
          });

          if (!releaseResponse.ok) {
            console.error(`Error obteniendo release ${album.discogs_id}:`, releaseResponse.status);
            errorCount++;
            errors.push(`${album.title}: HTTP ${releaseResponse.status}`);
            continue;
          }

          const releaseData = await releaseResponse.json();
          const videos = releaseData.videos || [];

          if (videos.length > 0) {
            // Filtrar videos de YouTube
            const youtubeVideos = videos.filter((video: any) => {
              if (!video || typeof video.uri !== 'string') {
                return false;
              }
              
              const uri = video.uri.toLowerCase();
              return uri.includes('youtube.com') || uri.includes('youtu.be');
            });

            if (youtubeVideos.length > 0) {
              // Eliminar videos existentes
              await supabaseAdmin.from("album_youtube_urls")
                .delete()
                .eq("album_id", album.id)
                .eq("imported_from_discogs", true);

              // Insertar nuevos videos
              const urlsToInsert = youtubeVideos
                .filter((video: any) => video.uri)
                .map((video: any) => ({
                  album_id: album.id,
                  url: video.uri,
                  title: video.title || `Video para ${album.title}`,
                  is_playlist: false,
                  imported_from_discogs: true,
                  discogs_video_id: video.id?.toString() || null
                }));

              const { error: insertError } = await supabaseAdmin
                .from("album_youtube_urls")
                .insert(urlsToInsert);

              if (insertError) {
                console.error(`Error insertando videos para ${album.title}:`, insertError);
                errorCount++;
                errors.push(`${album.title}: ${insertError.message}`);
              } else {
                console.log(`✅ Actualizados ${youtubeVideos.length} videos para ${album.title}`);
                updatedCount++;
              }
            }
          }

          // Esperar entre requests para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error procesando álbum ${album.title}:`, error);
          errorCount++;
          errors.push(`${album.title}: ${error.message}`);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Proceso completado. Actualizados: ${updatedCount}, Errores: ${errorCount}`,
        updatedCount,
        errorCount,
        errors: errors.slice(0, 10) // Limitar errores en respuesta
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (error) {
    console.error("Error en update-youtube-videos:", error);
    return new Response(JSON.stringify({
      error: error.message || "Error interno del servidor",
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}); 