import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const CELL_WIDTH = width / 7;

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isNextMonth?: boolean;
  isPreviousMonth?: boolean;
}

interface Session {
  id: string;
  user_id: string;
  date: string;
  name: string;
  start_time: string;
  created_at?: string;
}

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  // Estado para la fecha actual (primer día del mes)
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Estado para las sesiones del mes
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Función para ir al mes siguiente
  const goToNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  // Función para ir al mes anterior
  const goToPreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  // Función para obtener el nombre del mes en español
  const getMonthName = (date: Date): string => {
    const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    // Capitalizar la primera letra
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  // Función para obtener el número de días de un mes
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Función para obtener el día de la semana (lunes=1, domingo=7)
  const getFirstDayOfWeek = (date: Date): number => {
    const day = date.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
    return day === 0 ? 7 : day; // Convertir domingo de 0 a 7
  };

  // Función para obtener el rango del mes actual
  const getMonthRange = (date: Date): { startOfMonth: Date; endOfMonth: Date } => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Primer día del mes (00:00:00)
    const startOfMonth = new Date(year, month, 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Último día del mes (23:59:59)
    const endOfMonth = new Date(year, month + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    return { startOfMonth, endOfMonth };
  };

  // Función para formatear la hora a HH:MM
  const formatTime = (timeString: string): string => {
    try {
      // Si el formato es HH:MM:SS o similar, tomar solo HH:MM
      const time = timeString.split(':');
      return `${time[0]}:${time[1]}`;
    } catch (error) {
      return timeString;
    }
  };

  // Función para obtener el día del mes de una fecha
  const getDayFromDate = (dateString: string): number => {
    const date = new Date(dateString);
    return date.getDate();
  };

  // Función para verificar si una fecha pertenece al mes actual
  const isDateInCurrentMonth = (dateString: string, currentMonth: Date): boolean => {
    const date = new Date(dateString);
    return date.getFullYear() === currentMonth.getFullYear() &&
           date.getMonth() === currentMonth.getMonth();
  };

  // Cargar sesiones del mes desde Supabase
  useEffect(() => {
    const loadSessions = async () => {
      if (!user?.id) return;

      setLoadingSessions(true);
      try {
        const { startOfMonth, endOfMonth } = getMonthRange(currentDate);
        
        // Convertir fechas a formato ISO para Supabase
        const startISO = startOfMonth.toISOString();
        const endISO = endOfMonth.toISOString();

        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startISO.split('T')[0]) // Comparar solo la parte de la fecha
          .lte('date', endISO.split('T')[0])
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) {
          console.error('Error al cargar sesiones:', error);
          setSessions([]);
        } else {
          setSessions(data || []);
        }
      } catch (error) {
        console.error('Error al cargar sesiones:', error);
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    };

    loadSessions();
  }, [currentDate, user?.id]);

  // Generar la cuadrícula de días del calendario
  const generateCalendarDays = (): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Información del mes actual
    const daysInCurrentMonth = getDaysInMonth(currentDate);
    const firstDayOfWeek = getFirstDayOfWeek(currentDate);
    
    // Información del mes anterior (para rellenar huecos al inicio)
    const previousMonth = new Date(year, month - 1, 1);
    const daysInPreviousMonth = getDaysInMonth(previousMonth);
    
    // Información del mes siguiente (para rellenar huecos al final)
    const nextMonth = new Date(year, month + 1, 1);
    
    // Rellenar días del mes anterior (huecos al inicio)
    const startOffset = firstDayOfWeek - 1; // Número de huecos antes del día 1
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        day: daysInPreviousMonth - i,
        isCurrentMonth: false,
        isPreviousMonth: true,
      });
    }
    
    // Añadir días del mes actual
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
      });
    }
    
    // Rellenar días del mes siguiente (huecos al final hasta completar 42 días)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isNextMonth: true,
      });
    }
    
    return days;
  };

  // Memoizar la generación del calendario para evitar recalcular en cada render
  const calendarDays = useMemo(() => generateCalendarDays(), [currentDate]);
  const monthName = useMemo(() => getMonthName(currentDate), [currentDate]);
  
  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Cabecera del mes */}
        <View style={styles.monthHeader}>
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={goToPreviousMonth}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {monthName}
          </Text>
          
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={goToNextMonth}
          >
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Fila de días de la semana */}
        <View style={styles.weekDaysRow}>
          {weekDays.map((day, index) => (
            <View key={index} style={[styles.weekDayCell, { width: CELL_WIDTH }]}>
              <Text style={[styles.weekDayText, { color: colors.text }]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Cuadrícula del calendario */}
        {loadingSessions ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.calendarGrid}>
            {calendarDays.map((calendarDay, index) => {
              // Obtener sesiones para este día (solo si es del mes actual)
              const daySessions = calendarDay.isCurrentMonth 
                ? sessions.filter(session => {
                    const sessionDay = getDayFromDate(session.date);
                    return sessionDay === calendarDay.day && 
                           isDateInCurrentMonth(session.date, currentDate);
                  })
                : [];

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    { 
                      width: CELL_WIDTH,
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }
                  ]}
                  onPress={() => {
                    // TODO: Lógica para manejar clic en día
                    if (calendarDay.isCurrentMonth) {
                      console.log('Día seleccionado:', calendarDay.day);
                    }
                  }}
                  disabled={!calendarDay.isCurrentMonth}
                >
                  {calendarDay.isCurrentMonth && (
                    <>
                      <Text 
                        style={[
                          styles.dayNumber,
                          { color: colors.text }
                        ]}
                      >
                        {calendarDay.day}
                      </Text>
                      {/* Mostrar tarjetas verdes para sesiones */}
                      {daySessions.length > 0 && (
                        <View style={styles.sessionsContainer}>
                          {daySessions.map((session) => (
                            <View 
                              key={session.id} 
                              style={[styles.sessionCard, { backgroundColor: '#d1fae5' }]}
                            >
                              <Text style={styles.sessionName} numberOfLines={1}>
                                {session.name}
                              </Text>
                              <Text style={styles.sessionTime}>
                                {formatTime(session.start_time)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                  {!calendarDay.isCurrentMonth && (
                    <Text 
                      style={[
                        styles.dayNumber,
                        { 
                          color: colors.text + '40', // Opacidad reducida para días fuera del mes
                        }
                      ]}
                    >
                      {calendarDay.day}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  monthButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  weekDayCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  dayCell: {
    height: (width * 0.9) / 6, // Altura proporcional para 6 filas
    borderBottomWidth: 1,
    borderRightWidth: 1,
    padding: 8,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  sessionsContainer: {
    width: '100%',
    marginTop: 4,
    gap: 2,
  },
  sessionCard: {
    padding: 4,
    borderRadius: 4,
    marginBottom: 2,
  },
  sessionName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 9,
    color: '#047857',
    fontWeight: '500',
  },
});

