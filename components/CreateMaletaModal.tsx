import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/i18n/useTranslation';

interface CreateMaletaModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: { title: string; description?: string; is_public: boolean; is_collaborative?: boolean }, initialAlbumId?: string) => void;
    loading?: boolean;
    initialAlbumId?: string;
    initialValues?: {
        title: string;
        description?: string;
        is_public: boolean;
        is_collaborative?: boolean;
    };
    isEditing?: boolean;
    maletaId?: string;
    navigation?: any;
}

export const CreateMaletaModal: React.FC<CreateMaletaModalProps> = ({
    visible,
    onClose,
    onSubmit,
    loading = false,
    initialAlbumId,
    initialValues,
    isEditing = false,
    maletaId,
    navigation,
}) => {
    const [title, setTitle] = useState(initialValues?.title || '');
    const [description, setDescription] = useState(initialValues?.description || '');
    const [isPublic, setIsPublic] = useState(initialValues?.is_public || false);
    const [isCollaborative, setIsCollaborative] = useState(initialValues?.is_collaborative ?? false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const { t } = useTranslation();

    // Update state when visible or initialValues change
    React.useEffect(() => {
        if (visible && initialValues) {
            setTitle(initialValues.title);
            setDescription(initialValues.description || '');
            setIsPublic(initialValues.is_public);
            setIsCollaborative(initialValues.is_collaborative ?? false);
        } else if (visible && !isEditing) {
            // Reset for new creation
            setTitle('');
            setDescription('');
            setIsPublic(false);
            setIsCollaborative(false);
        }
    }, [visible, initialValues, isEditing]);

    const handleClose = () => {
        if (!isEditing) {
            setTitle('');
            setDescription('');
            setIsPublic(false);
            setIsCollaborative(false);
        }
        setValidationError(null);
        onClose();
    };

    const handleSubmit = () => {
        if (!title.trim()) {
            setValidationError('El nombre es obligatorio');
            return;
        }

        onSubmit({
            title: title.trim(),
            description: description.trim() || undefined,
            is_public: isPublic,
            is_collaborative: isCollaborative,
        }, initialAlbumId);

        if (!isEditing) {
            // Reset form only if not editing (or let parent handle close/reset)
            setTitle('');
            setDescription('');
            setIsPublic(false);
            setIsCollaborative(false);
        }
        setValidationError(null);
    };

    console.log('CreateMaletaModal rendering, visible:', visible);

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.modalOverlay} pointerEvents="box-none">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContentWrapper}
                    pointerEvents="box-none"
                >
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.modalHeaderNew}>
                            <Text style={styles.modalTitleNew}>{isEditing ? t('common_edit') : t('album_detail_create_new_bag')}</Text>
                            <TouchableOpacity onPress={handleClose} style={styles.modalCloseButtonNew}>
                                <Ionicons name="close" size={28} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalBodyNew}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                            {/* Nombre */}
                            <View style={styles.formGroupNew}>
                                <Text style={styles.labelNew}>
                                    {t('common_title_required')}
                                </Text>
                                <TextInput
                                    style={[
                                        styles.inputNew,
                                        validationError ? styles.inputError : null,
                                    ]}
                                    value={title}
                                    onChangeText={(text) => {
                                        setTitle(text);
                                        if (validationError) {
                                            setValidationError(null);
                                        }
                                    }}
                                    placeholder="Nombre de la maleta"
                                    placeholderTextColor="#999"
                                />
                                {validationError && (
                                    <Text style={styles.errorText}>{validationError}</Text>
                                )}
                            </View>

                            {/* Descripción */}
                            <View style={styles.formGroupNew}>
                                <Text style={styles.labelNew}>{t('common_description')}</Text>
                                <TextInput
                                    style={[styles.inputNew, styles.textAreaNew]}
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Descripción de la maleta..."
                                    placeholderTextColor="#999"
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                />
                            </View>



                            {/* Colaboración */}
                            <View style={styles.formGroupNew}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={[styles.labelNew, { marginBottom: 0 }]}>{t('maletas_collaborative_switchLabel')}</Text>
                                    <Switch
                                        value={isCollaborative}
                                        onValueChange={setIsCollaborative}
                                        trackColor={{ false: '#767577', true: '#000' }}
                                        thumbColor={isCollaborative ? '#fff' : '#f4f3f4'}
                                    />
                                </View>
                                <Text style={styles.helperText}>
                                    {t('maletas_collaborative_switchDescription')}
                                </Text>

                                {isCollaborative && isEditing && maletaId && (
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 12,
                                            backgroundColor: '#f0f0f0',
                                            borderRadius: 12,
                                            marginTop: 8
                                        }}
                                        onPress={() => {
                                            onClose(); // Close modal first
                                            navigation?.navigate('InviteCollaborators', { maletaId });
                                        }}
                                    >
                                        <Ionicons name="people" size={20} color="#000" style={{ marginRight: 8 }} />
                                        <Text style={{ fontWeight: '600', color: '#000' }}>Invite Collaborators</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Espacio para botones */}
                            <View style={{ height: 20 }} />
                        </ScrollView>

                        {/* Botón */}
                        <View style={styles.modalButtonsNew}>
                            <TouchableOpacity
                                style={styles.createButtonNew}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                <Text style={styles.createButtonTextNew}>
                                    {loading ? t('common_saving') : (isEditing ? t('common_save') : t('album_detail_create_new_bag'))}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContentWrapper: {
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
        paddingBottom: 32,
    },
    modalHeaderNew: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitleNew: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000',
    },
    modalCloseButtonNew: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
    },
    modalBodyNew: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
    },
    formGroupNew: {
        marginBottom: 16,
    },
    labelNew: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#000',
    },
    requiredAsterisk: {
        color: '#ef4444',
    },
    inputNew: {
        borderWidth: 1,
        borderColor: '#dadada',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#000',
        minHeight: 48,
    },
    inputError: {
        borderColor: '#ef4444',
        backgroundColor: '#fef2f2',
    },
    textAreaNew: {
        minHeight: 100,
        textAlignVertical: 'top',
        paddingVertical: 12,
    },
    errorText: {
        fontSize: 13,
        color: '#ef4444',
        marginTop: 6,
        fontWeight: '500',
    },
    paymentPickerNew: {
        flexDirection: 'row',
        gap: 10,
    },
    paymentOptionNew: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#dadada',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    paymentOptionSelectedNew: {
        backgroundColor: '#000',
        borderColor: '#000',
    },
    paymentOptionTextNew: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    paymentOptionTextSelectedNew: {
        color: '#fff',
    },
    modalButtonsNew: {
        flexDirection: 'column',
        gap: 12,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 8,
    },
    createButtonNew: {
        backgroundColor: '#000',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    createButtonTextNew: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonPrimaryNew: {
        paddingVertical: 16,
        backgroundColor: '#000',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabledNew: {
        backgroundColor: '#ccc',
        opacity: 0.6,
    },
    buttonTextPrimaryNew: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    helperText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 12,
    },
});
