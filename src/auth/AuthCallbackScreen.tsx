import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { AppColors } from '../theme/colors';

export default function AuthCallbackScreen() {
    const navigation = useNavigation<any>();

    useEffect(() => {
        // The onAuthStateChange in AuthContext will handle the state update and navigation
        // This screen just serves as a landing page while that happens
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // If we have a session, AuthContext will pick it up. 
                // We can optionally force navigation if needed, but AuthContext usually handles it.
                console.log('AuthCallback: Session found, waiting for context update...');
            } else {
                // If no session, maybe redirect back to login after a timeout?
                // Or handle the error url params
                console.log('AuthCallback: No session found yet');
            }
        };

        checkSession();
    }, []);

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
