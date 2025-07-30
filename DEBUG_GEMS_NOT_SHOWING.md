# 🔍 Debuggear Gems No Se Muestran

## **Problema Identificado:**
❌ Los discos no se muestran en "Mis Gems" aunque se marquen como gems
❌ Falta de logging para identificar dónde está el problema
❌ Posible problema en la referencia de album_id en GemsScreen

## **Solución Implementada:**

### **1. Corregir Referencia en GemsScreen**
- ✅ **Antes:** `item.album_id` (incorrecto)
- ✅ **Ahora:** `item.albums.id` (correcto)
- ✅ **Ubicación:** `screens/GemsScreen.tsx` función `handleRemoveGem`

### **2. Añadir Logging Detallado**
- ✅ **GemsScreen:** Logging en `loadGems` y `handleRemoveGem`
- ✅ **Database Service:** Logging extendido en `getUserGems`
- ✅ **Verificación de datos:** Contadores de registros por estado

### **3. Script de Verificación**
- ✅ **check-gems-in-database.js:** Script para verificar gems en BD
- ✅ **Análisis completo:** Verifica estructura, datos y usuarios

## **Código Clave:**

### **GemsScreen.tsx - loadGems con Logging:**
```typescript
const loadGems = async () => {
  if (!user) return;
  
  try {
    setLoading(true);
    console.log('🔍 GemsScreen: Loading gems for user:', user.id);
    const gemsData = await UserCollectionService.getUserGems(user.id);
    console.log('✅ GemsScreen: Gems loaded:', gemsData?.length || 0, 'gems');
    console.log('📋 GemsScreen: First gem:', gemsData?.[0]);
    setGems(gemsData || []);
  } catch (error) {
    console.error('❌ GemsScreen: Error loading gems:', error);
    Alert.alert('Error', 'No se pudieron cargar tus Gems');
  } finally {
    setLoading(false);
  }
};
```

### **GemsScreen.tsx - handleRemoveGem Corregido:**
```typescript
const handleRemoveGem = async (item: any) => {
  if (!user) return;
  
  try {
    console.log('🔍 GemsScreen: Removing gem for item:', {
      itemId: item.id,
      albumId: item.albums?.id,  // ✅ CORREGIDO: item.albums.id
      albumTitle: item.albums?.title
    });
    
    await UserCollectionService.toggleGemStatus(user.id, item.albums.id);
    
    // Actualizar la lista local
    await loadGems();
    
    Alert.alert(
      'Gem Removido',
      `"${item.albums?.title}" removido de tus Gems`
    );
  } catch (error) {
    console.error('❌ GemsScreen: Error removing gem:', error);
    Alert.alert('Error', 'No se pudo remover el Gem');
  }
};
```

### **Database Service - getUserGems con Logging Extendido:**
```typescript
async getUserGems(userId: string) {
  console.log('🔍 UserCollectionService: getUserGems called for user:', userId);
  
  // Primero verificar si hay registros para este usuario
  const { data: userRecords, error: userError } = await supabase
    .from('user_collection')
    .select('*')
    .eq('user_id', userId);
  
  if (userError) {
    console.error('❌ UserCollectionService: Error getting user records:', userError);
    throw userError;
  }
  
  console.log('📊 UserCollectionService: Total records for user:', userRecords?.length || 0);
  
  // Verificar cuántos tienen is_gem = true
  const gemsCount = userRecords?.filter(record => record.is_gem === true).length || 0;
  console.log('💎 UserCollectionService: Records with is_gem = true:', gemsCount);
  
  // Verificar cuántos tienen is_gem = false
  const nonGemsCount = userRecords?.filter(record => record.is_gem === false).length || 0;
  console.log('📋 UserCollectionService: Records with is_gem = false:', nonGemsCount);
  
  // Verificar cuántos tienen is_gem = null
  const nullGemsCount = userRecords?.filter(record => record.is_gem === null).length || 0;
  console.log('❓ UserCollectionService: Records with is_gem = null:', nullGemsCount);
  
  const { data, error } = await supabase
    .from('user_collection')
    .select(`
      *,
      albums (
        *,
        album_styles (
          styles (*)
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_gem', true)
    .order('added_at', { ascending: false });
  
  if (error) {
    console.error('❌ UserCollectionService: Error getting user gems:', error);
    throw error;
  }
  
  console.log('✅ UserCollectionService: Found', data?.length || 0, 'gems for user');
  if (data && data.length > 0) {
    console.log('📋 UserCollectionService: First gem:', {
      id: data[0].id,
      albumId: data[0].album_id,
      albumTitle: data[0].albums?.title,
      isGem: data[0].is_gem
    });
  }
  return data;
}
```

## **Pasos para Debuggear:**

### **1. Verificar en la App:**
```
1. Abrir la app y ir a "Mi Colección"
2. Marcar un disco como gem (swipe → "Añadir a Gems")
3. Ir a "Mis Gems" y verificar si aparece
4. Revisar los logs en Metro console
```

### **2. Logs a Buscar:**
```javascript
// Al marcar como gem:
🔍 handleToggleGem: Toggling gem for item: { itemId: "...", albumId: "...", currentGemStatus: false }
🔍 UserCollectionService: toggleGemStatus called with: { userId: "...", albumId: "..." }
✅ UserCollectionService: Current gem status: { is_gem: false }
🔄 UserCollectionService: Toggling gem status from false to true
✅ UserCollectionService: Gem status updated successfully: { ... }

// Al abrir Mis Gems:
🔍 GemsScreen: Loading gems for user: "..."
🔍 UserCollectionService: getUserGems called for user: "..."
📊 UserCollectionService: Total records for user: X
💎 UserCollectionService: Records with is_gem = true: Y
📋 UserCollectionService: Records with is_gem = false: Z
❓ UserCollectionService: Records with is_gem = null: W
✅ UserCollectionService: Found Y gems for user
✅ GemsScreen: Gems loaded: Y gems
```

### **3. Script de Verificación:**
```bash
# Configurar credenciales en check-gems-in-database.js
# Ejecutar:
node check-gems-in-database.js
```

## **Posibles Problemas:**

### **1. Problema de Referencia:**
- ❌ `item.album_id` en lugar de `item.albums.id`
- ✅ **Solución:** Ya corregido en ambos archivos

### **2. Problema de Datos:**
- ❌ Registros con `is_gem = null`
- ✅ **Solución:** Script de verificación identifica estos casos

### **3. Problema de RLS:**
- ❌ Usuario no puede leer sus propios gems
- ✅ **Solución:** Verificar políticas de RLS

### **4. Problema de Autenticación:**
- ❌ Usuario no autenticado correctamente
- ✅ **Solución:** Verificar `user.id` en logs

### **5. Problema de Red:**
- ❌ Error de conexión a Supabase
- ✅ **Solución:** Verificar logs de error

## **Estado Actual:**
- ✅ Referencias corregidas en GemsScreen
- ✅ Logging detallado añadido
- ✅ Script de verificación creado
- ✅ Debugging completo implementado
- ⚠️ Pendiente: Probar en dispositivo real

## **Próximos Pasos:**
1. **Probar en dispositivo** → Marcar gem y verificar logs
2. **Ejecutar script** → Verificar datos en BD
3. **Analizar logs** → Identificar punto exacto del problema
4. **Ajustar según resultados** → Implementar solución específica

## **Comandos de Debugging:**

### **En Metro Console:**
```javascript
// Buscar estos logs:
🔍 handleToggleGem: Toggling gem for item:
🔍 UserCollectionService: toggleGemStatus called with:
✅ UserCollectionService: Gem status updated successfully:
🔍 GemsScreen: Loading gems for user:
💎 UserCollectionService: Records with is_gem = true:
✅ GemsScreen: Gems loaded:
```

### **Script de Verificación:**
```bash
node check-gems-in-database.js
```

## **Ventajas de la Solución:**
- ✅ **Logging completo:** Para identificar el problema exacto
- ✅ **Referencias corregidas:** `item.albums.id` en lugar de `item.album_id`
- ✅ **Script de verificación:** Para analizar datos en BD
- ✅ **Debugging sistemático:** Pasos claros para resolver
- ✅ **Manejo de errores:** Mejor feedback al usuario 