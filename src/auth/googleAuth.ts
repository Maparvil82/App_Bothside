import { supabase } from '../../lib/supabase';
import * as Linking from 'expo-linking';

export async function signInWithGoogle() {
    const redirectUrl = Linking.createURL('/auth/callback');
    console.log('Google Auth Redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true // Ensure we control the redirect
        }
    });

    if (error) throw error;

    if (data?.url) {
        console.log('Opening auth URL:', data.url);
        await Linking.openURL(data.url);
    }

    return data;
}
