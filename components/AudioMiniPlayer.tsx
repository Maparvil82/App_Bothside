import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import YoutubePlayer from "react-native-youtube-iframe";
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface AudioMiniPlayerProps {
    videoId: string | null;
    title: string;
    isVisible: boolean;
    onClose?: () => void;
    onPlayChange?: (playing: boolean) => void;
    onExpandChange?: (expanded: boolean) => void;
}

export const AudioMiniPlayer: React.FC<AudioMiniPlayerProps> = ({
    videoId,
    title,
    isVisible,
    onClose,
    onPlayChange,
    onExpandChange,
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Animation values
    const slideAnim = useRef(new Animated.Value(0)).current; // 0: hidden, 1: visible
    const expandAnim = useRef(new Animated.Value(0)).current; // 0: minimized, 1: expanded

    useEffect(() => {
        if (isVisible && videoId) {
            // Show player
            Animated.spring(slideAnim, {
                toValue: 1,
                useNativeDriver: false,
                tension: 50,
                friction: 8
            }).start();
            // Removed auto-play: setIsPlaying(true);
        } else {
            // Hide player
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false
            }).start(() => {
                setIsPlaying(false);
                setIsExpanded(false);
            });
        }
    }, [isVisible, videoId]);

    useEffect(() => {
        Animated.spring(expandAnim, {
            toValue: isExpanded ? 1 : 0,
            useNativeDriver: false,
            tension: 40,
            friction: 9
        }).start();
    }, [isExpanded]);

    const togglePlay = () => {
        // Solo expandir el reproductor para permitir interacción manual
        setIsExpanded(true);
        if (onExpandChange) onExpandChange(true);
    };

    const toggleExpand = () => {
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);
        if (onExpandChange) onExpandChange(newExpanded);
    };

    const handleClose = () => {
        setIsPlaying(false);
        if (onClose) onClose();
    };

    if (!videoId) return null;

    const containerHeight = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [80, 330] // 80 (mini) + 250 (video)
    });

    // videoOpacity is no longer directly used for the video container's opacity,
    // but expandAnim is still used for the overall container height.
    // The video container's opacity and height are now directly controlled by isExpanded.
    const videoOpacity = expandAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1]
    });

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    height: containerHeight,
                    transform: [
                        {
                            translateY: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [100, 0]
                            })
                        }
                    ],
                    opacity: slideAnim,
                }
            ]}
        >
            {/* Video Container */}
            {/* Video Container */}
            {isExpanded && (
                <View style={{ width: '100%', height: 250, backgroundColor: '#000' }}>
                    <YoutubePlayer
                        key={videoId}
                        videoId={videoId}
                        height={250}
                        width={"100%"}
                        onReady={() => setIsReady(true)}
                        onChangeState={(state: string) => {
                            if (state === 'ended') setIsPlaying(false);
                            if (state === 'playing') {
                                setIsPlaying(true);
                                setIsReady(true);
                            }
                            if (state === 'paused') setIsPlaying(false);
                            if (state === 'buffering') setIsPlaying(true);
                        }}
                        webViewProps={{
                            allowsInlineMediaPlayback: true,
                            mediaPlaybackRequiresUserAction: true
                        }}
                    />
                </View>
            )}

            {/* Mini Player Controls */}
            <View style={styles.controlsContainer}>
                <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>

                </View>

                <View style={styles.buttonsContainer}>
                    <TouchableOpacity onPress={togglePlay} style={styles.iconButton}>
                        <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={28}
                            color="#333"
                        />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={toggleExpand} style={styles.iconButton}>
                        <Ionicons
                            name={isExpanded ? "chevron-down" : "chevron-up"}
                            size={28}
                            color="#333"
                        />
                    </TouchableOpacity>


                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 1000,
        overflow: 'hidden', // Hide video when collapsed
    },
    videoContainer: {
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 0, // Controls always at bottom
        left: 0,
        right: 0,
        height: 80,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        zIndex: 2,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    status: {
        fontSize: 12,
        color: '#666',
    },
    buttonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconButton: {
        padding: 8,
    },
});
