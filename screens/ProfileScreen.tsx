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
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/i18n/useTranslation';
import { AppColors } from '../src/theme/colors';
import { useMyInvitations } from '../hooks/useCollaboration';
import { BothsideLoader } from '../components/BothsideLoader';

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const { mode, setMode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showSessionEarnings, setShowSessionEarnings] = useState<boolean>(true);
  const { invitations } = useMyInvitations();
  const pendingInvitationsCount = invitations.filter(inv => inv.status === 'pending').length;

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
      } catch { }
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
    if (!profile?.username) return user?.email?.charAt(0).toUpperCase() || 'U';
    return profile.username.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    if (profile?.username && profile.username.trim() !== '') return '@' + profile.username.trim();
    if (profile?.full_name && profile.full_name.trim() !== '') return profile.full_name.trim();
    if (user?.email) return user.email.split('@')[0];
    return t('common_user');
  };

  const handleChangeAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common_permissions_required'), t('profile_avatar_permission_message'));
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
        Alert.alert(t('common_success'), t('profile_avatar_updated'));
      }
    } catch (error) {
      console.error('Error changing avatar:', error);
      Alert.alert(t('common_error'), t('profile_error_avatar'));
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t('profile_signout'),
      t('profile_signout_confirmation'),
      [
        { text: t('common_cancel'), style: 'cancel' },
        { text: t('profile_signout'), style: 'destructive', onPress: async () => { try { await signOut(); } catch { Alert.alert(t('common_error'), t('profile_error_signout')); } } },
      ]
    );
  };

  const toggleTheme = async (value: boolean) => {
    try {
      setIsDarkMode(value);
      await setMode(value ? 'dark' : 'light');
    } catch { }
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileInfo, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleChangeAvatar}>
            {loading ? (
              <View style={[styles.avatar, { borderColor: colors.border, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
                <BothsideLoader size="small" fullscreen={false} />
              </View>
            ) : profile?.avatar_url ? (
              <Image
                source={{ uri: `${profile.avatar_url}?t=${profile?.updated_at || Date.now()}` }}
                style={[styles.avatar, { borderColor: colors.border, backgroundColor: primaryColor }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatar, { borderColor: colors.border, backgroundColor: primaryColor }]}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.changeAvatarText, { color: primaryColor }]}>{t('profile_change_avatar')}</Text>
          {loading ? (
            <View style={{ height: 24, width: 150, backgroundColor: colors.border, borderRadius: 4, marginBottom: 5, opacity: 0.3 }} />
          ) : (
            <Text style={[styles.displayName, { color: colors.text }]}>{getDisplayName()}</Text>
          )}
        </View>

        {/* Configuración */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>


          {/* Modo oscuro */}
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('profile_dark_mode')}</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
            />
          </View>

          {/* Mostrar ganancias de sesiones */}
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('profile_show_earnings')}</Text>
            <Switch
              value={showSessionEarnings}
              onValueChange={toggleSessionEarnings}
            />
          </View>
        </View>

        {/* Información */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>

          {/* Invitaciones */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate('Invitations' as never)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Invitaciones de Colaboración</Text>
              {pendingInvitationsCount > 0 && (
                <View style={{ backgroundColor: '#FF3B30', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{pendingInvitationsCount}</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text} opacity={0.5} />
          </TouchableOpacity>

          {/* Feedback */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate('Feedback' as never)}
          >
            <Text style={[styles.menuItemText, { color: colors.text }]}>{t('profile_feedback')}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text} opacity={0.5} />
          </TouchableOpacity>

          {/* Legal */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('Legal' as never)}
          >
            <Text style={[styles.menuItemText, { color: colors.text }]}>{t('profile_legal')}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text} opacity={0.5} />
          </TouchableOpacity>
        </View>

        {/* Cuenta */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>


          {/* Cuenta */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate('Account' as never)}
          >
            <Text style={[styles.menuItemText, { color: colors.text }]}>{t('profile_account')}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text} opacity={0.5} />
          </TouchableOpacity>

          {/* Cerrar sesión */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={handleSignOut}
          >
            <Text style={[styles.menuItemText, { color: '#ff3b30' }]}>{t('profile_signout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fake Tab Bar */}
      <View style={[styles.fakeTabBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Ionicons name="disc-outline" size={24} color="gray" />
        <Ionicons name="stats-chart-outline" size={24} color="gray" />
        <Ionicons name="add" size={32} color="gray" />
        <Ionicons name="bag-remove-outline" size={24} color="gray" />
        <Ionicons name="diamond-outline" size={24} color="gray" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { paddingBottom: 100 }, // Increased padding for tab bar
  profileInfo: { alignItems: 'center', paddingVertical: 10, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  avatarContainer: { marginBottom: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: AppColors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#e0e0e0' },
  avatarText: { color: 'white', fontSize: 36, fontWeight: '600' },
  changeAvatarText: { fontSize: 14, color: AppColors.primary, marginBottom: 15 },
  displayName: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 5 },
  section: { backgroundColor: 'white', marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginVertical: 15 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  settingLabel: { fontSize: 16, color: '#333' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  menuItemText: { fontSize: 16, fontWeight: '600' },
  fakeTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 80,
    paddingBottom: 20, // Adjust for safe area if needed, or just visual padding
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
}); 