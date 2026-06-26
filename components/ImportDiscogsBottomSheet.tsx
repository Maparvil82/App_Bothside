import React, { useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Linking,
  PanResponder,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/i18n/useTranslation';
import { useTheme } from '@react-navigation/native';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';

export const BOTHSIDE_WEB_IMPORT_URL = "https://bothside.app/import";

interface ImportDiscogsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const ImportDiscogsBottomSheet: React.FC<ImportDiscogsBottomSheetProps> = ({
  visible,
  onClose,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;

  const panY = useRef(new Animated.Value(0)).current;

  const resetPositionAnim = Animated.timing(panY, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true,
  });

  const closeAnim = Animated.timing(panY, {
    toValue: Dimensions.get('window').height,
    duration: 200,
    useNativeDriver: true,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Trigger if user is dragging down
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          closeAnim.start(() => {
            onClose();
            panY.setValue(0);
          });
        } else {
          resetPositionAnim.start();
        }
      },
    })
  ).current;

  const handleOpenWeb = async () => {
    try {
      await Linking.openURL(BOTHSIDE_WEB_IMPORT_URL);
    } catch (error) {
      console.error('Error opening import web URL:', error);
    }
  };

  const handleClose = () => {
    closeAnim.start(() => {
      onClose();
      panY.setValue(0);
    });
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sheetWrapper}
        >
          <Animated.View
            style={[
              styles.sheetContainer,
              { transform: [{ translateY: panY }] }
            ]}
          >
            {/* Drag Handle Area */}
            <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Header */}
              <Text style={[styles.title, { color: colors.text }]}>
                {t('import_discogs_bs_title')}
              </Text>
              <Text style={styles.subtitle}>
                {t('import_discogs_bs_subtitle')}
              </Text>

              {/* Section: Why from the web? */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('import_discogs_bs_why_title')}
                </Text>
                
                <View style={styles.bulletItem}>
                  <Ionicons name="laptop" size={20} color={primaryColor} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>
                    {t('import_discogs_bs_why_point1')}
                  </Text>
                </View>
                
                <View style={styles.bulletItem}>
                  <Ionicons name="cloud-upload" size={20} color={primaryColor} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>
                    {t('import_discogs_bs_why_point2')}
                  </Text>
                </View>
                
                <View style={styles.bulletItem}>
                  <Ionicons name="shield-checkmark" size={20} color={primaryColor} style={styles.bulletIcon} />
                  <Text style={styles.bulletText}>
                    {t('import_discogs_bs_why_point3')}
                  </Text>
                </View>
              </View>

              {/* Section: How it works */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('import_discogs_bs_how_title')}
                </Text>
                
                <Text style={styles.stepText}>
                  {t('import_discogs_bs_how_step1')}
                </Text>
                <Text style={styles.stepText}>
                  {t('import_discogs_bs_how_step2')}
                </Text>
                <Text style={styles.stepText}>
                  {t('import_discogs_bs_how_step3')}
                </Text>
                <Text style={styles.stepText}>
                  {t('import_discogs_bs_how_step4')}
                </Text>
                <Text style={styles.stepText}>
                  {t('import_discogs_bs_how_step5')}
                </Text>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <SafeAreaView style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.buttonPrimary, { backgroundColor: primaryColor }]}
                onPress={handleOpenWeb}
                activeOpacity={0.9}
              >
                <Text style={styles.buttonTextPrimary}>
                  {t('import_discogs_bs_cta_primary')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonTextSecondary}>
                  {t('import_discogs_bs_cta_secondary')}
                </Text>
              </TouchableOpacity>
            </SafeAreaView>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    width: '100%',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: Dimensions.get('window').height * 0.85,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  dragHandleContainer: {
    width: '100%',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DDDDDD',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'left',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'left',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    textAlign: 'left',
  },
  stepText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
    marginBottom: 6,
    textAlign: 'left',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 10,
  },
  buttonPrimary: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonSecondary: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  buttonTextSecondary: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
});
