import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Switch,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';
import { useTheme } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../src/i18n/useTranslation';

interface AutoBagCreationModalProps {
    visible: boolean;
    sessionName: string;
    onClose: () => void;
    onCreateBag: (styles: string[], dontShowAgain: boolean) => Promise<void>;
    onDontShowAgain: () => Promise<void>;
}

export const AutoBagCreationModal: React.FC<AutoBagCreationModalProps> = ({
    visible,
    sessionName,
    onClose,
    onCreateBag,
    onDontShowAgain,
}) => {
    const { mode } = useThemeMode();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;

    const [availableStyles, setAvailableStyles] = useState<string[]>([]);
    const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingStyles, setLoadingStyles] = useState(true);

    useEffect(() => {
        if (visible) {
            loadUserStyles();
            setSelectedStyles([]);
            setDontShowAgain(false);
        }
    }, [visible]);

    const loadUserStyles = async () => {
        try {
            setLoadingStyles(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Obtener estilos de los álbumes del usuario
            // user_collection -> albums -> album_styles -> styles
            // Simplificación: obtener todos los estilos usados en la colección del usuario
            // Como es complejo, vamos a obtener los estilos más comunes o todos los estilos disponibles
            // Para esta versión, obtenemos todos los estilos disponibles en la base de datos que tengan uso
            // O mejor, obtenemos los estilos de los álbumes del usuario.

            // Query optimizada: obtener estilos distintos de los álbumes del usuario
            // Esto requeriría una vista o función RPC.
            // Por simplicidad, vamos a obtener los últimos 50 álbumes del usuario y extraer sus estilos.

            const { data: collection } = await supabase
                .from('user_collection')
                .select(`
          albums (
            album_styles (
              styles (name)
            )
          )
        `)
                .eq('user_id', user.id)
                .limit(50);

            const stylesSet = new Set<string>();
            collection?.forEach((item: any) => {
                item.albums?.album_styles?.forEach((as: any) => {
                    if (as.styles?.name) {
                        stylesSet.add(as.styles.name);
                    }
                });
            });

            setAvailableStyles(Array.from(stylesSet).sort());
        } catch (error) {
            console.error('Error loading styles:', error);
        } finally {
            setLoadingStyles(false);
        }
    };

    const toggleStyle = (style: string) => {
        if (selectedStyles.includes(style)) {
            setSelectedStyles(selectedStyles.filter(s => s !== style));
        } else {
            setSelectedStyles([...selectedStyles, style]);
        }
    };

    const handleCreate = async () => {
        if (selectedStyles.length === 0) {
            Alert.alert(t('common_error'), t('autoBag_errorNoStyles'));
            return;
        }

        setLoading(true);
        try {
            await onCreateBag(selectedStyles, dontShowAgain);
        } catch (error) {
            console.error('Error creating bag:', error);
            Alert.alert(t('common_error'), t('autoBag_toastError'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (dontShowAgain) {
            await onDontShowAgain();
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.card }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{t('autoBag_modalTitle')}</Text>
                        <Text style={[styles.subtitle, { color: colors.text }]}>
                            {t('autoBag_modalDescription')}
                        </Text>
                        <Text style={[styles.sessionName, { color: primaryColor }]}>{t('autoBag_sessionLabel')}: {sessionName}</Text>
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('autoBag_selectStylesLabel')}:</Text>

                    {loadingStyles ? (
                        <ActivityIndicator size="small" color={primaryColor} style={{ marginVertical: 20 }} />
                    ) : (
                        <ScrollView style={styles.stylesList} contentContainerStyle={styles.stylesContent}>
                            {availableStyles.length > 0 ? (
                                availableStyles.map(style => (
                                    <TouchableOpacity
                                        key={style}
                                        style={[
                                            styles.styleChip,
                                            selectedStyles.includes(style) && { backgroundColor: primaryColor, borderColor: primaryColor }
                                        ]}
                                        onPress={() => toggleStyle(style)}
                                    >
                                        <Text
                                            style={[
                                                styles.styleText,
                                                selectedStyles.includes(style) ? { color: '#FFF' } : { color: colors.text }
                                            ]}
                                        >
                                            {style}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={{ color: colors.text, opacity: 0.7 }}>No se encontraron estilos en tu colección.</Text>
                            )}
                        </ScrollView>
                    )}

                    <View style={styles.optionRow}>
                        <Text style={[styles.optionText, { color: colors.text }]}>{t('autoBag_noMoreLabel')}</Text>
                        <Switch
                            value={dontShowAgain}
                            onValueChange={setDontShowAgain}
                            trackColor={{ false: '#767577', true: primaryColor }}
                            thumbColor={dontShowAgain ? '#fff' : '#f4f3f4'}
                        />
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                            onPress={handleCancel}
                            disabled={loading}
                        >
                            <Text style={[styles.buttonText, { color: colors.text }]}>{t('autoBag_ctaCancel')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.createButton, { backgroundColor: primaryColor }]}
                            onPress={handleCreate}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={[styles.buttonText, { color: '#FFF' }]}>{t('autoBag_ctaCreate')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        opacity: 0.8,
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 20,
    },
    sessionName: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
    },
    stylesList: {
        maxHeight: 150,
        marginBottom: 20,
    },
    stylesContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    styleChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        backgroundColor: 'transparent',
    },
    styleText: {
        fontSize: 14,
    },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    optionText: {
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    createButton: {
        // backgroundColor set dynamically
    },
    buttonText: {
        fontWeight: '600',
        fontSize: 16,
    },
});
