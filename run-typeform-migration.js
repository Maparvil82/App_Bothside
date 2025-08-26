const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan las variables de entorno de Supabase');
  console.log('Asegúrate de tener SUPABASE_URL y SUPABASE_ANON_KEY en tu archivo .env');
  console.log('O EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTypeFormMigration() {
  console.log('🚀 Ejecutando migración para TypeForm...\n');

  try {
    // Crear la tabla album_typeform_responses
    console.log('📋 Creando tabla album_typeform_responses...');
    
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Crear tabla para almacenar las respuestas del TypeForm de los álbumes
        CREATE TABLE IF NOT EXISTS public.album_typeform_responses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          user_collection_id UUID REFERENCES public.user_collection(id) ON DELETE CASCADE NOT NULL,
          question_1 TEXT, -- ¿Cuál es tu canción favorita de este álbum?
          question_2 TEXT, -- ¿En qué momento de tu vida descubriste este disco?
          question_3 TEXT, -- ¿Qué recuerdos te trae este álbum?
          question_4 TEXT, -- ¿Recomendarías este disco a un amigo? ¿Por qué?
          question_5 TEXT, -- ¿Cómo te hace sentir este álbum?
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          -- Asegurar que un usuario solo puede tener una respuesta por álbum
          UNIQUE(user_id, user_collection_id)
        );
      `
    });

    if (createTableError) {
      console.error('❌ Error creando tabla:', createTableError);
      return;
    }

    console.log('✅ Tabla album_typeform_responses creada');

    // Habilitar RLS
    console.log('🔒 Habilitando RLS...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.album_typeform_responses ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError) {
      console.error('❌ Error habilitando RLS:', rlsError);
      return;
    }

    console.log('✅ RLS habilitado');

    // Crear políticas RLS
    console.log('📜 Creando políticas RLS...');
    
    const policies = [
      `CREATE POLICY "Users can view their own typeform responses"
        ON public.album_typeform_responses FOR SELECT
        USING (auth.uid() = user_id);`,
      
      `CREATE POLICY "Users can insert their own typeform responses"
        ON public.album_typeform_responses FOR INSERT
        WITH CHECK (auth.uid() = user_id);`,
      
      `CREATE POLICY "Users can update their own typeform responses"
        ON public.album_typeform_responses FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);`,
      
      `CREATE POLICY "Users can delete their own typeform responses"
        ON public.album_typeform_responses FOR DELETE
        USING (auth.uid() = user_id);`
    ];

    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('exec_sql', { sql: policy });
      if (policyError) {
        console.error('❌ Error creando política:', policyError);
        return;
      }
    }

    console.log('✅ Políticas RLS creadas');

    // Crear trigger para updated_at
    console.log('⚡ Creando trigger para updated_at...');
    
    const triggerSQL = `
      -- Trigger para actualizar updated_at automáticamente
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER update_album_typeform_responses_updated_at
        BEFORE UPDATE ON public.album_typeform_responses
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;

    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: triggerSQL });
    if (triggerError) {
      console.error('❌ Error creando trigger:', triggerError);
      return;
    }

    console.log('✅ Trigger creado');

    // Agregar comentarios
    console.log('💬 Agregando comentarios...');
    
    const commentsSQL = `
      COMMENT ON TABLE public.album_typeform_responses IS 'Almacena las respuestas del TypeForm para cada álbum de la colección del usuario';
      COMMENT ON COLUMN public.album_typeform_responses.question_1 IS '¿Cuál es tu canción favorita de este álbum?';
      COMMENT ON COLUMN public.album_typeform_responses.question_2 IS '¿En qué momento de tu vida descubriste este disco?';
      COMMENT ON COLUMN public.album_typeform_responses.question_3 IS '¿Qué recuerdos te trae este álbum?';
      COMMENT ON COLUMN public.album_typeform_responses.question_4 IS '¿Recomendarías este disco a un amigo? ¿Por qué?';
      COMMENT ON COLUMN public.album_typeform_responses.question_5 IS '¿Cómo te hace sentir este álbum?';
    `;

    const { error: commentsError } = await supabase.rpc('exec_sql', { sql: commentsSQL });
    if (commentsError) {
      console.error('❌ Error agregando comentarios:', commentsError);
      return;
    }

    console.log('✅ Comentarios agregados');

    console.log('\n🎉 ¡Migración completada exitosamente!');
    console.log('📋 La tabla album_typeform_responses está lista para usar');
    console.log('🔒 Las políticas RLS están configuradas correctamente');
    console.log('⚡ El trigger para updated_at está funcionando');

  } catch (error) {
    console.error('❌ Error general durante la migración:', error);
  }
}

runTypeFormMigration(); 