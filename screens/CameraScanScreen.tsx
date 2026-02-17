import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { GeminiService } from '../services/GeminiService';
import { AppColors } from '../src/theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditsContext';
import { CreditService } from '../services/CreditService';
import { useTranslation } from '../src/i18n/useTranslation';

export const CameraScanScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [scanning, setScanning] = useState(false);

    // Credit Logic
    const { user } = useAuth();
    const { credits, deductCredit } = useCredits();
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused && user) {
            if (credits <= 0) {
                Alert.alert(
                    'Sin Créditos AI',
                    'Necesitas créditos para usar el Escáner Mágico. ¿Quieres adquirir un paquete?',
                    [
                        { text: t('common_cancel'), onPress: () => navigation.goBack() },
                        {
                            text: 'Ir a la Tienda', onPress: () => {
                                navigation.goBack();
                                navigation.navigate('AICreditsStore');
                            }
                        }
                    ]
                );
            }
        }
    }, [isFocused, user]);

    useEffect(() => {
        if (permission && !permission.granted && permission.canAskAgain && isFocused) {
            requestPermission();
        }
    }, [permission, isFocused]);

    if (!permission) {
        // Camera permissions are still loading.
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.message}>{t('camera_preparing')}</Text>
            </View>
        );
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={styles.container}>
                <Text style={styles.message}>
                    {permission.canAskAgain
                        ? t('camera_permission_request')
                        : t('camera_permission_denied')}
                </Text>

                <TouchableOpacity
                    onPress={permission.canAskAgain ? requestPermission : Linking.openSettings}
                    style={styles.button}
                >
                    <Text style={styles.text}>
                        {permission.canAskAgain ? t('camera_permission_grant') : t('camera_permission_settings')}
                    </Text>
                </TouchableOpacity>

                {!permission.canAskAgain && (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.button, { marginTop: 20, backgroundColor: '#555' }]}>
                        <Text style={styles.text}>{t('camera_button_cancel')}</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current && !scanning) {

            // Check credits one last time before action
            const COST_SCAN = 5;
            if (credits < COST_SCAN) {
                Alert.alert('Créditos Insuficientes', `Necesitas ${COST_SCAN} créditos para escanear.`);
                return;
            }

            setScanning(true);
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.5, // Reduce size for faster upload
                    skipProcessing: true // Faster
                });

                if (photo?.base64) {
                    console.log('📸 Imagen capturada, analizando con Gemini...');
                    const result = await GeminiService.identifyAlbumFromImage(photo.base64);
                    console.log('🤖 Gemini Vision Resultado:', result);

                    const isValidResult = (str: string) => {
                        if (!str) return false;
                        const s = str.toLowerCase().trim();
                        return s.length > 1 && !['unknown', 'desconocido', 'n/a', 'title', 'artist', 'null', 'undefined'].includes(s);
                    };

                    const toTitleCase = (str: string) => {
                        return str.replace(/\w\S*/g, (txt) => {
                            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                        });
                    };

                    if (isValidResult(result.artist) && isValidResult(result.title)) {
                        // SUCCESS: Deduct Credit
                        await deductCredit(COST_SCAN);

                        // Navigate back
                        navigation.navigate('AddDisc', {
                            initialArtist: toTitleCase(result.artist),
                            initialAlbum: toTitleCase(result.title),
                            autoManualSearch: true
                        });
                    } else {
                        Alert.alert('No identificado', 'No pudimos identificar el álbum. Intenta acercarte más o mejorar la luz.');
                        setScanning(false);
                    }
                }
            } catch (error) {
                console.error('Error scanning:', error);
                Alert.alert('Error', 'Hubo un problema al analizar la imagen.');
                setScanning(false);
            }
        }
    };

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} ref={cameraRef} facing="back">
                <SafeAreaView style={styles.overlay}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                            <Ionicons name="close" size={30} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.title}>{t('add_disc_camera_title')}</Text>
                    </View>

                    <View style={styles.guideFrame}>
                        <View style={[styles.corner, styles.tl]} />
                        <View style={[styles.corner, styles.tr]} />
                        <View style={[styles.corner, styles.bl]} />
                        <View style={[styles.corner, styles.br]} />
                    </View>

                    <View style={styles.footer}>
                        {scanning ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#fff" />
                                <Text style={styles.loadingText}>{t('camera_ai_analyzing')}</Text>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                                <View style={styles.captureInner} />
                            </TouchableOpacity>
                        )}
                    </View>
                </SafeAreaView>
            </CameraView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
        color: 'white'
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    closeButton: {
        padding: 5,
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 20,
    },
    button: {
        alignSelf: 'center',
        padding: 10,
        backgroundColor: AppColors.primary,
        borderRadius: 5
    },
    text: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18
    },
    guideFrame: {
        width: 300,
        height: 300,
        alignSelf: 'center',
        backgroundColor: 'transparent',
        position: 'relative'
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: 'white',
        borderWidth: 4
    },
    tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    footer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center'
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white'
    },
    captureInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'white'
    },
    loadingContainer: {
        alignItems: 'center'
    },
    loadingText: {
        color: 'white',
        marginTop: 10,
        fontWeight: '600'
    }
});
