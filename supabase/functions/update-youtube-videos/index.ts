import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const discogsToken = Deno.env.get("DISCOGS_TOKEN");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: "Configuración del servidor incorrecta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verificar si se proporcionó un álbum específico
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // Si no hay body, procesar todos los álbumes
    }

    const { albumId, discogsId } = body;

    if (albumId && discogsId) {
      // Procesar un álbum específico
      console.log(`Procesando álbum específico: ${albumId} (Discogs ID: ${discogsId})`);
      
      try {
        // Obtener datos del release desde Discogs
        const releaseResponse = await fetch(`https://api.discogs.com/releases/${discogsId}`, {
          headers: {
            "Authorization": `Discogs token=${discogsToken}`,
            "User-Agent": "BothsideApp/1.0"
          }
        });

        if (!releaseResponse.ok) {
          console.error(`Error obteniendo release ${discogsId}:`, releaseResponse.status);
          return new Response(JSON.stringify({ 
            error: `Error obteniendo release: ${releaseResponse.status}` 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const releaseData = await releaseResponse.json();
        const videos = releaseData.videos || [];

        console.log(`Encontrados ${videos.length} videos en el release`);

        if (videos.length > 0) {
          // Filtrar videos de YouTube
          const youtubeVideos = videos.filter((video) => {
            return video && typeof video.uri === 'string' && 
                   (video.uri.includes('youtube.com') || video.uri.includes('youtu.be'));
          });

          console.log(`Encontrados ${youtubeVideos.length} videos de YouTube`);

          if (youtubeVideos.length > 0) {
            // Eliminar videos existentes
            await supabaseAdmin.from("album_youtube_urls")
              .delete()
              .eq("album_id", albumId)
              .eq("imported_from_discogs", true);

            // Insertar nuevos videos
            const urlsToInsert = youtubeVideos.map((video) => ({
              album_id: albumId,
              url: video.uri,
              title: video.title || "",
              is_playlist: false,
              imported_from_discogs: true,
              discogs_video_id: video.id?.toString() || null
            }));

            const { error: insertError } = await supabaseAdmin
              .from("album_youtube_urls")
              .insert(urlsToInsert);

            if (insertError) {
              console.error(`Error insertando videos:`, insertError);
              return new Response(JSON.stringify({ 
                error: `Error insertando videos: ${insertError.message}` 
              }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            } else {
              console.log(`✅ Insertados ${youtubeVideos.length} videos para el álbum`);
              return new Response(JSON.stringify({
                success: true,
                message: `Insertados ${youtubeVideos.length} videos de YouTube`,
                videosCount: youtubeVideos.length
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
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
          error: `Error procesando álbum: ${error.message}` 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } else {
      // Procesar todos los álbumes (comportamiento original)
      const { data: albums, error: albumsError } = await supabaseAdmin
        .from('albums')
        .select('id, discogs_id, title, artist')
        .not('discogs_id', 'is', null);

      if (albumsError) {
        console.error("Error obteniendo álbumes:", albumsError);
        return new Response(JSON.stringify({ error: "Error obteniendo álbumes" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`Procesando ${albums.length} álbumes para actualizar videos de YouTube`);

      let updatedCount = 0;
      let errorCount = 0;

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
            continue;
          }

          const releaseData = await releaseResponse.json();
          const videos = releaseData.videos || [];

          if (videos.length > 0) {
            // Filtrar videos de YouTube
            const youtubeVideos = videos.filter((video) => {
              return video && typeof video.uri === 'string' && 
                     (video.uri.includes('youtube.com') || video.uri.includes('youtu.be'));
            });

            if (youtubeVideos.length > 0) {
              // Eliminar videos existentes
              await supabaseAdmin.from("album_youtube_urls")
                .delete()
                .eq("album_id", album.id)
                .eq("imported_from_discogs", true);

              // Insertar nuevos videos
              const urlsToInsert = youtubeVideos.map((video) => ({
                album_id: album.id,
                url: video.uri,
                title: video.title || "",
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
              } else {
                console.log(`✅ Actualizados ${youtubeVideos.length} videos para ${album.title}`);
                updatedCount++;
              }
            }
          }

          // Esperar un poco entre requests para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error procesando álbum ${album.title}:`, error);
          errorCount++;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Proceso completado. Actualizados: ${updatedCount}, Errores: ${errorCount}`,
        updatedCount,
        errorCount
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (error) {
    console.error("Error en update-youtube-videos:", error);
    return new Response(JSON.stringify({
      error: error.message || "Error interno del servidor"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}); 