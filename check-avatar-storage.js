const { createClient } = require('@supabase/supabase-js');

// Reemplaza con tus credenciales de Supabase
const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseKey = 'TU_SUPABASE_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvatarStorage() {
  try {
    console.log('🔍 Verificando configuración de Storage para avatares...');

    // Listar buckets existentes
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error al listar buckets:', bucketsError);
      return;
    }

    console.log('📦 Buckets existentes:', buckets.map(b => b.name));

    // Verificar si existe el bucket 'avatars'
    const avatarsBucket = buckets.find(b => b.name === 'avatars');
    
    if (!avatarsBucket) {
      console.log('⚠️  El bucket "avatars" no existe. Creando...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (createError) {
        console.error('❌ Error al crear bucket:', createError);
        return;
      }

      console.log('✅ Bucket "avatars" creado exitosamente');
    } else {
      console.log('✅ El bucket "avatars" ya existe');
    }

    // Verificar políticas RLS para el bucket
    console.log('🔒 Verificando políticas de acceso...');
    
    // Listar archivos en el bucket (si existe)
    const { data: files, error: filesError } = await supabase.storage
      .from('avatars')
      .list();

    if (filesError) {
      console.log('ℹ️  No hay archivos en el bucket o bucket no existe');
    } else {
      console.log('📁 Archivos en bucket avatars:', files.length);
    }

    console.log('\n📋 Configuración recomendada para el bucket "avatars":');
    console.log('1. Bucket público: true');
    console.log('2. Tipos MIME permitidos: image/jpeg, image/png, image/gif');
    console.log('3. Límite de tamaño: 5MB');
    console.log('4. Política RLS: Permitir lectura pública, escritura solo para usuarios autenticados');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Verificar tabla profiles
async function checkProfilesTable() {
  try {
    console.log('\n🔍 Verificando tabla profiles...');

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error al acceder a tabla profiles:', error);
      console.log('\n📋 Para crear la tabla profiles, ejecuta este SQL en Supabase:');
      console.log(`
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
      `);
    } else {
      console.log('✅ Tabla profiles existe y es accesible');
    }

  } catch (error) {
    console.error('❌ Error al verificar tabla profiles:', error);
  }
}

async function main() {
  console.log('🚀 Iniciando verificación de configuración para avatares...\n');
  
  await checkProfilesTable();
  await checkAvatarStorage();
  
  console.log('\n✅ Verificación completada');
}

main(); 