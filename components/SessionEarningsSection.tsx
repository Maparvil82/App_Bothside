import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  DeviceEventEmitter,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { BothsideLoader } from './BothsideLoader';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useTheme, useNavigation } from '@react-navigation/native';
import { formatCurrencyES } from '../src/utils/formatCurrency';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from '../src/i18n/useTranslation';

interface Session {
  id: string;
  date: string;
  name: string;
  payment_amount: number;
  payment_type: string;
}

interface EarningsData {
  realEarnings: number;
  estimatedMonthEarnings: number;
  sessionsCount: number;
  averagePerSession: number;
  lastPaidSession: {
    name: string;
    date: string;
    amountEarned: number;
  } | null;
}

export const SessionEarningsSection: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [earningsData, setEarningsData] = useState<EarningsData>({
    realEarnings: 0,
    estimatedMonthEarnings: 0,
    sessionsCount: 0,
    averagePerSession: 0,
    lastPaidSession: null,
  });
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  const scale = useRef(new Animated.Value(1)).current;
  const monthLabel = React.useMemo(() => {
    const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long' });
    const name = formatter.format(new Date());
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, []);
  const cardTitleText = t('session_earnings_title').replace('{0}', monthLabel);

  const handlePress = () => {
    console.log('🔀 Navegando a DjStatsDashboard desde SessionEarningsSection');
    navigation.navigate('DjStatsDashboard');
  };

  const loadSessionEarnings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Obtener todas las sesiones con payment_amount, incluyendo fecha y nombre
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, date, name, payment_amount, payment_type')
        .eq('user_id', user.id)
        .not('payment_amount', 'is', null)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error loading session earnings:', error);
        Alert.alert(t('common_error'), t('session_earnings_error_load'));
        return;
      }

      if (!sessions || sessions.length === 0) {
        setEarningsData({
          realEarnings: 0,
          estimatedMonthEarnings: 0,
          sessionsCount: 0,
          averagePerSession: 0,
          lastPaidSession: null,
        });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // Función auxiliar para verificar si una sesión es del mes actual
      const isCurrentMonth = (dateString: string): boolean => {
        const sessionDate = new Date(dateString);
        return (
          sessionDate.getMonth() === currentMonth &&
          sessionDate.getFullYear() === currentYear
        );
      };

      // Filtrar sesiones válidas (con payment_type válido y payment_amount)
      const validSessions = sessions.filter((session) => {
        return (
          session.payment_type &&
          session.payment_type !== 'gratis' &&
          session.payment_amount &&
          session.payment_amount > 0
        );
      });

      // Filtrar solo sesiones pasadas (fecha < hoy)
      const pastSessions = validSessions.filter((session) => {
        const sessionDate = new Date(session.date);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate < today;
      });

      // Calcular ganancias reales (solo sesiones pasadas)
      let realEarnings = 0;
      pastSessions.forEach((session) => {
        if (session.payment_amount) {
          realEarnings += session.payment_amount;
        }
      });

      // Filtrar sesiones del mes actual (pasadas + futuras dentro del mismo mes)
      const currentMonthSessions = validSessions.filter((session) => {
        return isCurrentMonth(session.date);
      });

      // Calcular ganancias estimadas del mes actual (pasadas + futuras)
      let estimatedMonthEarnings = 0;
      currentMonthSessions.forEach((session) => {
        if (session.payment_amount) {
          estimatedMonthEarnings += session.payment_amount;
        }
      });

      // Contar sesiones con pago (solo pasadas)
      const sessionsCount = pastSessions.length;

      // Calcular promedio por sesión (basado en sesiones pasadas)
      const averagePerSession =
        sessionsCount > 0 ? realEarnings / sessionsCount : 0;

      // Encontrar la última sesión pagada
      let lastPaidSession: {
        name: string;
        date: string;
        amountEarned: number;
      } | null = null;

      const paidSessions = pastSessions.filter(
        (s) => s.payment_amount && s.payment_amount > 0
      );
      if (paidSessions.length > 0) {
        const lastSession = paidSessions[0]; // Ya están ordenadas por fecha descendente
        lastPaidSession = {
          name: lastSession.name,
          date: lastSession.date,
          amountEarned: lastSession.payment_amount || 0,
        };
      }

      setEarningsData({
        realEarnings,
        estimatedMonthEarnings,
        sessionsCount,
        averagePerSession,
        lastPaidSession,
      });
    } catch (error) {
      console.error('Error processing session earnings:', error);
      Alert.alert(t('common_error'), t('session_earnings_error_process'));
    } finally {
      setLoading(false);
    }
  };

  // Cargar una vez cuando haya usuario
  useEffect(() => {
    if (user) {
      loadSessionEarnings();
    }
  }, [user]);

  // Recargar cada vez que la pantalla está en foco
  useEffect(() => {
    if (isFocused && user) {
      loadSessionEarnings();
    }
  }, [isFocused, user]);

  // Escuchar eventos globales de actualización de sesiones
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('sessionsUpdated', () => {
      if (user) {
        loadSessionEarnings();
      }
    });

    return () => {
      sub.remove();
    };
  }, [user]);

  if (loading) {
    return (
      <View style={styles.outerContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={() => {
            Animated.spring(scale, {
              toValue: 0.97,
              useNativeDriver: true,
              speed: 40,
              bounciness: 6,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
              speed: 40,
              bounciness: 6,
            }).start();
          }}
          onPress={handlePress}
        >
          <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
            <View style={styles.innerGradientLayer}>
              <View style={styles.headerRow}>
                <Ionicons name="cash-outline" size={20} color="#ffffff" />
                <Text style={styles.cardTitle}>{cardTitleText}</Text>
              </View>
              <View style={styles.loadingContainer}>
                <BothsideLoader size="small" fullscreen={false} />
                <Text style={styles.loadingText}>{t('session_earnings_loading')}</Text>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  }

  if (earningsData.sessionsCount === 0) {
    return (
      <View style={styles.outerContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={() => {
            Animated.spring(scale, {
              toValue: 0.97,
              useNativeDriver: true,
              speed: 40,
              bounciness: 6,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
              speed: 40,
              bounciness: 6,
            }).start();
          }}
          onPress={handlePress}
        >
          <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
            <View style={styles.innerGradientLayer}>

              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('session_earnings_empty_title')}</Text>
                <Text style={styles.emptySubtext}>
                  {t('session_earnings_empty_text')}
                </Text>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  }

  // Formatear fecha de última sesión
  const formatLastSessionDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <View style={styles.outerContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={() => {
          Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 40,
            bounciness: 6,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 40,
            bounciness: 6,
          }).start();
        }}
        onPress={handlePress}
      >
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={styles.innerGradientLayer}>
            <View style={styles.headerRow}>

              <Text style={styles.cardTitle}>{cardTitleText}</Text>
            </View>
            <View style={styles.earningsContainer}>
              <View style={styles.earningsColumn}>
                <Text style={styles.earningsAmount}>
                  {formatCurrencyES(earningsData.realEarnings)}
                </Text>
                <Text style={styles.earningsLabel}>{t('session_earnings_earned_month')}</Text>
              </View>
              <View style={styles.earningsColumn}>
                <Text style={styles.earningsAmount}>
                  {formatCurrencyES(earningsData.estimatedMonthEarnings)}
                </Text>
                <Text style={styles.earningsLabel}>{t('session_earnings_estimated_month')}</Text>
              </View>
            </View>

            <Text style={styles.statsButtonText}>{t('session_earnings_view_stats')}</Text>

          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
    backgroundColor: '#1c1c1c',
  },
  innerGradientLayer: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1c',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    color: '#4A4A4A',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    color: 'rgba(0,0,0,0.45)',
  },
  earningsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 20,
  },
  earningsColumn: {
    flex: 1,
    alignItems: 'center',
  },
  earningsAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    color: '#ffffff',
  },
  lastSessionText: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 10,
    color: 'rgba(0,0,0,0.45)',
  },
  statsButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    alignSelf: 'center',
  },
  statsButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    marginTop: 16,
  },
});

