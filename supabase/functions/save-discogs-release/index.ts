// supabase/functions/save-discogs-release/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Headers CORS básicos
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

console.log("Función 'save-discogs-release' inicializada.");

// Añade interfaces para Genre, Style si las vas a procesar

// --- Función Helper para procesar Tags (Géneros/Estilos) ---
async function processTags(client, tableName, tagNames) {
  const tagIds = [];
  if (!tagNames || tagNames.length === 0) return tagIds;
  
  console.log(`[ProcessTags] Procesando ${tagNames.length} tags para tabla '${tableName}':`, tagNames);
  
  for (const name of tagNames){
    const trimmedName = name.trim();
    if (!trimmedName) continue; // Saltar nombres vacíos
    
    try {
      // Buscar si existe (case-insensitive)
      let { data: existingTag, error: findError } = await client.from(tableName) // Usar nombre de tabla dinámico
        .select('id').ilike('name', trimmedName).maybeSingle();
      
      if (findError) {
        console.warn(`[ProcessTags] Warn buscando tag '${trimmedName}' en '${tableName}':`, findError.message);
        continue;
      }
      
      if (existingTag) {
        tagIds.push(existingTag.id);
      } else {
        // Crear si no existe
        console.log(`[ProcessTags] Tag '${trimmedName}' no encontrado en '${tableName}', creando...`);
        const { data: newTag, error: insertError } = await client.from(tableName).insert({
          name: trimmedName
        }) // Asumiendo columna 'name'
          .select('id').single();
        
        if (insertError || !newTag) {
          console.error(`[ProcessTags] Error creando tag '${trimmedName}' en '${tableName}':`, insertError?.message);
          continue;
        } else {
          console.log(`[ProcessTags] Tag '${trimmedName}' creado en '${tableName}' con ID: ${newTag.id}`);
          tagIds.push(newTag.id);
        }
      }
    } catch (tagError) {
      console.error(`[ProcessTags] Error inesperado procesando tag '${trimmedName}' en '${tableName}':`, tagError);
      // Continuar al siguiente tag
    }
  }
  
  console.log(`[ProcessTags] IDs finales para '${tableName}':`, tagIds);
  return tagIds;
}

// --- Función Principal ---
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  let supabaseAdmin = null;
  
  try {
    // 1. Leer ID de Discogs Y User ID
    if (req.method !== "POST") {
      return new Response(JSON.stringify({
        error: "Método no permitido."
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Validar datos de entrada
    let discogsReleaseId, userId;
    try {
      const body = await req.json();
      discogsReleaseId = body.discogsReleaseId;
      userId = body.userId;
    } catch (e) {
      return new Response(JSON.stringify({
        error: "Datos inválidos en la solicitud."
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    if (!discogsReleaseId || typeof discogsReleaseId !== 'number' || !userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({
        error: "Se requieren 'discogsReleaseId' (numérico) y 'userId' (string)."
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    console.log("Guardando Discogs Release ID:", discogsReleaseId, "para User ID:", userId);

    // 2. Obtener credenciales y crear cliente Supabase Admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    // Obtener credencial de Discogs (token personal)
    const discogsToken = Deno.env.get("DISCOGS_TOKEN") || "YOUR_PERSONAL_ACCESS_TOKEN";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("¡ERROR CRÍTICO! Faltan variables de entorno Supabase.");
      return new Response(JSON.stringify({
        error: "Error de configuración del servidor."
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 3. Obtener Detalles COMPLETOS del lanzamiento desde Discogs API
    const discogsReleaseUrl = `https://api.discogs.com/releases/${discogsReleaseId}`;
    console.log("Obteniendo detalles completos desde:", discogsReleaseUrl);
    
    const releaseResponse = await fetch(discogsReleaseUrl, {
      headers: {
        "Authorization": `Discogs token=${discogsToken}`,
        "User-Agent": "BothsideApp/1.0"
      }
    });

    if (!releaseResponse.ok) {
      const errorText = await releaseResponse.text();
      console.error("Error obteniendo detalles de Discogs:", releaseResponse.status, errorText);
      return new Response(JSON.stringify({
        error: `Error ${releaseResponse.status} al obtener detalles de Discogs.`
      }), {
        status: releaseResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const releaseData = await releaseResponse.json();
    console.log("Detalles completos recibidos.");

    // --- NUEVO: Obtener estadísticas de marketplace de Discogs ---
    console.log("Obteniendo estadísticas de marketplace de Discogs...");
    let discogsStats = null;

    try {
      // Obtener sugerencias de precios por condición
      const priceSuggestionsUrl = `https://api.discogs.com/marketplace/price_suggestions/${discogsReleaseId}`;
      console.log("Obteniendo sugerencias de precios desde:", priceSuggestionsUrl);
      
      const priceResponse = await fetch(priceSuggestionsUrl, {
        headers: {
          "Authorization": `Discogs token=${discogsToken}`,
          "User-Agent": "BothsideApp/1.0"
        }
      });
      
      if (priceResponse.ok) {
        const priceSuggestions = await priceResponse.json();
        console.log("Sugerencias de precios obtenidas:", Object.keys(priceSuggestions));
        
        // Inicializar stats con datos del release
        discogsStats = {
          lowest_price: releaseData.lowest_price,
          highest_price: null,
          avg_price: null,
          have: releaseData.community?.have,
          want: releaseData.community?.want,
          last_sold_date: releaseData.last_sold_date
        };
        
        // Calcular precios desde las sugerencias si están disponibles
        if (priceSuggestions && Object.keys(priceSuggestions).length > 0) {
          const prices = Object.values(priceSuggestions).map(suggestion => suggestion.value);
          if (prices.length > 0) {
            // Calcular precio medio
            discogsStats.avg_price = prices.reduce((sum, price) => sum + price, 0) / prices.length;
            
            // Calcular precio más alto
            discogsStats.highest_price = Math.max(...prices);
            
            // Si no hay lowest_price del release, usar el más bajo de las sugerencias
            if (!discogsStats.lowest_price) {
              discogsStats.lowest_price = Math.min(...prices);
            }
          }
        }
        
        console.log("Estadísticas de Discogs calculadas:", {
          lowest_price: discogsStats.lowest_price,
          highest_price: discogsStats.highest_price,
          avg_price: discogsStats.avg_price,
          have: discogsStats.have,
          want: discogsStats.want
        });
      } else {
        console.warn("No se pudieron obtener sugerencias de precios:", priceResponse.status);
        // Usar solo los datos básicos del release
        discogsStats = {
          lowest_price: releaseData.lowest_price,
          highest_price: null,
          avg_price: null,
          have: releaseData.community?.have,
          want: releaseData.community?.want,
          last_sold_date: releaseData.last_sold_date
        };
      }
    } catch (statsError) {
      console.error("Error obteniendo estadísticas de Discogs:", statsError);
      // Continuar sin estadísticas si falla
      discogsStats = {
        lowest_price: releaseData.lowest_price,
        highest_price: null,
        avg_price: null,
        have: releaseData.community?.have,
        want: releaseData.community?.want,
        last_sold_date: releaseData.last_sold_date
      };
    }
    // --- FIN NUEVO: Estadísticas de Discogs ---

    // --- NUEVO PASO 3.5: Descargar y Subir Portada a Supabase Storage ---
    let supabaseCoverUrl = null;
    const discogsCoverUrl = releaseData.images?.find((img)=>img.type === 'primary')?.resource_url || releaseData.images?.[0]?.resource_url || null;
    
    if (discogsCoverUrl) {
      console.log("Intentando descargar imagen desde:", discogsCoverUrl);
      try {
        // Descargar la imagen desde Discogs
        const imageResponse = await fetch(discogsCoverUrl, {
          headers: {
            "Authorization": `Discogs token=${discogsToken}`,
            "User-Agent": "BothsideApp/1.0"
          } // User-Agent también para imagen
        });
        
        if (!imageResponse.ok) throw new Error(`Fallo al descargar imagen: ${imageResponse.status}`);
        
        const imageBlob = await imageResponse.blob(); // Obtener como Blob
        const contentType = imageResponse.headers.get("content-type") || 'image/jpeg'; // Obtener tipo o usar default
        const fileExtension = contentType.split('/')[1] || 'jpg';
        
        // Crear un nombre de archivo único (ej: covers/album_id_timestamp.jpg)
        // Usaremos el discogsId por ahora, podríamos reemplazarlo por internalAlbumId después si hacemos 2 pasos
        const filePath = `public/${discogsReleaseId}-${Date.now()}.${fileExtension}`;
        console.log(`Subiendo imagen a Supabase Storage en bucket 'covers' como: ${filePath}`);
        
        // Subir el Blob a Supabase Storage (necesita cliente Admin)
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage.from('covers') // ¡Asegúrate que tu bucket se llama 'covers'!
          .upload(filePath, imageBlob, {
            contentType: contentType,
            // cacheControl: '3600', // Opcional
            upsert: true // Sobrescribir si ya existe? Opcional.
          });
        
        if (uploadError) {
          console.error("Error subiendo imagen a Supabase Storage:", uploadError);
          // Decidir si fallar o continuar sin imagen propia
          // throw new Error("Error al guardar la imagen de portada.");
        } else {
          console.log("Imagen subida a Storage:", uploadData.path);
          // Obtener la URL pública de la imagen subida
          const { data: publicUrlData } = supabaseAdmin.storage.from('covers').getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            supabaseCoverUrl = publicUrlData.publicUrl;
            console.log("URL pública de Supabase Storage:", supabaseCoverUrl);
          } else {
            console.warn("No se pudo obtener la URL pública después de subir la imagen.");
          }
        }
      } catch (imgError) {
        console.error("Error procesando la imagen:", imgError);
        // Continuar sin imagen propia si falla la descarga/subida
      }
    } else {
      console.log("No se encontró URL de imagen primaria en Discogs.");
    }
    // --- FIN NUEVO PASO 3.5 ---

    // 4. Procesar y Mapear Datos
    // 4a. Artistas: Buscar/Crear y obtener IDs
    const artistNames = (releaseData.artists || []).map((a)=>a.name.trim()).filter(Boolean); // Nombres de los artistas del lanzamiento
    const artistIds = []; // IDs de nuestra DB
    
    if (artistNames.length > 0) {
      console.log("Procesando artistas:", artistNames);
      for (const name of artistNames){
        // Buscar si existe (case-insensitive)
        let { data: existingArtist, error: findError } = await supabaseAdmin.from('artists') // Nombre de tu tabla de artistas
          .select('id').ilike('name', name).maybeSingle();
        
        if (findError) console.warn(`Error buscando artista ${name}:`, findError.message);
        
        if (existingArtist) {
          artistIds.push(existingArtist.id);
        } else {
          // Crear si no existe
          console.log(`Artista "${name}" no encontrado, creando...`);
          const { data: newArtist, error: insertError } = await supabaseAdmin.from('artists').insert({
            name: name
          }).select('id').single();
          
          if (insertError || !newArtist) {
            console.error(`Error creando artista "${name}":`, insertError?.message);
            // Podríamos decidir fallar aquí o continuar sin este artista
          } else {
            console.log(`Artista "${name}" creado con ID: ${newArtist.id}`);
            artistIds.push(newArtist.id);
          }
        }
      }
    }
    
    console.log("IDs de Artista finales:", artistIds);
    if (artistIds.length === 0) {
      console.warn("No se pudieron procesar artistas para este lanzamiento.");
      // Quizás lanzar un error si un artista es estrictamente necesario?
    }

    // 4b. Géneros y Estilos (IMPLEMENTADO AHORA)
    const genreNames = (releaseData.genres || []).map((g)=>g.trim()).filter(Boolean);
    const styleNames = (releaseData.styles || []).map((s)=>s.trim()).filter(Boolean);
    
    // Llamar a la función helper para obtener los IDs (requiere que las tablas 'genres' y 'styles' existan)
    const genreIds = await processTags(supabaseAdmin, 'genres', genreNames);
    const styleIds = await processTags(supabaseAdmin, 'styles', styleNames);
    
    console.log("IDs Género procesados:", genreIds);
    console.log("IDs Estilo procesados:", styleIds);

    // 4c. Sello Principal
    const labelName = (releaseData.labels || [])[0]?.name?.trim() || null;
    console.log("Sello:", labelName);

    // 4d. Preparar datos para la tabla 'albums'
    // !! Ajusta los nombres de columna a TU esquema de base de datos !!
    // Justo ANTES de definir albumRecord
    console.log("[DEBUG] Valor de releaseData.master_id:", releaseData?.master_id);
    
    const albumRecord = {
      title: releaseData.title?.trim() || 'Sin Título',
      artist: artistNames.length > 0 ? artistNames[0] : null,
      label: labelName,
      catalog_no: (releaseData.labels || [])[0]?.catno?.trim() || null,
      release_year: releaseData.year ? releaseData.year.toString() : null,
      country: releaseData.country || null,
      barcode: (releaseData.identifiers || []).find((id)=>id.type === 'Barcode')?.value || null,
      description: releaseData.notes || null,
      cover_url: supabaseCoverUrl,
      discogs_id: discogsReleaseId,
      user_id: userId,
      master_id: releaseData.master_id ?? null
    };
    
    console.log("Datos preparados para 'albums':", albumRecord);

    // 5. Insertar en Base de Datos
    // 5a. Insertar/Actualizar Álbum (Upsert)
    console.log("Upserting álbum...");
    const { data: savedAlbum, error: albumError } = await supabaseAdmin.from('albums') // Nombre de tu tabla de álbumes
      .upsert(albumRecord, {
        onConflict: 'discogs_id'
      }) // Usa discogs_id para evitar duplicados
      .select('id') // Necesitamos el ID interno del álbum
      .single();
    
    if (albumError || !savedAlbum) {
      console.error("Error guardando álbum:", albumError);
      return new Response(JSON.stringify({
        error: "Error al guardar la información principal del álbum."
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    const internalAlbumId = savedAlbum.id; // Este es el ID de tu tabla 'albums'
    console.log("Álbum guardado/actualizado con ID interno:", internalAlbumId);

    // --- NUEVO: Guardar estadísticas de Discogs ---
    if (discogsStats && (discogsStats.lowest_price || discogsStats.avg_price || discogsStats.have || discogsStats.want)) {
      console.log("Guardando estadísticas de Discogs para álbum ID:", internalAlbumId);
      try {
        const statsData = {
          album_id: internalAlbumId,
          low_price: discogsStats.lowest_price,
          high_price: discogsStats.highest_price,
          avg_price: discogsStats.avg_price,
          have: discogsStats.have,
          want: discogsStats.want,
          last_sold: discogsStats.last_sold_date
        };
        
        // Usar upsert para insertar o actualizar estadísticas
        const { data: savedStats, error: statsError } = await supabaseAdmin.from('album_stats').upsert(statsData, {
          onConflict: 'album_id'
        }).select().single();
        
        if (statsError) {
          console.error("Error guardando estadísticas de Discogs:", statsError);
        } else {
          console.log("Estadísticas de Discogs guardadas exitosamente:", savedStats);
        }
      } catch (statsSaveError) {
        console.error("Error inesperado guardando estadísticas:", statsSaveError);
      }
    } else {
      console.log("No hay estadísticas de Discogs disponibles para guardar");
    }
    // --- FIN NUEVO: Guardar estadísticas ---

    // 5b. Borrar y (Re)Insertar Relaciones (AÑADIR GÉNEROS Y ESTILOS)
    console.log("Gestionando relaciones y tracks...");
    await Promise.all([
      supabaseAdmin.from('album_artists').delete().eq('album_id', internalAlbumId),
      supabaseAdmin.from('album_genres').delete().eq('album_id', internalAlbumId),
      supabaseAdmin.from('album_styles').delete().eq('album_id', internalAlbumId),
      supabaseAdmin.from('tracks').delete().eq('album_id', internalAlbumId)
    ]);
    console.log("Relaciones/Tracks antiguos borrados.");
    
    const insertPromises = [];
    
    // Artistas (sin cambios)
    if (artistIds.length > 0) {
      insertPromises.push(supabaseAdmin.from('album_artists').insert(artistIds.map((id)=>({
        album_id: internalAlbumId,
        artist_id: id
      }))));
    }
    
    // --- NUEVO: Insertar Géneros ---
    if (genreIds.length > 0) {
      console.log(`Insertando ${genreIds.length} relaciones album_genres...`);
      insertPromises.push(supabaseAdmin.from('album_genres').insert(genreIds.map((id)=>({
        album_id: internalAlbumId,
        genre_id: id
      })))); // <-- ¡Verifica nombres de tabla/columna!
    }
    
    // --- NUEVO: Insertar Estilos ---
    if (styleIds.length > 0) {
      console.log(`Insertando ${styleIds.length} relaciones album_styles...`);
      insertPromises.push(supabaseAdmin.from('album_styles').insert(styleIds.map((id)=>({
        album_id: internalAlbumId,
        style_id: id
      })))); // <-- ¡Verifica nombres de tabla/columna!
    }
    
    // Tracks
    const tracksToInsert = (releaseData.tracklist || []).filter((t)=>t.title).map((t)=>({
      album_id: internalAlbumId,
      position: t.position?.trim() || null,
      title: t.title.trim(),
      duration: t.duration?.trim() || null
    }));
    
    if (tracksToInsert.length > 0) {
      insertPromises.push(supabaseAdmin.from('tracks').insert(tracksToInsert));
    }
    
    // Ejecutar inserciones
    if (insertPromises.length > 0) {
      console.log(`Insertando ${insertPromises.length} grupos de relaciones/tracks...`);
      const results = await Promise.all(insertPromises);
      results.forEach((result, index)=>{
        if (result.error) console.error(`Error en inserción ${index} (artistas/géneros/estilos/tracks):`, result.error);
      });
      console.log("Inserciones relacionadas completadas.");
    }

    // NUEVO: Importar videos de YouTube desde Discogs
    try {
      console.log("Procesando videos de YouTube de los datos del release para álbum ID:", internalAlbumId);
      // Los videos ya están en el objeto releaseData, no necesitamos hacer otra petición
      const videos = releaseData.videos || [];
      console.log(`Encontrados ${videos.length} videos en el objeto releaseData`);
      console.log("Muestra de videos:", JSON.stringify(videos.slice(0, 2)));
      
      if (videos.length > 0) {
        // Filtrar solo videos de YouTube
        const youtubeVideos = videos.filter((video)=>{
          return video && typeof video.uri === 'string' && (video.uri.includes('youtube.com') || video.uri.includes('youtu.be'));
        });
        
        console.log(`Se encontraron ${youtubeVideos.length} videos de YouTube válidos`);
        
        if (youtubeVideos.length > 0) {
          // Primero, eliminar todas las URLs de YouTube anteriores para este álbum que fueron importadas desde Discogs
          console.log("Eliminando URLs de YouTube importadas anteriormente...");
          const { error: deleteError } = await supabaseAdmin.from("album_youtube_urls").delete().eq("album_id", internalAlbumId).eq("imported_from_discogs", true);
          
          if (deleteError) {
            console.error("Error al eliminar URLs anteriores:", deleteError);
          }
          
          // Preparar datos para inserción
          const urlsToInsert = youtubeVideos.map((video)=>({
            album_id: internalAlbumId,
            url: video.uri,
            title: video.title || "",
            is_playlist: false,
            imported_from_discogs: true,
            discogs_video_id: video.id?.toString() || null
          }));
          
          console.log(`Insertando ${urlsToInsert.length} URLs de YouTube como batch`);
          
          // Insertar todas las URLs de una vez
          const { data: insertedUrls, error: insertError } = await supabaseAdmin.from("album_youtube_urls").insert(urlsToInsert).select();
          
          if (insertError) {
            console.error("Error al insertar URLs en batch:", insertError);
            // Si falla la inserción en batch, intentar insertar una por una
            console.log("Intentando insertar URLs una por una...");
            let successCount = 0;
            for (const urlData of urlsToInsert){
              try {
                const { error: singleInsertError } = await supabaseAdmin.from("album_youtube_urls").insert([
                  urlData
                ]);
                if (singleInsertError) {
                  console.error(`Error al insertar URL ${urlData.url}:`, singleInsertError.message);
                } else {
                  successCount++;
                }
              } catch (e) {
                console.error("Error inesperado al insertar URL:", e);
              }
            }
            console.log(`Insertadas ${successCount} de ${urlsToInsert.length} URLs individualmente`);
          } else {
            console.log(`Insertadas ${insertedUrls.length} URLs correctamente en batch`);
          }
        }
      }
    } catch (youtubeError) {
      console.error("Error al importar videos de YouTube:", youtubeError);
      // No fallamos toda la operación si las URLs no se pudieron importar
    }

    // *** PASO CRÍTICO: Añadir el álbum a la colección del usuario ***
    console.log(`Añadiendo álbum ID ${internalAlbumId} a la colección del usuario ${userId}`);
    try {
      // Primero verificar si ya existe
      const { data: existingRecord } = await supabaseAdmin.from('user_collection').select('id').eq('user_id', userId).eq('album_id', internalAlbumId).maybeSingle();
      
      if (!existingRecord) {
        // Solo insertar si no existe
        const { error: collectionError } = await supabaseAdmin.from('user_collection').insert({
          user_id: userId,
          album_id: internalAlbumId,
          added_at: new Date().toISOString()
        });
        
        if (collectionError) {
          console.error("Error al añadir álbum a la colección del usuario:", collectionError);
          // OPCIONAL: decidir si esto debería fallar toda la operación
          // throw new Error("Error al añadir el álbum a tu colección.");
        } else {
          console.log("Álbum añadido exitosamente a la colección del usuario");
        }
      } else {
        console.log("El álbum ya existe en la colección del usuario");
      }
    } catch (userCollectionError) {
      console.error("Error inesperado al añadir a user_collection:", userCollectionError);
      // Continuar sin fallar la operación principal
    }

    // 6. Devolver Éxito
    console.log("¡Guardado completado con éxito!");
    return new Response(JSON.stringify({
      success: true,
      albumId: internalAlbumId
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
    
  } catch (error) {
    console.error("Error en save-discogs-release:", error);
    return new Response(JSON.stringify({
      error: error.message || "Error interno del servidor."
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}); 