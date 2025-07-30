# Configuración del Sistema de Avatares

## 🎯 Objetivo
Implementar un sistema de avatares de usuario que permita:
- Mostrar avatar circular en el header de las pantallas principales
- Permitir al usuario cambiar su foto de perfil desde la galería
- Almacenar las imágenes en Supabase Storage
- Sincronizar con la tabla `profiles`

## 📋 Configuración Requerida

### 1. Tabla `profiles` en Supabase

Ejecuta este SQL en el editor SQL de Supabase:

```sql
-- Crear tabla profiles si no existe
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  avatar_url TEXT,
  full_name TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Bucket de Storage en Supabase

1. Ve a **Storage** en el dashboard de Supabase
2. Crea un nuevo bucket llamado `avatars`
3. Configuración del bucket:
   - **Público**: ✅ Habilitado
   - **Tipos MIME permitidos**: `image/jpeg`, `image/png`, `image/gif`
   - **Límite de tamaño**: 5MB

### 3. Políticas RLS para Storage

Ejecuta este SQL para configurar las políticas del bucket:

```sql
-- Política para permitir lectura pública de avatares
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Política para permitir subida de avatares solo a usuarios autenticados
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
  );

-- Política para permitir actualización de avatares propios
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política para permitir eliminación de avatares propios
CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

## 🔧 Componentes Implementados

### 1. `UserAvatar` Component
- **Ubicación**: `components/UserAvatar.tsx`
- **Funcionalidad**: 
  - Muestra avatar circular con imagen o iniciales
  - Carga automática del perfil del usuario
  - Soporte para diferentes tamaños
  - Borde opcional

### 2. `CustomHeader` Component
- **Ubicación**: `components/CustomHeader.tsx`
- **Funcionalidad**:
  - Header personalizado con avatar en la esquina derecha
  - Navegación automática al perfil al tocar el avatar
  - Título centrado

### 3. `ProfileService`
- **Ubicación**: `services/database.ts`
- **Funcionalidad**:
  - `getUserProfile()`: Obtener perfil del usuario
  - `updateUserProfile()`: Actualizar datos del perfil
  - `uploadAvatar()`: Subir imagen de avatar a Storage

### 4. Pantalla de Perfil Actualizada
- **Ubicación**: `screens/ProfileScreen.tsx`
- **Funcionalidad**:
  - Avatar grande con botón "Cambiar"
  - Selector de imágenes con `expo-image-picker`
  - Subida automática a Supabase Storage
  - Actualización en tiempo real

## 🎨 Características Visuales

### Avatar en Header
- **Tamaño**: 36px
- **Forma**: Circular
- **Posición**: Esquina derecha del header
- **Borde**: Sin borde (para no competir con el diseño)

### Avatar en Perfil
- **Tamaño**: 100px
- **Forma**: Circular con borde azul
- **Botón**: "Cambiar" superpuesto
- **Funcionalidad**: Toca para cambiar imagen

## 📱 Pantallas con Avatar

### Pantallas Principales (con avatar en header):
- **Colección** (`SearchScreen`)
- **Mis Gems** (`GemsScreen`)
- **Mis Estanterías** (`ListsScreen`)

### Pantallas Secundarias (sin avatar):
- **Perfil** (`ProfileScreen`) - Avatar grande en contenido
- **Crear Lista** (`CreateListScreen`)
- **Ver Lista** (`ViewListScreen`)
- **Administración** (`AdminScreen`)

## 🔄 Flujo de Usuario

1. **Usuario toca avatar en header** → Navega a pantalla de Perfil
2. **Usuario toca "Cambiar" en perfil** → Se abre selector de imágenes
3. **Usuario selecciona imagen** → Se sube a Supabase Storage
4. **Imagen se actualiza** → Avatar se actualiza en toda la app
5. **Usuario navega** → Avatar aparece en header de todas las pantallas principales

## 🛠️ Dependencias Instaladas

```bash
npx expo install expo-image-picker
```

## 🧪 Verificación

Ejecuta el script de verificación:

```bash
node check-avatar-storage.js
```

**Nota**: Actualiza las credenciales de Supabase en el script antes de ejecutarlo.

## 🎯 Próximos Pasos

1. **Configurar Supabase**: Ejecutar SQL para tabla y bucket
2. **Probar en dispositivo**: Verificar permisos de galería
3. **Optimizar imágenes**: Implementar compresión automática
4. **Cache local**: Implementar cache de avatares para mejor rendimiento
5. **Fallback**: Mejorar manejo de errores de carga de imágenes 