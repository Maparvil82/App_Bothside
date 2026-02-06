
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            // Debugging: Return 200 instead of 401 to see the error in client
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized: User authentication failed' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')

        if (!serviceRoleKey) {
            console.error('Error: SERVICE_ROLE_KEY is not set')
            // Debugging: Return 200 instead of 500 to see the error in client
            return new Response(JSON.stringify({ success: false, error: 'Server configuration error: Missing Service Role Key' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey ?? ''
        )

        // 1. Delete from dependent tables first (Manual Cascade)
        // We use Promise.allSettled to try deleting from all potential tables
        // even if some don't generate errors (e.g. if row doesn't exist).
        // Using 'user_id' or 'id' depending on the table schema.

        console.log(`Cleaning up data for user ${user.id}...`)

        const cleanupPromises = [
            // Collections & Wishlists
            supabaseAdmin.from('user_collection').delete().eq('user_id', user.id),
            supabaseAdmin.from('user_wishlist').delete().eq('user_id', user.id),

            // Market
            supabaseAdmin.from('listings').delete().eq('user_id', user.id),
            supabaseAdmin.from('orders').delete().or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),

            // Maletas (Bags)
            supabaseAdmin.from('maleta_collaborators').delete().eq('user_id', user.id),
            supabaseAdmin.from('maleta_albums').delete().eq('added_by', user.id),
            supabaseAdmin.from('user_maletas').delete().eq('user_id', user.id),

            // Created Content
            supabaseAdmin.from('albums').delete().eq('user_id', user.id),

            // Profile (Must be last before Auth)
            supabaseAdmin.from('profiles').delete().eq('id', user.id)
        ]

        await Promise.all(cleanupPromises)

        // 2. Delete the user from Auth System
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
            user.id
        )

        if (deleteError) {
            throw deleteError
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Account deleted successfully' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error deleting account:', message)

        // Return 200 with error field so client can read the message
        // (functions.invoke throws on 400/500, hiding the body)
        return new Response(JSON.stringify({ success: false, error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
