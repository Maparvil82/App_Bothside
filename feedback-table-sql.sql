-- Crear tabla para feedback de usuarios
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_text TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'improvement', 'ui', 'performance', 'other')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_category ON public.user_feedback(category);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at);

-- Habilitar RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver su propio feedback
CREATE POLICY "Users can view their own feedback" ON public.user_feedback
    FOR SELECT USING (auth.uid() = user_id);

-- Política para que los usuarios puedan insertar su propio feedback
CREATE POLICY "Users can insert their own feedback" ON public.user_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios puedan actualizar su propio feedback
CREATE POLICY "Users can update their own feedback" ON public.user_feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para que los usuarios puedan eliminar su propio feedback
CREATE POLICY "Users can delete their own feedback" ON public.user_feedback
    FOR DELETE USING (auth.uid() = user_id);

-- Comentarios en la tabla
COMMENT ON TABLE public.user_feedback IS 'Almacena el feedback de los usuarios sobre la aplicación';
COMMENT ON COLUMN public.user_feedback.feedback_text IS 'Texto del feedback del usuario';
COMMENT ON COLUMN public.user_feedback.category IS 'Categoría del feedback: bug, feature, improvement, ui, performance, other';
COMMENT ON COLUMN public.user_feedback.rating IS 'Calificación del 1 al 5 (opcional)';
