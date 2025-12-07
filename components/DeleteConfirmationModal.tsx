import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
    TouchableWithoutFeedback
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/i18n/useTranslation';

interface DeleteConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    cancelText?: string;
    confirmText?: string;
    loading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    visible,
    onClose,
    onConfirm,
    title,
    message,
    cancelText,
    confirmText,
    loading = false
}) => {
    const { colors } = useTheme();
    const { t } = useTranslation();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                            <View style={styles.iconContainer}>
                                <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
                                    <Ionicons name="trash-outline" size={28} color="#dc2626" />
                                </View>
                            </View>

                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {title || t('common_delete_confirm_title') || '¿Eliminar álbum?'}
                            </Text>

                            <Text style={[styles.modalMessage, { color: colors.text }]}>
                                {message || t('common_delete_confirm_message') || '¿Seguro que quieres eliminar este álbum? Esta acción no se puede deshacer.'}
                            </Text>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                                    onPress={onClose}
                                    disabled={loading}
                                >
                                    <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                                        {cancelText || t('common_cancel') || 'Cancelar'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.button, styles.deleteButton]}
                                    onPress={onConfirm}
                                    disabled={loading}
                                >
                                    <Text style={styles.deleteButtonText}>
                                        {loading ? (t('common_deleting') || 'Eliminando...') : (confirmText || t('common_delete') || 'Eliminar')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 16,
        padding: 24,
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
    iconContainer: {
        marginBottom: 16,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        opacity: 0.7,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
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
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    deleteButton: {
        backgroundColor: '#dc2626',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
