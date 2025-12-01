import React, { useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColorForTag } from '../src/utils/getColorForTag';
import { activeLocale as currentLanguage } from '../src/i18n';

interface Session {
  id: string;
  user_id: string;
  date: string;
  name: string;
  start_time: string;
  end_time?: string;
  quick_note?: string;
  tag?: string;
  payment_type?: 'cerrado' | 'hora' | 'gratis';
  payment_amount?: number;
  created_at?: string;
}

interface SessionsListViewProps {
  sessions: Session[];
  onSessionPress: (session: Session) => void;
}

export default function SessionsListView({ sessions, onSessionPress }: SessionsListViewProps) {
  // Formatear fecha a "Jueves, 29 nov"
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const locale = currentLanguage === "en" ? "en-US" : "es-ES";

    return date.toLocaleDateString(locale, {
      weekday: "long",
      day: "2-digit",
      month: "short",
    });
  };

  // Formatear hora a "19:00 – 22:00"
  const formatTime = (startTime: string, endTime?: string): string => {
    if (!startTime) return '';
    const start = startTime.split(':').slice(0, 2).join(':');
    if (!endTime) return start;
    const end = endTime.split(':').slice(0, 2).join(':');
    return `${start} – ${end}`;
  };

  // Formatear precio
  const formatPrice = (paymentType?: string, amount?: number): string => {
    if (!paymentType || paymentType === 'gratis') return '';
    if (paymentType === 'cerrado' || paymentType === 'hora') {
      return amount ? `${amount}€` : '';
    }
    return '';
  };

  // Memoizar sesiones ordenadas (ya deberían estarlo desde el query, pero aseguramos)
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.start_time || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.start_time || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [sessions]);

  const renderSessionCard = ({ item }: { item: Session }) => {
    const formattedDate = formatDate(item.date);
    const formattedTime = formatTime(item.start_time, item.end_time);
    const price = formatPrice(item.payment_type, item.payment_amount);
    const bgColor = getColorForTag(item.tag);

    return (
      <TouchableOpacity
        style={[
          styles.sessionCard,
          {
            backgroundColor: bgColor,
            borderColor: bgColor,
          },
        ]}
        onPress={() => onSessionPress(item)}
        activeOpacity={0.7}
      >
        {/* Fecha */}
        <Text style={styles.dateText}>{formattedDate}</Text>

        {/* Nombre y horario */}
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionName} numberOfLines={1}>
            {item.name || 'Sin nombre'}
          </Text>
          {formattedTime && (
            <Text style={styles.timeText}>{formattedTime}</Text>
          )}
        </View>

        {/* Tag y precio */}
        <View style={styles.bottomRow}>
          {item.tag && (
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{item.tag}</Text>
            </View>
          )}
          {price && (
            <Text style={styles.priceText}>{price}</Text>
          )}
        </View>

        {/* Icono de flecha */}
        <Ionicons
          name="chevron-forward"
          size={20}
          color="#1B1B1B"
          style={styles.chevronIcon}
        />
      </TouchableOpacity>
    );
  };

  const emptyListComponent = (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={48} color="#CCC" />
      <Text style={styles.emptyText}>No hay sesiones próximas</Text>
    </View>
  );

  return (
    <FlatList
      data={sortedSessions}
      renderItem={renderSessionCard}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={emptyListComponent}
      scrollEnabled={true}
      showsVerticalScrollIndicator={true}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  sessionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#1B1B1B',
    fontWeight: '500',
    marginBottom: 4,
    width: 80,
  },
  sessionInfo: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B1B1B',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 13,
    color: '#1B1B1B',
    fontWeight: '400',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  tagPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#1B1B1B',
    fontWeight: '500',
  },
  priceText: {
    fontSize: 13,
    color: '#34A853',
    fontWeight: '600',
  },
  chevronIcon: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    fontWeight: '500',
  },
});
