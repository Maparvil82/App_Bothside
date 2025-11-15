import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useTheme } from '@react-navigation/native';
import { formatCurrencyES } from '../src/utils/formatCurrency';
import { useIsFocused } from '@react-navigation/native';

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
  const { user } = useAuth();
  const { colors } = useTheme();
  const [earningsData, setEarningsData] = useState<EarningsData>({
    realEarnings: 0,
    estimatedMonthEarnings: 0,
    sessionsCount: 0,
    averagePerSession: 0,
    lastPaidSession: null,
  });
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

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
        Alert.alert('Error', 'No se pudieron cargar las ganancias de sesiones');
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
      Alert.alert('Error', 'No se pudieron procesar las ganancias de sesiones');
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
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <Ionicons name="cash-outline" size={20} color="#34A853" />
          <Text style={[styles.title, { color: colors.text }]}>Ganancias de Sesiones</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#34A853" />
          <Text style={[styles.loadingText, { color: colors.text }]}>Cargando ganancias...</Text>
        </View>
      </View>
    );
  }

  if (earningsData.sessionsCount === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <Ionicons name="cash-outline" size={20} color="#34A853" />
          <Text style={[styles.title, { color: colors.text }]}>Ganancias de Sesiones</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cash-outline" size={24} color="#9CA3AF" />
          <Text style={[styles.emptyText, { color: colors.text }]}>No hay ganancias registradas</Text>
          <Text style={[styles.emptySubtext, { color: colors.text }]}>
            Las ganancias de tus sesiones aparecerán aquí
          </Text>
        </View>
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
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Ionicons name="cash-outline" size={20} color="#34A853" />
        <Text style={[styles.title, { color: colors.text }]}>Ganancias de Sesiones</Text>
      </View>
      <View style={styles.earningsContainer}>
        <Text style={styles.earningsAmount}>
          {formatCurrencyES(earningsData.realEarnings)}
        </Text>
        <Text style={[styles.earningsSubtext, { color: colors.text }]}>
          Estimado del mes: {formatCurrencyES(earningsData.estimatedMonthEarnings)}
        </Text>
        <Text style={[styles.earningsSubtext, { color: colors.text }]}>
          {earningsData.sessionsCount}{' '}
          {earningsData.sessionsCount === 1 ? 'sesión' : 'sesiones'} · media{' '}
          {formatCurrencyES(earningsData.averagePerSession)} por sesión
        </Text>
        {earningsData.lastPaidSession && (
          <Text style={[styles.lastSessionText, { color: colors.text }]}>
            Última sesión: {earningsData.lastPaidSession.name} —{' '}
            {formatCurrencyES(earningsData.lastPaidSession.amountEarned)} —{' '}
            {formatLastSessionDate(earningsData.lastPaidSession.date)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
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
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  earningsContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#34A853',
    marginBottom: 4,
  },
  earningsSubtext: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 4,
  },
  lastSessionText: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 6,
    opacity: 0.7,
  },
});

