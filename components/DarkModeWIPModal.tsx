import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from '../src/i18n/useTranslation';

const { width } = Dimensions.get('window');

export const DarkModeWIPModal = () => {
    const { mode } = useThemeMode();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (mode === 'dark') {
            setVisible(true);
        }
    }, [mode]);

    const handleClose = () => {
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="moon" size={48} color="#0A84FF" />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>
                        {t('darkMode_modal_title')}
                    </Text>

                    <Text style={[styles.message, { color: colors.text }]}>
                        {t('darkMode_modal_message')}
                    </Text>

                    <Text style={[styles.subMessage, { color: colors.text }]}>
                        {t('darkMode_modal_sub_message')}
                    </Text>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleClose}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>{t('darkMode_modal_button')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: width * 0.85,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    iconContainer: {
        marginBottom: 20,
        backgroundColor: 'rgba(10, 132, 255, 0.1)',
        padding: 16,
        borderRadius: 50,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 22,
        opacity: 0.9,
    },
    subMessage: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        opacity: 0.6,
        lineHeight: 20,
    },
    button: {
        backgroundColor: '#0A84FF',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
