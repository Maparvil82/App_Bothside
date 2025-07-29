# 🔧 Solución de Problemas - Tiempo Real

## **Problemas Identificados:**

### **1. Navegación Confusa**
- ✅ **Solución:** Añadido logging detallado en todas las navegaciones
- ✅ **Mejorado:** Opciones más claras en CreateListScreen (Ver Lista, Volver a Listas, Crear Otra)

### **2. Datos No Se Guardan**
- ✅ **Solución:** Hooks en tiempo real con logging detallado
- ✅ **Verificación:** Logs en consola para rastrear el flujo de datos

### **3. Suscripciones No Funcionan**
- ⚠️ **Posible causa:** Replicaciones no habilitadas en Supabase

## **Pasos para Verificar:**

### **1. Habilitar Replicaciones en Supabase:**
```sql
-- Ejecutar en SQL Editor de Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE user_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE list_albums;
```

### **2. Verificar en Dashboard:**
1. Ve a **Database → Replication**
2. Asegúrate de que `user_lists` y `list_albums` estén habilitadas

### **3. Probar con el Script:**
```bash
# Reemplaza las credenciales en check-realtime-setup.js
node check-realtime-setup.js
```

## **Logs a Revisar:**

### **Al Crear Lista:**
```
🔍 CreateListScreen: Usuario actual: [user_id]
🔍 CreateListScreen: Datos de la lista a crear: {...}
✅ CreateListScreen: Lista creada exitosamente: {...}
🔍 useRealtimeLists: Realtime change: {...}
➕ useRealtimeLists: Adding new list: {...}
```

### **Al Añadir Álbum:**
```
🔍 ViewListScreen: Navigating to AddAlbumToList with: {...}
🔍 useRealtimeListAlbums: Realtime change: {...}
➕ useRealtimeListAlbums: Adding new album to list
✅ useRealtimeListAlbums: Album data fetched: {...}
```

## **Comandos de Debug:**

### **Verificar Estado de Suscripciones:**
```javascript
// En cualquier pantalla, añadir temporalmente:
console.log('🔍 Debug - Usuario autenticado:', user);
console.log('🔍 Debug - Session:', session);
```

### **Forzar Recarga:**
```javascript
// En ListsScreen, añadir botón temporal:
<TouchableOpacity onPress={() => {
  console.log('🔄 Forzando recarga...');
  // El hook se encarga automáticamente
}}>
  <Text>🔄 Recargar</Text>
</TouchableOpacity>
```

## **Solución de Problemas Comunes:**

### **Problema: Lista no aparece después de crear**
**Solución:**
1. Verificar logs de `useRealtimeLists`
2. Comprobar que las replicaciones estén habilitadas
3. Verificar que el usuario esté autenticado

### **Problema: Álbumes no se añaden en tiempo real**
**Solución:**
1. Verificar logs de `useRealtimeListAlbums`
2. Comprobar que `list_albums` esté en replicaciones
3. Verificar RLS policies

### **Problema: Navegación no funciona**
**Solución:**
1. Verificar que las rutas estén definidas en `AppNavigator`
2. Comprobar que los parámetros se pasen correctamente
3. Revisar logs de navegación

## **Estado Actual:**
- ✅ Hooks en tiempo real implementados
- ✅ Logging detallado añadido
- ✅ Navegación mejorada
- ⚠️ Pendiente: Verificar replicaciones en Supabase 