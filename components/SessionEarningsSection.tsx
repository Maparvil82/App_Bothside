import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useTheme } from '@react-navigation/native';

export const SessionEarningsSection: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [sessionCount, setSessionCount] = useState<number>(0);

  useEffect(() => {
    if (user) {
      loadSessionEarnings();
    }
  }, [user]);

  const loadSessionEarnings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Obtener todas las sesiones con payment_amount
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('payment_amount, payment_type')
        .eq('user_id', user.id)
        .not('payment_amount', 'is', null);

      if (error) {
        console.error('Error loading session earnings:', error);
        Alert.alert('Error', 'No se pudieron cargar las ganancias de sesiones');
        return;
      }

      // Calcular total de ganancias
      let total = 0;
      if (sessions) {
        sessions.forEach((session) => {
          if (session.payment_amount && session.payment_type !== 'gratis') {
            total += session.payment_amount;
          }
        });
        setSessionCount(sessions.length);
      }

      setTotalEarnings(total);
    } catch (error) {
      console.error('Error processing session earnings:', error);
      Alert.alert('Error', 'No se pudieron procesar las ganancias de sesiones');
    } finally {
      setLoading(false);
    }
  };

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

  if (sessionCount === 0) {
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

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Ionicons name="cash-outline" size={20} color="#34A853" />
        <Text style={[styles.title, { color: colors.text }]}>Ganancias de Sesiones</Text>
      </View>
      <View style={styles.earningsContainer}>
        <Text style={styles.earningsAmount}>{totalEarnings.toFixed(2)} €</Text>
        <Text style={[styles.earningsSubtext, { color: colors.text }]}>
          {sessionCount} {sessionCount === 1 ? 'sesión' : 'sesiones'} con pago
        </Text>
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
  },
});

