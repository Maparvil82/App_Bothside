import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  SafeAreaView,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useFocusEffect, useTheme } from '@react-navigation/native';
import { ProfileService, UserProfile } from '../services/database';
import * as ImagePicker from 'expo-image-picker';
import { GamificationService } from '../services/gamification';
import { useThemeMode } from '../contexts/ThemeContext';

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const { mode, setMode } = useThemeMode();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showSessionEarnings, setShowSessionEarnings] = useState<boolean>(true);

  useEffect(() => {
    setIsDarkMode(mode === 'dark');
  }, [mode]);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
      // Actualizar ranking persistido
      GamificationService.upsertUserRanking(user.id).catch((e) => console.warn('upsertUserRanking error:', e));
    }
    // Cargar preferencias
    (async () => {
      try {
        const themePref = await AsyncStorage.getItem('theme:mode');
        setIsDarkMode(themePref === 'dark');
        
        const earningsPref = await AsyncStorage.getItem('settings:showSessionEarnings');
        setShowSessionEarnings(earningsPref !== 'false'); // Por defecto true
      } catch {}
    })();
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) loadProfile();
      return undefined;
    }, [user?.id])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userProfile = await ProfileService.getUserProfile(user!.id);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (!profile?.full_name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return profile.full_name
      .split(' ')
      .map((name: string) => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = () => {
    if (profile?.full_name && profile.full_name.trim() !== '') return profile.full_name.trim();
    if (profile?.username && profile.username.trim() !== '') return profile.username.trim();
    if (user?.email) return user.email.split('@')[0];
    return 'Usuario';
  };

  const handleChangeAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Necesitamos acceso a tu galería para cambiar la foto de perfil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const mime = file.mimeType || (file.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
        const avatarUrl = file.base64
          ? await ProfileService.uploadAvatarFromBase64(user!.id, file.base64, mime)
          : await ProfileService.uploadAvatarFromUri(user!.id, file.uri);
        await ProfileService.updateUserProfile(user!.id, { avatar_url: avatarUrl, updated_at: new Date().toISOString() });
        await loadProfile();
        Alert.alert('Éxito', 'Foto de perfil actualizada correctamente');
      }
    } catch (error) {
      console.error('Error changing avatar:', error);
      Alert.alert('Error', 'No se pudo cambiar la foto de perfil');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: async () => { try { await signOut(); } catch { Alert.alert('Error', 'No se pudo cerrar sesión'); } } },
      ]
    );
  };

  const toggleTheme = async (value: boolean) => {
    try {
      setIsDarkMode(value);
      await setMode(value ? 'dark' : 'light');
    } catch {}
  };

  const toggleSessionEarnings = async (value: boolean) => {
    try {
      setShowSessionEarnings(value);
      await AsyncStorage.setItem('settings:showSessionEarnings', value.toString());
    } catch (error) {
      console.error('Error saving session earnings setting:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }] }>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileInfo, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleChangeAvatar}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: `${profile.avatar_url}?t=${profile?.updated_at || Date.now()}` }}
                style={[styles.avatar, { borderColor: colors.border }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatar, { borderColor: colors.border }]}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.changeAvatarText, { color: colors.primary }]}>Toca para cambiar foto</Text>
          <Text style={[styles.displayName, { color: colors.text }]}>{getDisplayName()}</Text>
        </View>

        {/* Configuración: solo modo claro/oscuro */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Configuración</Text>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Modo oscuro</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
            />
          </View>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Mostrar ganancias de sesiones</Text>
            <Switch
              value={showSessionEarnings}
              onValueChange={toggleSessionEarnings}
            />
          </View>
        </View>

        {/* Producto */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Producto</Text>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: colors.border }]} 
            onPress={() => navigation.navigate('Feedback' as never)}
          >
            <Text style={[styles.menuItemText, { color: colors.text }]}>Feedback</Text>
          </TouchableOpacity>
        </View>

        {/* Cuenta */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Cuenta</Text>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleSignOut}>
            <Text style={[styles.menuItemText, { color: '#ff3b30' }]}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { paddingBottom: 40 },
  profileInfo: { alignItems: 'center', paddingVertical: 10, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  avatarContainer: { marginBottom: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#e0e0e0' },
  avatarText: { color: 'white', fontSize: 36, fontWeight: '600' },
  changeAvatarText: { fontSize: 14, color: '#007AFF', marginBottom: 15 },
  displayName: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 5 },
  section: { backgroundColor: 'white', marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginVertical: 15 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  settingLabel: { fontSize: 16, color: '#333' },
  menuItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuItemText: { fontSize: 16, color: '#ff3b30', fontWeight: '600' },
}); 