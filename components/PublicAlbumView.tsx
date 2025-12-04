import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from '../src/i18n/useTranslation';
import { Linking, Alert } from 'react-native';

const { width } = Dimensions.get('window');

interface PublicAlbumViewProps {
    album: any; // Using any to avoid complex type imports, but should match AlbumDetail structure
    loading?: boolean;
}

export const PublicAlbumView: React.FC<PublicAlbumViewProps> = ({
    album,
    loading = false
}) => {
    const { colors } = useTheme();
    const { t } = useTranslation();

    if (!album || !album.albums) {
        return null;
    }

    const { title, artist, cover_url, release_year, label, tracks, album_stats, catalog_no, album_youtube_urls } = album.albums;

    const openVideo = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert(t('common_error'), t('album_detail_error_youtube_url'));
            }
        } catch (error) {
            console.error("Error opening YouTube URL:", error);
            Alert.alert(t('common_error'), t('album_detail_error_youtube_url'));
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Portada */}
                <View style={[styles.coverSection, { backgroundColor: colors.card }]}>
                    {cover_url ? (
                        <Image
                            source={{ uri: cover_url }}
                            style={styles.fullCoverImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.fullCoverPlaceholder, { backgroundColor: colors.border }]}>
                            <Text style={[styles.fullCoverPlaceholderText, { color: colors.text }]}>
                                {t('album_detail_no_cover')}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Info Principal */}
                <View style={styles.headerInfo}>
                    <Text style={[styles.albumTitle, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.albumArtist, { color: colors.text }]}>{artist}</Text>
                    <View style={styles.metaRow}>
                        {release_year && (
                            <Text style={[styles.metaText, { color: colors.text }]}>{release_year}</Text>
                        )}
                        {label && (
                            <>
                                <Text style={[styles.metaDot, { color: colors.text }]}>•</Text>
                                <Text style={[styles.metaText, { color: colors.text }]}>{label}</Text>
                            </>
                        )}
                    </View>
                </View>

                {/* Nº de Catálogo */}
                {catalog_no && (
                    <View style={[styles.section, { backgroundColor: colors.card, marginTop: 0, paddingTop: 0 }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 14, marginBottom: 4 }]}>{t('album_detail_catalog')}</Text>
                        <Text style={[styles.catalogText, { color: colors.text }]}>{catalog_no}</Text>
                    </View>
                )}



                {/* Sección Unificada: Valor de Mercado y Ratio de Venta */}
                {(album_stats?.avg_price || (album_stats?.want && album_stats?.have)) && (
                    <View style={[styles.unifiedMarketCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.marketRowContainer}>
                            {/* Valor de Mercado */}
                            {album_stats?.avg_price && (
                                <View style={styles.marketValueSection}>
                                    <Text style={[styles.valueCardTitle, { color: colors.text }]}>{t('album_detail_market_value')}</Text>
                                    <Text style={[styles.valueCardAmount, { color: colors.text }]}>
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(album_stats.avg_price)}
                                    </Text>
                                    <Text style={[styles.valueCardSubtitle, { color: colors.text }]}>{t('album_detail_avg_price')}</Text>
                                </View>
                            )}

                            {/* Divisor Vertical */}
                            {album_stats?.avg_price && (album_stats?.want && album_stats?.have) && (
                                <View style={styles.marketCardVerticalDivider} />
                            )}

                            {/* Ratio de Venta */}
                            {(album_stats?.want && album_stats?.have) && (
                                <View style={styles.marketValueSection}>
                                    <Text style={[styles.valueCardTitle, { color: colors.text }]}>{t('album_detail_sales_ratio')}</Text>
                                    <Text style={[styles.valueCardAmount, { color: colors.text }]}>
                                        {(album_stats.want / album_stats.have).toFixed(2)}
                                    </Text>
                                    <Text style={[styles.valueCardSubtitle, { color: colors.text }]}>
                                        {t('album_detail_want_have')}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Sección de Tracks */}
                {tracks && tracks.length > 0 && (
                    <View style={[styles.section, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('album_detail_tracks')}</Text>
                        {tracks.map((track: any, index: number) => (
                            <View key={index} style={[styles.trackItem, { borderBottomColor: colors.border }]}>
                                <View style={styles.trackInfo}>
                                    <Text style={[styles.trackPosition, { color: colors.text }]}>{track.position}</Text>
                                    <Text style={[styles.trackTitle, { color: colors.text }]}>{track.title}</Text>
                                </View>
                                {track.duration && (
                                    <Text style={[styles.trackDuration, { color: colors.text }]}>{track.duration}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Sección de Audio/Videos */}
                {album_youtube_urls && album_youtube_urls.length > 0 && (
                    <View style={[styles.section, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Audio</Text>
                        {album_youtube_urls.map((video: any, index: number) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.videoItem, { borderBottomColor: colors.border }]}
                                onPress={() => openVideo(video.url)}
                            >
                                <Ionicons name="logo-youtube" size={20} color="#FF0000" style={{ marginRight: 10 }} />
                                <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={1}>
                                    {video.title || `Video ${index + 1}`}
                                </Text>
                                <Ionicons name="open-outline" size={16} color={colors.text} style={{ opacity: 0.5 }} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    coverSection: {
        width: '100%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 0,
    },
    fullCoverImage: {
        width: '100%',
        height: '100%',
    },
    fullCoverPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullCoverPlaceholderText: {
        fontSize: 16,
        fontWeight: '500',
    },
    headerInfo: {
        padding: 20,
        alignItems: 'center',
    },
    albumTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    albumArtist: {
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 8,
        opacity: 0.8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaText: {
        fontSize: 14,
        opacity: 0.6,
    },
    metaDot: {
        fontSize: 14,
        marginHorizontal: 8,
        opacity: 0.6,
    },
    actionButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    section: {
        marginTop: 24,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    trackItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    trackInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    trackPosition: {
        width: 30,
        fontSize: 14,
        opacity: 0.6,
        marginRight: 8,
    },
    trackTitle: {
        fontSize: 14,
        flex: 1,
    },
    trackDuration: {
        fontSize: 14,
        opacity: 0.6,
    },
    unifiedMarketCard: {
        marginHorizontal: 0,
        marginTop: 0,
        borderBottomWidth: 1,
        overflow: 'hidden',
    },
    marketRowContainer: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    marketValueSection: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    marketCardVerticalDivider: {
        width: 1,
        backgroundColor: '#e9ecef',
    },
    valueCardTitle: {
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        opacity: 0.7,
    },
    valueCardAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    valueCardSubtitle: {
        fontSize: 12,
        opacity: 0.6,
    },
    catalogText: {
        fontSize: 16,
        fontWeight: '500',
    },
    videoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    videoTitle: {
        flex: 1,
        fontSize: 14,
        marginRight: 10,
    },
});
