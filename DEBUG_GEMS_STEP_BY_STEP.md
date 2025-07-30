# 🔍 Debugging de Gems - Paso a Paso

## **❌ Problema:**
Los gems no aparecen cuando se marcan como gem.

## **🔍 Pasos para Debuggear:**

### **Paso 1: Verificar en la App**
```
1. Abrir la app
2. Ir a "Mi Colección"
3. Marcar un disco como gem (swipe → "Añadir a Gems")
4. Ir a "Mis Gems"
5. Verificar si aparece el disco
```

### **Paso 2: Revisar Logs en Metro Console**
Buscar estos logs específicos:

**Al marcar como gem:**
```javascript
🔍 handleToggleGem: Toggling gem for item: { itemId: "...", albumId: "...", albumTitle: "...", currentGemStatus: false }
🔄 handleToggleGem: Updating local UI to: true
📊 handleToggleGem: Collection updated, new count: X
📞 handleToggleGem: Calling UserCollectionService.toggleGemStatus
🔍 UserCollectionService: toggleGemStatus called with: { userId: "...", albumId: "..." }
✅ UserCollectionService: Current gem status: { is_gem: false }
🔄 UserCollectionService: Toggling gem status from false to true
✅ UserCollectionService: Gem status updated successfully: { ... }
✅ handleToggleGem: Service call successful: { ... }
```

**En GemsScreen:**
```javascript
🔌 useSimpleRealtimeGems: Setting up simple realtime subscription for user: "..."
✅ useSimpleRealtimeGems: Successfully subscribed to realtime
🔍 useSimpleRealtimeGems: Loading gems manually for user: "..."
✅ useSimpleRealtimeGems: Gems loaded manually: X gems
```

### **Paso 3: Ejecutar Script de Verificación**
```bash
# 1. Configurar credenciales en test-gems-direct.js
# 2. Ejecutar:
node test-gems-direct.js
```

**Salida esperada:**
```
🔍 Probando funcionalidad de gems directamente...

1️⃣ Verificando estructura de user_collection...
✅ user_collection accesible
📋 Estructura del primer registro: [ 'id', 'user_id', 'album_id', 'added_at', 'is_gem' ]

2️⃣ Buscando usuario con datos...
✅ Usuario encontrado: [user_id]

3️⃣ Verificando datos del usuario...
📊 Total de registros para el usuario: X
💎 Registros con is_gem = true: Y
📋 Registros con is_gem = false: Z
❓ Registros con is_gem = null: W

4️⃣ Probando toggle de gem...
📋 Registro de prueba: { id: "...", user_id: "...", album_id: "...", is_gem: false }
🔄 Cambiando is_gem de false a true
✅ Gem actualizado exitosamente: { id: "...", is_gem: true }

5️⃣ Verificando gems después del cambio...
💎 Gems encontrados después del cambio: Y+1
📋 Primer gem: { id: "...", album_id: "...", is_gem: true }

6️⃣ Revirtiendo cambio...
✅ Gem revertido exitosamente

🎉 Prueba completada
📊 Resumen:
   • Tabla accesible: ✅
   • Usuario encontrado: ✅
   • Datos verificados: ✅
   • Toggle probado: ✅
```

### **Paso 4: Verificar Tiempo Real**
```bash
# 1. Configurar credenciales en check-realtime-status-gems.js
# 2. Ejecutar:
node check-realtime-status-gems.js
```

**Salida esperada:**
```
🔍 Verificando estado del tiempo real para gems...

1️⃣ Verificando acceso a user_collection...
✅ user_collection accesible

2️⃣ Verificando datos de gems...
📊 Gems encontrados: X
📋 Primer gem: { id: "...", user_id: "...", album_id: "...", is_gem: true }

3️⃣ Probando suscripción en tiempo real...
📡 Estado de suscripción: SUBSCRIBED
✅ Suscripción exitosa
🧪 Simulando cambio en tiempo real...
📝 Actualizando registro existente: [record_id]
✅ Registro actualizado: { ... }
🔔 Evento de tiempo real recibido: { eventType: "UPDATE", ... }

⏰ Tiempo de espera completado
📊 Resumen de la prueba:
   • Tabla accesible: ✅
   • Datos de gems: ✅
   • Tiempo real: ✅
🔌 Suscripción limpiada
```

## **🔍 Posibles Problemas y Soluciones:**

### **Problema 1: No se guarda en BD**
**Síntomas:**
- ✅ Logs de `handleToggleGem` aparecen
- ❌ No hay logs de `UserCollectionService`
- ❌ Script de BD falla

**Solución:**
- Verificar credenciales de Supabase
- Verificar RLS policies
- Verificar estructura de tabla

### **Problema 2: Se guarda pero no se lee**
**Síntomas:**
- ✅ Logs de `UserCollectionService` aparecen
- ✅ Script de BD funciona
- ❌ GemsScreen no muestra gems

**Solución:**
- Verificar `getUserGems` function
- Verificar filtros de consulta
- Verificar tiempo real

### **Problema 3: Tiempo real no funciona**
**Síntomas:**
- ✅ Gems se guardan correctamente
- ✅ Gems se leen correctamente
- ❌ No aparecen automáticamente

**Solución:**
- Verificar configuración de Supabase Realtime
- Verificar suscripciones
- Usar fallback manual

### **Problema 4: Problema de UI**
**Síntomas:**
- ✅ Datos correctos en logs
- ✅ BD funciona correctamente
- ❌ UI no se actualiza

**Solución:**
- Verificar estado de React
- Verificar re-renders
- Verificar hooks

## **📱 Comandos de Debugging:**

### **En Metro Console:**
```javascript
// Buscar estos logs específicos:
🔍 handleToggleGem: Toggling gem for item:
✅ UserCollectionService: Gem status updated successfully:
🔌 useSimpleRealtimeGems: Setting up simple realtime subscription
✅ useSimpleRealtimeGems: Successfully subscribed to realtime
🔔 useSimpleRealtimeGems: UPDATE event received:
```

### **Scripts de Verificación:**
```bash
# Probar BD directamente:
node test-gems-direct.js

# Probar tiempo real:
node check-realtime-status-gems.js
```

## **🎯 Estado Actual:**
- ✅ Logging extendido añadido
- ✅ Scripts de verificación creados
- ✅ Hook simplificado implementado
- ⚠️ Pendiente: Probar en dispositivo real

## **📋 Checklist de Debugging:**

- [ ] **Paso 1:** Marcar gem en app y verificar logs
- [ ] **Paso 2:** Ejecutar `test-gems-direct.js`
- [ ] **Paso 3:** Ejecutar `check-realtime-status-gems.js`
- [ ] **Paso 4:** Analizar resultados y identificar problema
- [ ] **Paso 5:** Implementar solución específica

## **🚀 Próximos Pasos:**
1. **Probar en dispositivo** → Marcar gem y revisar logs
2. **Ejecutar scripts** → Verificar BD y tiempo real
3. **Analizar resultados** → Identificar punto exacto del problema
4. **Implementar solución** → Basado en el problema identificado

**¿Puedes probar marcando un gem y compartir los logs que aparecen en Metro console?** 🔍 