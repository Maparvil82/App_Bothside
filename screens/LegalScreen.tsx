import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    Modal,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useTheme } from '@react-navigation/native';
import { WebView } from 'react-native-webview';

/**
 * LegalScreen
 * 
 * Pantalla de información legal requerida por App Store.
 * Incluye: Política de Privacidad, Términos, Atribuciones, Contacto y Eliminación de cuenta.
 */
export const LegalScreen: React.FC = () => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const [webViewVisible, setWebViewVisible] = useState(false);
    const [webViewUrl, setWebViewUrl] = useState('');
    const [webViewTitle, setWebViewTitle] = useState('');
    const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);

    // URLs de documentos legales (reemplazar con URLs reales de Notion)
    const PRIVACY_POLICY_URL = 'https://www.notion.so/Privacy-Policy-2b1f3ade92a98073992ae670f5082882?source=copy_link'; // TODO: Reemplazar con URL real
    const TERMS_URL = 'https://www.notion.so/Legal-Information-2b1f3ade92a9807ca71fd65dcf7feeab?source=copy_link'; // TODO: Reemplazar con URL real

    /**
     * Abrir WebView interna con documento legal
     */
    const openWebView = (url: string, title: string) => {
        setWebViewUrl(url);
        setWebViewTitle(title);
        setWebViewVisible(true);
    };



    /**
     * Mostrar modal de eliminación de cuenta
     */
    const showDeleteAccountModal = () => {
        setDeleteAccountModalVisible(true);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Versión de la app */}
                <View style={styles.versionContainer}>
                    <Text style={[styles.versionText, { color: colors.text }]}>Bothside v1.0.0 (Beta)</Text>
                </View>

                {/* Sección: Documentos Legales */}
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Documentos Legales</Text>

                    {/* Política de Privacidad */}
                    <TouchableOpacity
                        style={[styles.menuItem, { borderBottomColor: colors.border }]}
                        onPress={() => openWebView(PRIVACY_POLICY_URL, 'Política de Privacidad')}
                    >
                        <View style={styles.menuItemContent}>
                            <Ionicons name="shield-checkmark-outline" size={22} color={colors.text} />
                            <Text style={[styles.menuItemText, { color: colors.text }]}>Política de Privacidad</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.text} opacity={0.5} />
                    </TouchableOpacity>

                    {/* Términos y Condiciones */}
                    <TouchableOpacity
                        style={[styles.menuItem, { borderBottomColor: colors.border }]}
                        onPress={() => openWebView(TERMS_URL, 'Términos y Condiciones')}
                    >
                        <View style={styles.menuItemContent}>
                            <Ionicons name="document-text-outline" size={22} color={colors.text} />
                            <Text style={[styles.menuItemText, { color: colors.text }]}>Términos y Condiciones</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.text} opacity={0.5} />
                    </TouchableOpacity>
                </View>

                {/* Sección: Avisos de Terceros */}
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Avisos de Terceros</Text>

                    {/* Atribución Discogs */}
                    <View style={styles.attributionBlock}>
                        <Text style={[styles.attributionTitle, { color: colors.text }]}>Discogs API</Text>
                        <Text style={[styles.attributionText, { color: colors.text }]}>
                            This application uses Discogs' API but is not affiliated with, sponsored or endorsed by Discogs. 'Discogs' is a trademark of Zink Media, LLC.
                        </Text>
                    </View>

                    {/* Aviso Google Gemini */}
                    <View style={styles.attributionBlock}>
                        <Text style={[styles.attributionTitle, { color: colors.text }]}>Google Gemini AI</Text>
                        <Text style={[styles.attributionText, { color: colors.text }]}>
                            Bothside uses Google Gemini for AI-powered features such as chat, cover recognition, and metadata analysis. Some data may be sent to Google Gemini for processing.
                        </Text>
                    </View>
                </View>



            </ScrollView>

            {/* WebView Modal */}
            <Modal
                visible={webViewVisible}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setWebViewVisible(false)}
            >
                <SafeAreaView style={[styles.webViewContainer, { backgroundColor: colors.background }]}>
                    {/* Header */}
                    <View style={[styles.webViewHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                        <Text style={[styles.webViewTitle, { color: colors.text }]}>{webViewTitle}</Text>
                        <TouchableOpacity
                            onPress={() => setWebViewVisible(false)}
                            style={styles.webViewCloseButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* WebView */}
                    <WebView
                        source={{ uri: webViewUrl }}
                        style={styles.webView}
                        startInLoadingState={true}
                    />
                </SafeAreaView>
            </Modal>

            {/* Modal de Eliminación de Cuenta */}
            <Modal
                visible={deleteAccountModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setDeleteAccountModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Ionicons name="information-circle-outline" size={48} color={colors.primary} />
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Eliminación de Cuenta</Text>
                        <Text style={[styles.modalText, { color: colors.text }]}>
                            La eliminación de cuenta estará disponible próximamente. Mientras tanto, puedes solicitarlo escribiendo a:
                        </Text>
                        <Text style={[styles.modalEmail, { color: colors.primary }]}>maparvil@gmail.com</Text>

                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: colors.primary }]}
                            onPress={() => setDeleteAccountModalVisible(false)}
                        >
                            <Text style={styles.modalButtonText}>Entendido</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    section: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginVertical: 15,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuItemText: {
        fontSize: 16,
        marginLeft: 12,
    },

    attributionBlock: {
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    attributionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    attributionText: {
        fontSize: 13,
        lineHeight: 20,
        opacity: 0.7,
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    versionText: {
        fontSize: 13,
        opacity: 0.6,
        fontWeight: '500',
    },
    // WebView Modal Styles
    webViewContainer: {
        flex: 1,
    },
    webViewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    webViewTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    webViewCloseButton: {
        position: 'absolute',
        right: 20,
        padding: 4,
    },
    webView: {
        flex: 1,
    },
    // Delete Account Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 12,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        opacity: 0.8,
        marginBottom: 12,
    },
    modalEmail: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 24,
    },
    modalButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
        minWidth: 120,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});
