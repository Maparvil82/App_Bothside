import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    Alert,
    Modal,
} from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useTheme } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { ProfileService, UserProfile } from '../services/database';
import { supabase } from '../lib/supabase';
import { IaSubscriptionScreen } from './IaSubscriptionScreen';

export const AccountScreen: React.FC = () => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const { user, signOut } = useAuth();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Modals
    const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
    const [editField, setEditField] = useState<'name' | 'email' | 'password' | null>(null);

    useEffect(() => {
        if (user?.id) {
            loadProfile();
            setEmail(user.email || '');
        }
    }, [user?.id]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const userProfile = await ProfileService.getUserProfile(user!.id);
            setProfile(userProfile);
            setFullName(userProfile?.full_name || '');
            setUsername(userProfile?.username || '');
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!user?.id) return;

        try {
            setSaving(true);
            await ProfileService.updateUserProfile(user.id, {
                full_name: fullName,
                username: username,
                updated_at: new Date().toISOString(),
            });

            setProfile(prev => prev ? { ...prev, full_name: fullName, username: username } : null);
            setEditField(null);
            Alert.alert('Éxito', 'Perfil actualizado correctamente');
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'No se pudo actualizar el perfil');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateEmail = async () => {
        if (!email || !user?.email) return;
        if (email === user.email) {
            setEditField(null);
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase.auth.updateUser({ email: email });
            if (error) throw error;

            Alert.alert('Verificación enviada', 'Por favor revisa tu nuevo correo electrónico para confirmar el cambio.');
            setEditField(null);
        } catch (error: any) {
            console.error('Error updating email:', error);
            Alert.alert('Error', error.message || 'No se pudo actualizar el correo');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Las contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            Alert.alert('Éxito', 'Contraseña actualizada correctamente');
            setEditField(null);
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Error updating password:', error);
            Alert.alert('Error', error.message || 'No se pudo actualizar la contraseña');
        } finally {
            setSaving(false);
        }
    };

    const showDeleteAccountModal = () => {
        setDeleteAccountModalVisible(true);
    };

    const renderEditModal = () => {
        if (!editField) return null;

        return (
            <Modal
                visible={!!editField}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditField(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editField === 'name' ? 'Editar Perfil' :
                                    editField === 'email' ? 'Cambiar Correo' : 'Cambiar Contraseña'}
                            </Text>
                            <TouchableOpacity onPress={() => setEditField(null)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {editField === 'name' && (
                            <>
                                <Text style={[styles.label, { color: colors.text }]}>Nombre completo</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="Tu nombre"
                                    placeholderTextColor={colors.text + '80'}
                                />
                                <Text style={[styles.label, { color: colors.text, marginTop: 15 }]}>Nombre de usuario</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="username"
                                    placeholderTextColor={colors.text + '80'}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                    onPress={handleUpdateProfile}
                                    disabled={saving}
                                >
                                    {saving ? <BothsideLoader size="small" fullscreen={false} /> : <Text style={styles.saveButtonText}>Guardar Cambios</Text>}
                                </TouchableOpacity>
                            </>
                        )}

                        {editField === 'email' && (
                            <>
                                <Text style={[styles.label, { color: colors.text }]}>Correo electrónico actual</Text>
                                <Text style={[styles.valueText, { color: colors.text, marginBottom: 15 }]}>{user?.email}</Text>

                                <Text style={[styles.label, { color: colors.text }]}>Nuevo correo electrónico</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="nuevo@email.com"
                                    placeholderTextColor={colors.text + '80'}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                    onPress={handleUpdateEmail}
                                    disabled={saving}
                                >
                                    {saving ? <BothsideLoader size="small" fullscreen={false} /> : <Text style={styles.saveButtonText}>Actualizar Correo</Text>}
                                </TouchableOpacity>
                            </>
                        )}

                        {editField === 'password' && (
                            <>
                                <Text style={[styles.label, { color: colors.text }]}>Nueva contraseña</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Mínimo 6 caracteres"
                                    placeholderTextColor={colors.text + '80'}
                                    secureTextEntry
                                />
                                <Text style={[styles.label, { color: colors.text, marginTop: 15 }]}>Confirmar contraseña</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Repite la contraseña"
                                    placeholderTextColor={colors.text + '80'}
                                    secureTextEntry
                                />
                                <TouchableOpacity
                                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                    onPress={handleUpdatePassword}
                                    disabled={saving}
                                >
                                    {saving ? <BothsideLoader size="small" fullscreen={false} /> : <Text style={styles.saveButtonText}>Actualizar Contraseña</Text>}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>


            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <BothsideLoader />
                ) : (
                    <>
                        {/* Sección: Perfil */}
                        <View style={[styles.section, { backgroundColor: colors.card }]}>


                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                                onPress={() => setEditField('name')}
                            >
                                <View style={styles.menuItemContent}>
                                    <View>
                                        <Text style={[styles.menuItemLabel, { color: colors.text }]}>Nombre y Usuario</Text>
                                        <Text style={[styles.menuItemValue, { color: colors.text, opacity: 0.6 }]}>
                                            {profile?.full_name || 'Sin nombre'} • @{profile?.username || 'usuario'}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Sección: Seguridad */}
                        <View style={[styles.section, { backgroundColor: colors.card }]}>


                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                                onPress={() => setEditField('email')}
                            >
                                <View style={styles.menuItemContent}>
                                    <View>
                                        <Text style={[styles.menuItemLabel, { color: colors.text }]}>Correo electrónico</Text>
                                        <Text style={[styles.menuItemValue, { color: colors.text, opacity: 0.6 }]}>{user?.email}</Text>
                                    </View>
                                </View>
                                <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                                onPress={() => setEditField('password')}
                            >
                                <View style={styles.menuItemContent}>
                                    <View>
                                        <Text style={[styles.menuItemLabel, { color: colors.text }]}>Contraseña</Text>
                                        <Text style={[styles.menuItemValue, { color: colors.text, opacity: 0.6 }]}>••••••••</Text>
                                    </View>
                                </View>
                                <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Sección: Zona de Peligro */}
                        <View style={[styles.section, { backgroundColor: colors.card, marginTop: 40 }]}>

                            <TouchableOpacity onPress={() => navigation.navigate("IaSubscriptionScreen")}>
                                <Text>IA y Suscripción</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                                onPress={showDeleteAccountModal}
                            >
                                <View style={styles.menuItemContent}>
                                    <Ionicons name="trash-outline" size={22} color="#ff3b30" />
                                    <Text style={[styles.menuItemText, { color: '#ff3b30', marginLeft: 12 }]}>Eliminar Cuenta</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ff3b30" opacity={0.5} />
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </ScrollView>

            {renderEditModal()}

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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    section: {
        marginTop: 20,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
        opacity: 0.8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuItemLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    menuItemValue: {
        fontSize: 14,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
    },

    // Modal Styles
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
        width: '100%',
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
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
        textAlign: 'center',
    },
    modalButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
        alignSelf: 'center',
        minWidth: 120,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },

    // Form Styles
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        marginBottom: 10,
    },
    valueText: {
        fontSize: 16,
        fontWeight: '500',
    },
    saveButton: {
        paddingVertical: 14,
        borderRadius: 8,
        marginTop: 20,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
