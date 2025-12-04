import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    SafeAreaView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from '../src/i18n/useTranslation';
import { YouTubeWebViewPlayer } from './YouTubeWebViewPlayer';

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
    const [showYoutubePlayer, setShowYoutubePlayer] = useState(false);
    const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState<string | null>(null);

    if (!album || !album.albums) {
        return null;
    }

    const { title, artist, cover_url, release_year, label, tracks, album_stats, catalog_no, album_youtube_urls } = album.albums;

    // Calcular ratio de ventas (Lógica copiada de AlbumDetailScreen para consistencia)
    const calculateSalesRatio = (want: number, have: number) => {
        if (!have || have === 0) return { ratio: 0, level: 'N/A', color: '#9ca3af' };
        const ratio = want / have;
        let level = t('album_detail_ratio_medium'); // Default to Medium/Normal
        let color = '#9ca3af';

        if (ratio > 10) {
            level = t('album_detail_ratio_exceptional'); // Holy Grail
            color = '#FFD700'; // Gold
        } else if (ratio > 5) {
            level = t('album_detail_ratio_high'); // Muy Deseado
            color = '#FF4500'; // OrangeRed
        } else if (ratio > 2) {
            level = t('album_detail_ratio_medium'); // Popular
            color = '#32CD32'; // LimeGreen
        } else {
            level = t('album_detail_ratio_low'); // Normal/Bajo
        }

        return { ratio, level, color };
    };

    const handlePlayYouTubeDirect = () => {
        if (album_youtube_urls && album_youtube_urls.length > 0) {
            setCurrentYoutubeUrl(album_youtube_urls[0].url);
            setShowYoutubePlayer(true);
        } else {
            Alert.alert(t('common_notice'), t('album_detail_no_videos'));
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
                        <Text style={[styles.metaText, { color: colors.text }]}>
                            {[
                                label,
                                release_year,
                                catalog_no
                            ].filter(Boolean).join(' · ')}
                        </Text>
                    </View>
                </View>

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
                            {album_stats?.want && album_stats?.have && (
                                (() => {
                                    const { ratio, level, color } = calculateSalesRatio(
                                        album_stats.want,
                                        album_stats.have
                                    );
                                    return (
                                        <View style={[styles.marketValueSection, { backgroundColor: color + '10' }]}>
                                            <Text style={[styles.valueCardTitle, { color: colors.text }]}>{t('album_detail_sales_ratio')}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={[styles.valueCardAmount, { color: color }]}>
                                                    {ratio > 0 ? ratio.toFixed(1) : 'N/A'}
                                                </Text>
                                            </View>
                                            <Text style={[styles.valueCardSubtitle, { color: color, fontWeight: '600' }]}>
                                                {level}
                                            </Text>
                                        </View>
                                    );
                                })()
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
            </ScrollView>

            {/* Botón flotante de YouTube */}
            {album_youtube_urls && album_youtube_urls.length > 0 && (
                <TouchableOpacity
                    style={[styles.floatingPlayButton, styles.youtubeButton]}
                    onPress={handlePlayYouTubeDirect}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="logo-youtube"
                        size={24}
                        color="#fff"
                    />
                </TouchableOpacity>
            )}

            {/* Reproductor de YouTube Interno */}
            {currentYoutubeUrl && (
                <YouTubeWebViewPlayer
                    visible={showYoutubePlayer}
                    youtubeUrl={currentYoutubeUrl}
                    title={title || t('album_detail_video_title')}
                    onClose={() => setShowYoutubePlayer(false)}
                />
            )}
        </SafeAreaView>
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
    floatingPlayButton: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: '#007AFF',
        borderRadius: 50,
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    youtubeButton: {
        backgroundColor: '#FF0000',
    },
});
