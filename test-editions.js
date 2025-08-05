const { DiscogsService } = require('./services/discogs.ts');

async function testEditions() {
  console.log('🧪 Probando búsqueda de ediciones...');
  
  try {
    // Probar conexión con Discogs
    const connectionTest = await DiscogsService.testConnection();
    console.log('🔗 Conexión con Discogs:', connectionTest ? '✅ OK' : '❌ Falló');
    
    if (!connectionTest) {
      console.log('❌ No se puede conectar a Discogs. Verifica el token.');
      return;
    }
    
    // Probar búsqueda de ediciones
    const searchResult = await DiscogsService.searchReleases('The Beatles Abbey Road', 1);
    
    if (!searchResult) {
      console.log('❌ No se pudo buscar en Discogs');
      return;
    }
    
    console.log(`📀 Encontradas ${searchResult.results?.length || 0} ediciones`);
    
    if (searchResult.results && searchResult.results.length > 0) {
      console.log('📀 Primera edición:', {
        id: searchResult.results[0].id,
        title: searchResult.results[0].title,
        artist: searchResult.results[0].artist,
        year: searchResult.results[0].year,
        country: searchResult.results[0].country,
        format: searchResult.results[0].format
      });
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testEditions().catch(console.error); 