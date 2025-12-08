import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/i18n/useTranslation';

interface YouTubeWebViewPlayerProps {
  visible: boolean;
  youtubeUrl: string;
  title: string;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export const YouTubeWebViewPlayer: React.FC<YouTubeWebViewPlayerProps> = ({
  visible,
  youtubeUrl,
  title,
  onClose,
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const webViewRef = useRef<WebView>(null);

  // Extraer ID del video de YouTube
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/v\/)([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const videoId = extractVideoId(youtubeUrl);

  // Crear diferentes URLs para probar
  const getEmbedUrls = (videoId: string) => {
    return [
      // URL embed optimizada para móviles
      `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=*&fs=1&cc_load_policy=0&iv_load_policy=3&autohide=0&mute=0&loop=0`,
      // URL embed alternativa más simple
      `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&rel=0&modestbranding=1&playsinline=1`,
      // URL embed básica
      `https://www.youtube.com/embed/${videoId}?controls=1&rel=0&modestbranding=1&playsinline=1`
    ];
  };

  const embedUrls = videoId ? getEmbedUrls(videoId) : [];
  const embedUrl = embedUrls[currentUrlIndex] || null;

  const handleWebViewLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'error' && data.message.includes('login')) {
        setError(t('youtube_player_login_required'));
      }
    } catch (e) {
      // Ignorar errores de parsing
    }
  };

  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setError(t('youtube_player_load_error'));
    setIsLoading(false);
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleTryNextUrl = () => {
    if (currentUrlIndex < embedUrls.length - 1) {
      setCurrentUrlIndex(currentUrlIndex + 1);
      setError(null);
      setIsLoading(true);
    } else {
      // Si no hay más URLs, abrir en navegador
      handleOpenInBrowser();
    }
  };

  const handleOpenInBrowser = () => {
    Linking.openURL(youtubeUrl).catch(err => {
      console.error('Error opening URL:', err);
      Alert.alert(t('common_error'), t('youtube_player_open_error'));
    });
  };

  if (!visible || !embedUrl) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="musical-note" size={24} color="#000" />
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.browserButton}
              onPress={handleOpenInBrowser}
            >
              <Ionicons name="open-outline" size={20} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* WebView Container */}
        <View style={styles.webViewContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={48} color="#dc3545" />
              <Text style={styles.errorTitle}>{t('youtube_player_error_title')}</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <View style={styles.errorButtons}>
                <TouchableOpacity
                  style={[styles.retryButton, styles.browserRetryButton]}
                  onPress={handleOpenInBrowser}
                >
                  <Ionicons name="open-outline" size={20} color="#fff" />
                  <Text style={styles.retryButtonText}>{t('youtube_player_open_browser')}</Text>
                </TouchableOpacity>
                {currentUrlIndex < embedUrls.length - 1 && (
                  <TouchableOpacity
                    style={[styles.retryButton, styles.nextUrlButton]}
                    onPress={handleTryNextUrl}
                  >
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                    <Text style={styles.retryButtonText}>{t('youtube_player_try_next')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetry}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.retryButtonText}>{t('youtube_player_retry')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <Ionicons name="musical-notes" size={48} color="#000" />
                  <Text style={styles.loadingText}>{t('youtube_player_loading')}</Text>
                </View>
              )}

              <WebView
                ref={webViewRef}
                source={{ uri: embedUrl }}
                style={styles.webView}
                onLoad={handleWebViewLoad}
                onError={handleWebViewError}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
                allowsFullscreenVideo={true}
                userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                onNavigationStateChange={(navState) => {
                  // Bloquear navegación fuera del embed
                  if (navState.url.includes('youtube.com/embed/')) {
                    return true;
                  }
                  return false;
                }}
                onShouldStartLoadWithRequest={(request) => {
                  // Solo permitir cargar URLs de embed
                  return request.url.includes('youtube.com/embed/');
                }}
                onMessage={handleWebViewMessage}
              />
            </>
          )}
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('youtube_player_footer_text')}
          </Text>
          <Text style={styles.footerSubtext}>
            {t('youtube_player_footer_subtext')}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  browserButton: {
    padding: 8,
    marginRight: 4,
  },
  closeButton: {
    padding: 8,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 1,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browserRetryButton: {
    backgroundColor: '#28a745',
  },
  nextUrlButton: {
    backgroundColor: '#ffc107',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  footerSubtext: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
});
