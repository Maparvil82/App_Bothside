import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, StatusBar, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { useTranslation } from '../src/i18n/useTranslation';

const { width, height } = Dimensions.get('window');

export const OfflineNotice = () => {
    const [isConnected, setIsConnected] = useState<boolean | null>(true);
    const { t } = useTranslation();

    useEffect(() => {
        // Suscribirse a cambios en la conexión
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    if (isConnected !== false) {
        return null;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.content}>

                <Text style={styles.title}>{t('offline_title')}</Text>
                <Text style={styles.message}>
                    {t('offline_message')}
                </Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => NetInfo.refresh()}
                >
                    <Text style={styles.buttonText}>{t('offline_retry')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000000', // Fondo negro total para tapar la app
        zIndex: 99999, // Asegurar que esté por encima de todo
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        padding: 30,
        width: '100%',
    },
    iconContainer: {
        marginBottom: 20,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(237, 237, 237, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 10,
    },
    message: {
        fontSize: 16,
        color: '#a0a0a0',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    button: {
        backgroundColor: AppColors.primary,
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 30,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    }
});
