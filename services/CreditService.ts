import { supabase } from '../lib/supabase';

export const CreditService = {
    /**
     * Obtiene los créditos actuales del usuario.
     * Retorna { total, used, remaining } o null si error.
     */
    getUserCredits: async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('ia_credits')
                .select('*')
                .eq('user_id', userId)
                .limit(1);

            if (error) throw error;

            // Handle array result from limit(1)
            const creditData = Array.isArray(data) ? data[0] : data;

            if (!creditData) return { total: 0, used: 0, remaining: 0 };

            return {
                total: creditData.credits_total || 0,
                used: creditData.credits_used || 0,
                remaining: (creditData.credits_total || 0) - (creditData.credits_used || 0)
            };
        } catch (error) {
            console.error('❌ Error getting user credits:', error);
            return null;
        }
    },

    /**
     * Limpia filas duplicadas de créditos para un usuario, manteniendo solo la más reciente.
     */
    cleanupDuplicates: async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('ia_credits')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 1) {
                console.log(`🧹 Found ${data.length} credit rows for user ${userId}. Cleaning up...`);
                // Mantener el primero (el más reciente)
                const toKeep = data[0];
                const toDelete = data.slice(1);
                let deletedCount = 0;

                console.log(`🧹 Attempting to delete ${toDelete.length} duplicate rows...`);

                const deletePromises = toDelete.map(async (row) => {
                    const { data: deleted, error: deleteError } = await supabase
                        .from('ia_credits')
                        .delete()
                        .eq('id', row.id)
                        .select(); // Important: return the deleted row to verify

                    if (deleteError) {
                        console.error(`❌ Error deleting row ${row.id}:`, deleteError.message);
                        return false;
                    }
                    if (!deleted || deleted.length === 0) {
                        console.warn(`⚠️ RLS blocked deletion of row ${row.id} (or row not found)`);
                        return false;
                    }
                    return true;
                });

                const results = await Promise.all(deletePromises);
                deletedCount = results.filter(r => r).length;

                console.log(`✅ Cleaned up ${deletedCount} of ${toDelete.length} duplicates.`);

                // Return true only if we actually verified deletions (or if there were no duplicates to start with, handled above)
                return deletedCount > 0;
            }
            return false;
        } catch (error) {
            console.error('❌ Error cleaning duplicates:', error);
            return false;
        }
    },

    /**
     * Verifica si el usuario tiene suficientes créditos para una operación.
     */
    hasSufficientCredits: async (userId: string, cost: number = 1): Promise<boolean> => {
        const credits = await CreditService.getUserCredits(userId);
        if (!credits) return false;
        return credits.remaining >= cost;
    },

    /**
     * Deduce créditos al usuario.
     * Retorna true si tuvo éxito, false si no (por falta de saldo o error).
     */
    deductCredits: async (userId: string, cost: number = 1): Promise<boolean> => {
        // 1. Verificar saldo actual primero
        const credits = await CreditService.getUserCredits(userId);
        if (!credits || credits.remaining < cost) {
            console.warn('⚠️ No sufficient credits to deduct.');
            return false;
        }

        // 2. Actualizar créditos usados
        // Nota: Idealmente esto sería un RPC o transacción para atomicidad.
        // Por ahora haremos un update simple confiando en la lectura anterior.
        const newUsed = credits.used + cost;

        try {
            const { error } = await supabase
                .from('ia_credits')
                .update({ credits_used: newUsed })
                .eq('user_id', userId);

            if (error) throw error;

            console.log(`✅ Deducted ${cost} credits. New used: ${newUsed}`);
            return true;
        } catch (error) {
            console.error('❌ Error deducting credits:', error);
            return false;
        }
    },

    /**
     * Añade créditos (simulación de compra).
     */
    addCredits: async (userId: string, amount: number): Promise<boolean> => {
        // 1. Obtener registro actual
        const { data: current, error: fetchError } = await supabase
            .from('ia_credits')
            .select('credits_total')
            .eq('user_id', userId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // Ignorar error si no existe fila
            console.error('Error fetching for add:', fetchError);
            return false;
        }

        const currentTotal = current?.credits_total || 0;
        const newTotal = currentTotal + amount;

        try {
            // Upsert para crear o actualizar
            const { error } = await supabase
                .from('ia_credits')
                .upsert({
                    user_id: userId,
                    credits_total: newTotal,
                    // Si es nuevo, credits_used será default (0) si la DB lo tiene, 
                    // o podemos forzarlo a 0 si quisiéramos, pero upsert solo actualiza lo que pasamos si existe.
                    // Mejor asegurar que updated_at se actualice si existe esa columna
                }, { onConflict: 'user_id' });

            if (error) throw error;
            console.log(`✅ Added ${amount} credits. New total: ${newTotal}`);
            return true;
        } catch (error) {
            console.error('❌ Error adding credits:', error);
            return false;
        }
    }
};
