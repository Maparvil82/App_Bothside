// Script para probar diferentes modelos de Gemini
import fetch from 'node-fetch';

// API Key directamente desde el archivo de configuración
const API_KEY = 'AIzaSyCUJgdcsQeQAHVSVzNp2CzmhuFRkTi4luU';

// Lista de modelos para probar
const modelsToTest = [
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash-lite',
  'gemini-pro',
  'gemini-pro-vision'
];

async function testModel(modelName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent`;
  
  try {
    console.log(`\n🔍 Probando modelo: ${modelName}`);
    console.log(`URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Hola, ¿puedes responder con un simple 'OK'?"
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10,
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${modelName} - FUNCIONA`);
      console.log(`Respuesta: ${data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta'}`);
      return { model: modelName, status: 'success', url };
    } else {
      const errorText = await response.text();
      console.log(`❌ ${modelName} - ERROR ${response.status}`);
      console.log(`Error: ${errorText}`);
      return { model: modelName, status: 'error', statusCode: response.status, error: errorText };
    }
  } catch (error) {
    console.log(`❌ ${modelName} - EXCEPCIÓN`);
    console.log(`Error: ${error.message}`);
    return { model: modelName, status: 'exception', error: error.message };
  }
}

async function listAvailableModels() {
  try {
    console.log('\n📋 Listando modelos disponibles...');
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models', {
      headers: {
        'x-goog-api-key': API_KEY,
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Modelos disponibles:');
      data.models?.forEach(model => {
        console.log(`- ${model.name} (${model.supportedGenerationMethods?.join(', ') || 'N/A'})`);
      });
    } else {
      console.log(`❌ Error al listar modelos: ${response.status}`);
      const errorText = await response.text();
      console.log(errorText);
    }
  } catch (error) {
    console.log(`❌ Excepción al listar modelos: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de modelos de Gemini...');
  console.log(`API Key configurada: ${API_KEY ? 'Sí' : 'No'}`);
  
  if (!API_KEY) {
    console.log('❌ No hay API Key configurada');
    return;
  }

  // Primero listar modelos disponibles
  await listAvailableModels();

  // Luego probar cada modelo
  const results = [];
  for (const model of modelsToTest) {
    const result = await testModel(model);
    results.push(result);
    
    // Pequeña pausa entre pruebas
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Resumen final
  console.log('\n📊 RESUMEN DE RESULTADOS:');
  console.log('='.repeat(50));
  
  const workingModels = results.filter(r => r.status === 'success');
  const errorModels = results.filter(r => r.status === 'error');
  const exceptionModels = results.filter(r => r.status === 'exception');

  if (workingModels.length > 0) {
    console.log('\n✅ MODELOS QUE FUNCIONAN:');
    workingModels.forEach(result => {
      console.log(`- ${result.model}`);
    });
  }

  if (errorModels.length > 0) {
    console.log('\n❌ MODELOS CON ERROR:');
    errorModels.forEach(result => {
      console.log(`- ${result.model} (${result.statusCode}): ${result.error?.substring(0, 100)}...`);
    });
  }

  if (exceptionModels.length > 0) {
    console.log('\n⚠️ MODELOS CON EXCEPCIÓN:');
    exceptionModels.forEach(result => {
      console.log(`- ${result.model}: ${result.error}`);
    });
  }

  console.log('\n🎯 RECOMENDACIÓN:');
  if (workingModels.length > 0) {
    const recommendedModel = workingModels[0];
    console.log(`Usar el modelo: ${recommendedModel.model}`);
    console.log(`URL: ${recommendedModel.url}`);
  } else {
    console.log('❌ Ningún modelo funcionó. Verifica tu API key y permisos.');
  }
}

// Ejecutar las pruebas
runTests().catch(console.error);
