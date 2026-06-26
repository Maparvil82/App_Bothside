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

export const BOTHSIDE_WEB_IMPORT_URL = 'https://bothside.app/import';

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

  const closeAnim = Animated.timing(panY, {
    toValue: Dimensions.get('window').height,
    duration: 220,
    useNativeDriver: true,
  });

  const resetPositionAnim = Animated.timing(panY, {
    toValue: 0,
    duration: 260,
    useNativeDriver: true,
  });

  const handleClose = () => {
    closeAnim.start(() => {
      onClose();
      panY.setValue(0);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 8,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          handleClose();
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

  const benefits = [
    {
      icon: 'laptop-outline',
      title: t('import_discogs_bs_benefit_comfort_title'),
      text: t('import_discogs_bs_why_point1'),
    },
    {
      icon: 'cloud-upload-outline',
      title: t('import_discogs_bs_benefit_background_title'),
      text: t('import_discogs_bs_why_point2'),
    },
    {
      icon: 'shield-checkmark-outline',
      title: t('import_discogs_bs_benefit_safe_title'),
      text: t('import_discogs_bs_why_point3'),
    },
  ];

  const steps = [
    t('import_discogs_bs_how_step1'),
    t('import_discogs_bs_how_step2'),
    t('import_discogs_bs_how_step3'),

  ];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheetWrapper}>
          <Animated.View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: colors.background,
                transform: [{ translateY: panY }],
              },
            ]}
          >
            <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >


              <Text style={[styles.title, { color: colors.text }]}>
                {t('import_discogs_bs_title')}
              </Text>



              <View style={styles.benefitsGrid}>
                {benefits.map((item, index) => (
                  <View key={index} style={styles.benefitCard}>
                    <View style={[styles.benefitIcon, { backgroundColor: `${primaryColor}12` }]}>
                      <Ionicons name={item.icon as any} size={20} color={primaryColor} />
                    </View>

                    <View style={styles.benefitTextContainer}>
                      <Text style={[styles.benefitTitle, { color: colors.text }]}>
                        {item.title}
                      </Text>
                      <Text style={styles.benefitText}>
                        {item.text}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.stepsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('import_discogs_bs_how_title')}
                </Text>

                <View style={styles.stepsList}>
                  {steps.map((step, index) => (
                    <View key={index} style={styles.stepItem}>
                      <View style={[styles.stepNumber, { backgroundColor: primaryColor }]}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </View>


            </ScrollView>

            <SafeAreaView style={styles.buttonContainer}>


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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    width: '100%',
  },
  sheetContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: Dimensions.get('window').height * 0.88,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    paddingTop: 24,
  },
  dragHandleContainer: {
    width: '100%',
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D8D8DE',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 20
  },
  subtitle: {
    fontSize: 15,
    color: '#747480',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  benefitsGrid: {
    gap: 10,
    marginBottom: 26,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F7F7FA',
    borderRadius: 18,
    padding: 14,
  },
  benefitIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  benefitText: {
    fontSize: 13,
    color: '#6F6F7A',
    lineHeight: 18,
  },
  stepsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#555560',
    lineHeight: 21,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F7F7FA',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#777782',
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ECECF0',
  },
  buttonPrimary: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonSecondary: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextSecondary: {
    color: '#777782',
    fontSize: 15,
    fontWeight: '700',
  },
});