# 🔧 Guía de Debug - Problemas con Listas

## **Problemas Reportados:**
1. ❌ Las listas no se añaden a "Mis Listas"
2. ❌ No se pueden eliminar las listas existentes

## **Pasos de Diagnóstico:**

### **Paso 1: Verificar Logs en la App**
1. Abre la app y ve a la pantalla "Listas"
2. Toca el botón 🐛 (debug) en la esquina superior derecha
3. Revisa la consola de Metro/Expo para ver:
   ```
   🔍 Debug - Current user: {...}
   🔍 Debug - Current lists: [...]
   🔍 Debug - Loading state: true/false
   ```

### **Paso 2: Probar Crear Lista**
1. Ve a "Crear Lista"
2. Llena el formulario y crea una lista
3. Revisa los logs en la consola:
   ```
   🔍 CreateListScreen: Usuario actual: {...}
   🔍 CreateListScreen: Datos de la lista a crear: {...}
   ✅ CreateListScreen: Lista creada exitosamente: {...}
   🔍 useRealtimeLists: Realtime change: {...}
   ➕ useRealtimeLists: Adding new list: {...}
   ```

### **Paso 3: Probar Eliminar Lista**
1. Ve a "Mis Listas"
2. Toca el botón de eliminar (🗑️) en una lista
3. Confirma la eliminación
4. Revisa los logs:
   ```
   🔍 ListsScreen: Attempting to delete list: {...}
   🗑️ ListsScreen: Calling deleteList service...
   🗑️ UserListService: Deleting list with ID: ...
   ✅ UserListService: List deleted successfully
   ✅ ListsScreen: List deleted successfully
   ```

### **Paso 4: Verificar Configuración de Supabase**

#### **4.1 Habilitar Replicaciones:**
```sql
-- Ejecutar en SQL Editor de Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE user_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE list_albums;
```

#### **4.2 Verificar RLS Policies:**
```sql
-- Verificar que existan estas policies
SELECT * FROM pg_policies WHERE tablename IN ('user_lists', 'list_albums');
```

#### **4.3 Ejecutar Script de Debug:**
```bash
# Reemplazar credenciales en debug-lists.js
node debug-lists.js
```

### **Paso 5: Verificar Autenticación**
Añade temporalmente este código en cualquier pantalla:
```javascript
console.log('🔍 Debug - Usuario autenticado:', user);
console.log('🔍 Debug - Session:', session);
console.log('🔍 Debug - User ID:', user?.id);
```

## **Posibles Causas y Soluciones:**

### **Causa 1: Replicaciones No Habilitadas**
**Síntomas:** Las listas se crean pero no aparecen en tiempo real
**Solución:** Habilitar replicaciones en Supabase

### **Causa 2: RLS Policies Incorrectas**
**Síntomas:** Error 403 al crear/eliminar listas
**Solución:** Verificar y corregir policies

### **Causa 3: Usuario No Autenticado**
**Síntomas:** Error de autenticación
**Solución:** Verificar que el usuario esté logueado

### **Causa 4: Hook No Se Actualiza**
**Síntomas:** Listas no aparecen aunque se creen
**Solución:** Verificar logs del hook useRealtimeLists

## **Comandos de Verificación:**

### **Verificar Estado de la App:**
```javascript
// En ListsScreen, añadir temporalmente:
console.log('🔍 ListsScreen - User:', user?.id);
console.log('🔍 ListsScreen - Lists count:', lists.length);
console.log('🔍 ListsScreen - Loading:', loading);
```

### **Verificar Hook:**
```javascript
// En useRealtimeLists, añadir:
console.log('🔍 Hook - User changed:', user?.id);
console.log('🔍 Hook - Lists updated:', lists.length);
```

### **Verificar Servicios:**
```javascript
// En UserListService, añadir:
console.log('🔍 Service - Operation:', operation);
console.log('🔍 Service - Parameters:', params);
console.log('🔍 Service - Result:', result);
```

## **Logs Esperados:**

### **Creación Exitosa:**
```
🔍 CreateListScreen: Usuario actual: {id: "xxx", email: "xxx"}
🔍 CreateListScreen: Datos de la lista a crear: {title: "xxx", ...}
✅ CreateListScreen: Lista creada exitosamente: {id: "xxx", ...}
🔍 useRealtimeLists: Realtime change: {eventType: "INSERT", ...}
➕ useRealtimeLists: Adding new list: {id: "xxx", ...}
```

### **Eliminación Exitosa:**
```
🔍 ListsScreen: Attempting to delete list: {id: "xxx", ...}
🗑️ ListsScreen: Calling deleteList service...
🗑️ UserListService: Deleting list with ID: xxx
✅ UserListService: List deleted successfully
✅ ListsScreen: List deleted successfully
🔍 useRealtimeLists: Realtime change: {eventType: "DELETE", ...}
🗑️ useRealtimeLists: Deleting list: {id: "xxx", ...}
```

## **Próximos Pasos:**
1. Ejecutar los pasos de diagnóstico
2. Compartir los logs que aparecen
3. Identificar el problema específico
4. Aplicar la solución correspondiente 