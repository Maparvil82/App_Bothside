import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    Image,
    Linking,
    Dimensions
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { DiscogsService } from '../services/discogs';
import { DiscogsStatsService } from '../services/discogs-stats';
import { UserCollectionService, AlbumService } from '../services/database';
import { AppColors } from '../src/theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../src/i18n/useTranslation';
import { useThemeMode } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

// Helper to normalize strings for comparisons (duplicate detection)
const normalize = (str: string) =>
    str
        ?.toLowerCase()
        ?.normalize("NFD")
        ?.replace(/[\u0300-\u036f]/g, "")
        ?.replace(/\(.*?\)/g, "")
        ?.replace(/[^a-z0-9]/g, "")
        ?.trim();

export const BarcodeScanScreen = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const { mode } = useThemeMode();
    const [permission, requestPermission] = useCameraPermissions();

    const [scanned, setScanned] = useState(false);
    const [searching, setSearching] = useState(false);
    const [scannedRelease, setScannedRelease] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);

    const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;

    // Reset scanner state when screen loses focus
    useEffect(() => {
        if (!isFocused) {
            setScanned(false);
            setScannedRelease(null);
            setSearching(false);
        }
    }, [isFocused]);

    if (!permission) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: 'black' }]}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.statusText}>{t('camera_preparing') || 'Iniciando cámara...'}</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: 'black', padding: 20 }]}>
                <View style={styles.permissionCard}>
                    <Ionicons name="camera-outline" size={48} color="white" style={{ marginBottom: 16 }} />
                    <Text style={styles.permissionTitle}>
                        {t('common_permissions_required') || 'Permisos Requeridos'}
                    </Text>
                    <Text style={styles.permissionDesc}>
                        {permission.canAskAgain
                            ? (t('camera_permission_request') || 'Bothside necesita acceso a tu cámara para escanear códigos de barras.')
                            : (t('camera_permission_denied') || 'El acceso a la cámara está desactivado. Habilítalo en la configuración de tu sistema.')}
                    </Text>
                    <TouchableOpacity
                        onPress={permission.canAskAgain ? requestPermission : Linking.openSettings}
                        style={[styles.actionButton, { backgroundColor: primaryColor }]}
                    >
                        <Text style={styles.actionButtonText}>
                            {permission.canAskAgain ? (t('camera_permission_grant') || 'Conceder Permiso') : (t('camera_permission_settings') || 'Abrir Ajustes')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.cancelLink}
                    >
                        <Text style={styles.cancelLinkText}>{t('common_cancel') || 'Cancelar'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Handles barcode scanning event from CameraView
    const handleBarcodeScanned = async ({ data }: { data: string }) => {
        if (scanned || searching) return;
        setScanned(true);
        setSearching(true);
        console.log(`🤖 Código de barras escaneado: ${data}`);

        try {
            // Search barcode in Discogs
            let response = await DiscogsService.searchByBarcode(data);
            let results = response?.results || [];

            // If not found and it's a 12-digit UPC-A barcode, try prepending a '0' to make it EAN-13
            if (results.length === 0 && data.length === 12) {
                const ean13 = `0${data}`;
                console.log(`🔍 No se encontró como UPC. Probando conversión a EAN-13: ${ean13}`);
                response = await DiscogsService.searchByBarcode(ean13);
                results = response?.results || [];
            }

            // Filter for vinyl releases
            const vinylResults = results.filter((item: any) => {
                let format = '';
                if (typeof item.format === 'string') {
                    format = item.format.toLowerCase();
                } else if (Array.isArray(item.format)) {
                    format = item.format.join(' ').toLowerCase();
                }
                return format.includes('vinyl') || format.includes('lp') || format.includes('12"') || format.includes('7"');
            });

            if (vinylResults.length > 0) {
                console.log(`✅ Release encontrado en Discogs:`, vinylResults[0].title);
                setScannedRelease(vinylResults[0]);
            } else if (results.length > 0) {
                // Fallback to first release found if no explicit vinyl format tag was matched but formats exist
                console.log(`ℹ️ No se detectó tag de vinilo explícito, mostrando primer resultado:`, results[0].title);
                setScannedRelease(results[0]);
            } else {
                console.log('❌ No se encontró ningún release en Discogs');
                Alert.alert(
                    'No encontrado',
                    'No pudimos encontrar ninguna edición para este código de barras en Discogs.',
                    [{ text: 'Intentar de nuevo', onPress: () => setScanned(false) }]
                );
            }
        } catch (error) {
            console.error('Error procesando escaneo de código de barras:', error);
            Alert.alert('Error', 'Hubo un problema al buscar el código de barras.', [
                { text: 'Aceptar', onPress: () => setScanned(false) }
            ]);
        } finally {
            setSearching(false);
        }
    };

    // Helper to format release title and artist safely
    const getReleaseInfo = () => {
        if (!scannedRelease) return { artist: '', title: '' };
        const titleParts = scannedRelease.title?.split(' - ') || [];
        const artist = titleParts[0]?.trim() || scannedRelease.artist || 'Artista Desconocido';
        const title = titleParts.slice(1).join(' - ')?.trim() || scannedRelease.title || 'Sin Título';
        return { artist, title };
    };

    // Saves the selected release into the user's Supabase collection
    const saveReleaseToCollection = async () => {
        if (!user || !scannedRelease) return;
        setSaving(true);

        try {
            console.log('🎵 Guardando release de código de barras:', scannedRelease.id);

            // 1. Check for duplicates in user collection first
            const { data: existingAlbum } = await supabase
                .from('albums')
                .select('id')
                .eq('discogs_id', scannedRelease.id)
                .maybeSingle();

            if (existingAlbum) {
                const { data: existingExact } = await supabase
                    .from("user_collection")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("album_id", existingAlbum.id)
                    .maybeSingle();

                if (existingExact) {
                    Alert.alert(
                        t('add_disc_alert_duplicate_title') || 'Ya tienes este disco',
                        t('add_disc_alert_duplicate_message') || 'Este disco ya está en tu colección.',
                        [{ text: 'Escanear otro', onPress: () => { setScannedRelease(null); setScanned(false); } }]
                    );
                    setSaving(false);
                    return;
                }
            }

            // 2. Comprobar si el usuario tiene OTRA edición (opcional, match por artista y título)
            const { artist, title } = getReleaseInfo();
            const normArtist = normalize(artist);
            const normTitle = normalize(title);

            const { data: userAlbums } = await supabase
                .from("user_collection")
                .select(`
                    id,
                    albums (
                        title,
                        artist,
                        discogs_id
                    )
                `)
                .eq("user_id", user.id);

            const otherEdition = userAlbums?.find((item) => {
                const alb = Array.isArray(item.albums) ? item.albums[0] : item.albums;
                if (!alb) return false;

                const sameArtist = normalize(alb.artist) === normArtist;
                const sameTitle = normalize(alb.title) === normTitle;
                const differentDiscogs = alb.discogs_id !== scannedRelease.id;

                return sameArtist && sameTitle && differentDiscogs;
            });

            if (otherEdition) {
                Alert.alert(
                    t('add_disc_alert_other_edition_title') || 'Tienes otra edición',
                    t('add_disc_alert_other_edition_message') || 'Ya tienes otra edición de este álbum, pero puedes añadir esta nueva también.'
                );
            }

            // 3. Invoke Supabase Edge Function to save
            const { data, error } = await supabase.functions.invoke('save-discogs-release', {
                body: {
                    discogsReleaseId: scannedRelease.id,
                    userId: user.id
                }
            });

            if (error) {
                console.error('❌ Error invocando Edge Function:', error);
                
                // FALLBACK: Inserción directa en base de datos si falla la Edge Function
                console.log('🛟 Fallback: intentando inserción local en catálogo...');
                let localAlbumId = existingAlbum?.id;

                if (!localAlbumId) {
                    const newAlbum = await AlbumService.createAlbum({
                        title: title,
                        artist: artist,
                        label: Array.isArray(scannedRelease.label) ? scannedRelease.label[0] : (scannedRelease.label || undefined),
                        release_year: scannedRelease.year ? String(scannedRelease.year) : undefined,
                        cover_url: scannedRelease.cover_image || scannedRelease.thumb,
                        catalog_no: scannedRelease.catno || undefined,
                        country: scannedRelease.country || undefined,
                        discogs_id: scannedRelease.id
                    } as any);
                    localAlbumId = newAlbum?.id;
                }

                if (localAlbumId) {
                    await UserCollectionService.addToCollection(user.id, localAlbumId);
                    DiscogsStatsService.fetchAndSaveDiscogsStats(localAlbumId, scannedRelease.id).catch(() => {});
                } else {
                    throw error;
                }
            }

            console.log('✅ Disco guardado exitosamente');

            // Success feedback
            Alert.alert(
                t('add_disc_success_title') || 'Disco añadido correctamente',
                t('add_disc_success_message') || '¿Qué quieres hacer ahora?',
                [
                    {
                        text: t('add_disc_action_add_more') || 'Añadir más',
                        onPress: () => {
                            setScannedRelease(null);
                            setScanned(false);
                        }
                    },
                    {
                        text: t('add_disc_action_go_collection') || 'Ir a colección',
                        onPress: () => {
                            navigation.navigate('SearchTab');
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('Error guardando disco:', error);
            Alert.alert('Error', 'No se pudo añadir el disco a tu colección.');
        } finally {
            setSaving(false);
        }
    };

    const { artist, title } = getReleaseInfo();

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'codabar', 'aztec', 'datamatrix', 'pdf417'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            >
                <SafeAreaView style={styles.overlay}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={30} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Escáner de Código de Barras</Text>
                    </View>

                    {/* Scanner Frame Overlay */}
                    <View style={styles.guideContainer}>
                        <View style={styles.guideFrame}>
                            <View style={[styles.corner, styles.tl]} />
                            <View style={[styles.corner, styles.tr]} />
                            <View style={[styles.corner, styles.bl]} />
                            <View style={[styles.corner, styles.br]} />
                            <View style={styles.scanLine} />
                        </View>
                        <Text style={styles.guideText}>
                            Coloca el código de barras del vinilo en el marco
                        </Text>
                    </View>

                    {/* Bottom Container */}
                    <View style={styles.footer}>
                        {searching && (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator size="large" color="white" />
                                <Text style={styles.loadingText}>Buscando en Discogs...</Text>
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            </CameraView>

            {/* Confirmation Bottom Card / Sheet */}
            {scannedRelease && (
                <View style={styles.bottomCardContainer}>
                    <View style={styles.bottomCard}>
                        {/* Detail layout */}
                        <View style={styles.detailRow}>
                            <Image
                                source={{ uri: scannedRelease.cover_image || scannedRelease.thumb || 'https://via.placeholder.com/120' }}
                                style={styles.albumThumbnail}
                            />
                            <View style={styles.albumMeta}>
                                <Text style={styles.albumTitle} numberOfLines={2}>{title}</Text>
                                <Text style={styles.albumArtist} numberOfLines={1}>{artist}</Text>
                                
                                <Text style={styles.albumDetails} numberOfLines={1}>
                                    {scannedRelease.year ? `${scannedRelease.year} • ` : ''}
                                    {Array.isArray(scannedRelease.label) ? scannedRelease.label[0] : (scannedRelease.label || 'Sello Desconocido')}
                                </Text>
                                <Text style={styles.albumDetails} numberOfLines={1}>
                                    {scannedRelease.catno ? `Cat: ${scannedRelease.catno}` : ''}
                                    {scannedRelease.country ? ` • ${scannedRelease.country}` : ''}
                                </Text>
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                onPress={() => {
                                    setScannedRelease(null);
                                    setScanned(false);
                                }}
                                style={styles.secondaryButton}
                                disabled={saving}
                            >
                                <Text style={styles.secondaryButtonText}>Escanear otro</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={saveReleaseToCollection}
                                style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Ionicons name="add" size={20} color="white" style={{ marginRight: 6 }} />
                                        <Text style={styles.primaryButtonText}>Añadir</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusText: {
        color: 'white',
        marginTop: 12,
        fontSize: 16,
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
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    closeButton: {
        padding: 5,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 16,
    },
    guideContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    guideFrame: {
        width: 320,
        height: 180,
        backgroundColor: 'transparent',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: 'white',
        borderWidth: 4,
    },
    tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    scanLine: {
        width: '90%',
        height: 2,
        backgroundColor: '#FF3B30',
        opacity: 0.8,
    },
    guideText: {
        color: 'white',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 20,
        paddingHorizontal: 30,
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    footer: {
        paddingBottom: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingBox: {
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 20,
        borderRadius: 12,
    },
    loadingText: {
        color: 'white',
        marginTop: 10,
        fontSize: 14,
        fontWeight: '500',
    },
    permissionCard: {
        width: '90%',
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
    },
    permissionTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
    },
    permissionDesc: {
        color: '#A0A0A0',
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    actionButton: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    cancelLink: {
        paddingVertical: 12,
    },
    cancelLinkText: {
        color: '#A0A0A0',
        fontSize: 16,
    },
    bottomCardContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        padding: 16,
    },
    bottomCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    albumThumbnail: {
        width: 90,
        height: 90,
        borderRadius: 8,
        marginRight: 14,
        backgroundColor: '#f0f0f0',
    },
    albumMeta: {
        flex: 1,
        justifyContent: 'center',
    },
    albumTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 4,
    },
    albumArtist: {
        fontSize: 15,
        fontWeight: '600',
        color: '#666',
        marginBottom: 6,
    },
    albumDetails: {
        fontSize: 12,
        color: '#999',
        marginBottom: 2,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    secondaryButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E5EA',
        marginRight: 10,
        backgroundColor: '#F2F2F7',
    },
    secondaryButtonText: {
        color: '#1C1C1E',
        fontSize: 15,
        fontWeight: '600',
    },
    primaryButton: {
        flex: 1.2,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
});
