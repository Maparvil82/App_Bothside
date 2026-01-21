import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppColors } from '../theme/colors';

export default function AuthCallbackScreen() {
    const navigation = useNavigation<any>();

    const route = useRoute<any>();

    useEffect(() => {
        const handleAuth = async () => {
            // Check for authentication code from deep link
            const { code, error, error_description } = route.params || {};

            if (error) {
                console.error('Auth error from params:', error, error_description);
                // Alert.alert('Error de Autenticación', error_description || 'Ocurrió un error al iniciar sesión.');
                // Maybe navigate back to Login
                navigation.navigate('Login');
                return;
            }

            if (code) {
                console.log('✅ Auth Code received, exchanging for session...');
                const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                if (exchangeError) {
                    console.error('❌ Error exchanging code:', exchangeError);
                    // Alert.alert('Error', 'No se pudo verificar la sesión.');
                    navigation.navigate('Login');
                } else {
                    console.log('✅ Session exchanged successfully:', data.session?.user?.email);
                    // AuthContext listener will pick this up and Redirect
                }
                return;
            }

            // If no code, check if session already exists (maybe we just opened the app normally?)
            // Or maybe implicit flow (hash) which ReactNav handles differently?
            // But for now assume PKCE (code).

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('AuthCallback: Session found, waiting for context update...');
            } else {
                console.log('AuthCallback: No session found yet, validation failed');
                // Only redirect to login if we are sure we failed.
                // navigation.navigate('Login'); 
            }
        };

        handleAuth();
    }, [route.params]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <Text style={styles.text}>Autenticando...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    text: {
        marginTop: 20,
        fontSize: 16,
        color: '#666',
    },
});
