import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSessionNoteModal } from '../contexts/SessionNoteContext';
import {
  requestNotificationPermissions,
  scheduleNotificationsForSession,
  cancelSessionNotifications,
  getSessionNotificationIds,
  setupNotificationCategories,
  scheduleSnoozeNotification,
} from '../services/notifications';

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
  end_time?: string;
  quick_note?: string;
  tag?: string;
  payment_type?: 'cerrado' | 'hora' | 'gratis';
  payment_amount?: number;
  created_at?: string;
}

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { openSessionNoteModal } = useSessionNoteModal();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  
  // Estado para la fecha actual (primer día del mes)
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Estado para las sesiones del mes
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Estado para las notas por sesión
  const [notesBySessionId, setNotesBySessionId] = useState<Record<string, any[]>>({});

  // Estados para el modal
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Estados del formulario
  const [formName, setFormName] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formQuickNote, setFormQuickNote] = useState('');
  const [formTag, setFormTag] = useState('');
  const [formPaymentType, setFormPaymentType] = useState<'cerrado' | 'hora' | 'gratis'>('gratis');
  const [formPaymentAmount, setFormPaymentAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  // Función para formatear fecha a YYYY-MM-DD
  const formatDateToString = (year: number, month: number, day: number): string => {
    const date = new Date(year, month, day);
    const yearStr = date.getFullYear();
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${yearStr}-${monthStr}-${dayStr}`;
  };

  // Función para abrir el modal al pulsar un día
  const handleDayPress = (day: number) => {
    if (!user?.id) return;

    setSelectedDay(day);
    
    // Buscar si existe una sesión para este día
    const sessionDate = formatDateToString(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    
    const existingSession = sessions.find(session => {
      const sessionDay = getDayFromDate(session.date);
      return sessionDay === day && isDateInCurrentMonth(session.date, currentDate);
    });

    if (existingSession) {
      setSelectedSession(existingSession);
      // Rellenar el formulario con los datos de la sesión
      setFormName(existingSession.name || '');
      setFormStartTime(existingSession.start_time || '');
      setFormEndTime(existingSession.end_time || '');
      setFormQuickNote(existingSession.quick_note || '');
      setFormTag(existingSession.tag || '');
      setFormPaymentType(existingSession.payment_type || 'gratis');
      setFormPaymentAmount(existingSession.payment_amount?.toString() || '');
    } else {
      setSelectedSession(null);
      // Limpiar el formulario
      setFormName('');
      setFormStartTime('');
      setFormEndTime('');
      setFormQuickNote('');
      setFormTag('');
      setFormPaymentType('gratis');
      setFormPaymentAmount('');
    }

    setIsModalVisible(true);
  };

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedDay(null);
    setSelectedSession(null);
    // Limpiar formulario
    setFormName('');
    setFormStartTime('');
    setFormEndTime('');
    setFormQuickNote('');
    setFormTag('');
    setFormPaymentType('gratis');
    setFormPaymentAmount('');
  };

  // Función para crear sesión
  const handleCreateSession = async () => {
    if (!user?.id || selectedDay === null) return;
    if (!formName.trim()) {
      Alert.alert('Error', 'El nombre de la sesión es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      const sessionDate = formatDateToString(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        selectedDay
      );

      const sessionData: any = {
        user_id: user.id,
        name: formName.trim(),
        date: sessionDate,
        start_time: formStartTime || null,
        end_time: formEndTime || null,
        quick_note: formQuickNote.trim() || null,
        tag: formTag.trim() || null,
        payment_type: formPaymentType || null,
      };

      if (formPaymentType === 'cerrado' || formPaymentType === 'hora') {
        const amount = parseFloat(formPaymentAmount);
        if (!isNaN(amount)) {
          sessionData.payment_amount = amount;
        }
      }

      const { data: insertedData, error } = await supabase
        .from('sessions')
        .insert([sessionData])
        .select()
        .single();

      if (error) {
        console.error('Error al crear sesión:', error);
        Alert.alert('Error', 'No se pudo crear la sesión');
      } else {
        // Programar notificaciones para la sesión creada
        if (insertedData) {
          const notificationIds = await scheduleNotificationsForSession(insertedData);
          console.log('Notificaciones programadas:', notificationIds);
        }

        handleCloseModal();
        await loadSessions();
        Alert.alert('Éxito', 'Sesión creada correctamente');
      }
    } catch (error) {
      console.error('Error al crear sesión:', error);
      Alert.alert('Error', 'No se pudo crear la sesión');
    } finally {
      setIsSaving(false);
    }
  };

  // Función para actualizar sesión
  const handleUpdateSession = async () => {
    if (!selectedSession) return;
    if (!formName.trim()) {
      Alert.alert('Error', 'El nombre de la sesión es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      // Obtener IDs de notificaciones previas desde AsyncStorage
      const prevNotificationIds = await getSessionNotificationIds(selectedSession.id);
      
      // Cancelar notificaciones previas
      await cancelSessionNotifications({
        ...selectedSession,
        notification_48h_id: prevNotificationIds.notification_48h_id || undefined,
        notification_post_id: prevNotificationIds.notification_post_id || undefined,
      });

      const updateData: any = {
        name: formName.trim(),
        start_time: formStartTime || null,
        end_time: formEndTime || null,
        quick_note: formQuickNote.trim() || null,
        tag: formTag.trim() || null,
        payment_type: formPaymentType || null,
      };

      if (formPaymentType === 'cerrado' || formPaymentType === 'hora') {
        const amount = parseFloat(formPaymentAmount);
        if (!isNaN(amount)) {
          updateData.payment_amount = amount;
        } else {
          updateData.payment_amount = null;
        }
      } else {
        updateData.payment_amount = null;
      }

      const { data: updatedData, error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', selectedSession.id)
        .select()
        .single();

      if (error) {
        console.error('Error al actualizar sesión:', error);
        Alert.alert('Error', 'No se pudo actualizar la sesión');
      } else {
        // Programar nuevas notificaciones con los datos actualizados
        if (updatedData) {
          const notificationIds = await scheduleNotificationsForSession(updatedData);
          console.log('Notificaciones reprogramadas:', notificationIds);
        }

        handleCloseModal();
        await loadSessions();
        Alert.alert('Éxito', 'Sesión actualizada correctamente');
      }
    } catch (error) {
      console.error('Error al actualizar sesión:', error);
      Alert.alert('Error', 'No se pudo actualizar la sesión');
    } finally {
      setIsSaving(false);
    }
  };

  // Función para eliminar sesión
  const handleDeleteSession = async () => {
    if (!selectedSession) return;

    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar esta sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              // Obtener IDs de notificaciones desde AsyncStorage
              const notificationIds = await getSessionNotificationIds(selectedSession.id);
              
              // Cancelar notificaciones
              await cancelSessionNotifications({
                ...selectedSession,
                notification_48h_id: notificationIds.notification_48h_id || undefined,
                notification_post_id: notificationIds.notification_post_id || undefined,
              });

              const { error } = await supabase
                .from('sessions')
                .delete()
                .eq('id', selectedSession.id);

              if (error) {
                console.error('Error al eliminar sesión:', error);
                Alert.alert('Error', 'No se pudo eliminar la sesión');
              } else {
                handleCloseModal();
                await loadSessions();
                Alert.alert('Éxito', 'Sesión eliminada correctamente');
              }
            } catch (error) {
              console.error('Error al eliminar sesión:', error);
              Alert.alert('Error', 'No se pudo eliminar la sesión');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  // Función para cargar sesiones del mes desde Supabase
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

  // Función para cargar notas agrupadas por session_id
  const loadNotesBySession = async () => {
    if (!user?.id) return;

    try {
      const { startOfMonth, endOfMonth } = getMonthRange(currentDate);
      
      // Convertir fechas a formato ISO
      const startISO = startOfMonth.toISOString().split('T')[0];
      const endISO = endOfMonth.toISOString().split('T')[0];

      // Cargar todas las notas del mes actual
      const { data: notes, error } = await supabase
        .from('session_notes')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error al cargar notas:', error);
        setNotesBySessionId({});
        return;
      }

      // Agrupar notas por session_id
      const groupedNotes: Record<string, any[]> = {};
      if (notes && notes.length > 0) {
        notes.forEach((note) => {
          const sessionId = note.session_id;
          if (!groupedNotes[sessionId]) {
            groupedNotes[sessionId] = [];
          }
          groupedNotes[sessionId].push(note);
        });
      }

      setNotesBySessionId(groupedNotes);
    } catch (error) {
      console.error('Error al cargar notas:', error);
      setNotesBySessionId({});
    }
  };

  // Configurar notificaciones al montar el componente
  useEffect(() => {
    // Configurar categorías de notificaciones
    setupNotificationCategories();

    // Solicitar permisos
    requestNotificationPermissions();

    // Listener para cuando se recibe una notificación mientras la app está en foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notificación recibida:', notification);
    });

    // Listener para cuando el usuario interactúa con una notificación (incluyendo acciones)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { notification } = response;
      const { data } = notification.request.content;
      const actionIdentifier = response.actionIdentifier;

      console.log('Respuesta a notificación:', { actionIdentifier, data });

      // Manejar acciones de la notificación de 48h
      if (data?.type === '48h_before' || data?.type === 'snooze') {
        if (actionIdentifier === 'prepare_now') {
          // Navegar a la pantalla de calendario o mostrar detalles
          console.log('Preparar ahora - Sesión:', data.sessionId);
          // TODO: Navegar a la pantalla de detalles de la sesión
          // navigation.navigate('Calendar' as never);
        } else if (actionIdentifier === 'snooze_2h') {
          // Programar snooze de 2 horas
          // Obtener nombre de la sesión desde la notificación o cargar desde Supabase
          const sessionName = notification.request.content.body?.split('"')[1] || 'Sesión';
          const sessionId = data.sessionId as string;
          await scheduleSnoozeNotification(sessionId, sessionName, 2);
        } else if (actionIdentifier === 'snooze_4h') {
          // Programar snooze de 4 horas
          const sessionName = notification.request.content.body?.split('"')[1] || 'Sesión';
          const sessionId = data.sessionId as string;
          await scheduleSnoozeNotification(sessionId, sessionName, 4);
        } else if (actionIdentifier === 'snooze_8h') {
          // Programar snooze de 8 horas
          const sessionName = notification.request.content.body?.split('"')[1] || 'Sesión';
          const sessionId = data.sessionId as string;
          await scheduleSnoozeNotification(sessionId, sessionName, 8);
        }
      }

      // Manejar notificación post-sesión - Abrir modal para dejar nota
      if (data?.type === 'post_session_note') {
        console.log('Notificación post-sesión - Sesión:', data.session_id);
        const sessionId = data.session_id as string;
        if (sessionId) {
          openSessionNoteModal(sessionId);
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Cargar sesiones del mes desde Supabase
  useEffect(() => {
    loadSessions();
    loadNotesBySession();
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
                    if (calendarDay.isCurrentMonth) {
                      handleDayPress(calendarDay.day);
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
                          {daySessions.map((session) => {
                            const hasNotes = notesBySessionId[session.id] !== undefined;
                            
                            return (
                              <View 
                                key={session.id}
                              >
                                <View 
                                  style={[styles.sessionCard, { backgroundColor: '#d1fae5' }]}
                                >
                                  <Text style={styles.sessionName} numberOfLines={1}>
                                    {session.name}
                                  </Text>
                                  <Text style={styles.sessionTime}>
                                    {formatTime(session.start_time)}
                                  </Text>
                                </View>
                                {/* Indicador de nota si existe */}
                                {hasNotes && (
                                  <View
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: 3,
                                      backgroundColor: '#6BFF9C',
                                      alignSelf: 'center',
                                      marginTop: 4,
                                    }}
                                  />
                                )}
                              </View>
                            );
                          })}
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

      {/* Modal para crear/editar sesión */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedSession ? 'Editar sesión' : 'Nueva sesión'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Nombre */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Nombre *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Nombre de la sesión"
                  placeholderTextColor={colors.text + '60'}
                />
              </View>

              {/* Hora de inicio */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Hora de inicio</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formStartTime}
                  onChangeText={setFormStartTime}
                  placeholder="HH:MM (ej: 10:00)"
                  placeholderTextColor={colors.text + '60'}
                />
              </View>

              {/* Hora de fin */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Hora de fin</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formEndTime}
                  onChangeText={setFormEndTime}
                  placeholder="HH:MM (ej: 12:00)"
                  placeholderTextColor={colors.text + '60'}
                />
              </View>

              {/* Nota rápida */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Nota rápida</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formQuickNote}
                  onChangeText={setFormQuickNote}
                  placeholder="Notas adicionales..."
                  placeholderTextColor={colors.text + '60'}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Tag */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Tag</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formTag}
                  onChangeText={setFormTag}
                  placeholder="Etiqueta"
                  placeholderTextColor={colors.text + '60'}
                />
              </View>

              {/* Tipo de pago */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Tipo de pago</Text>
                <View style={styles.pickerContainer}>
                  {(['cerrado', 'hora', 'gratis'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.pickerOption,
                        formPaymentType === type && styles.pickerOptionSelected,
                        { borderColor: colors.border }
                      ]}
                      onPress={() => setFormPaymentType(type)}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        { color: formPaymentType === type ? '#ffffff' : colors.text }
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Cantidad (si es cerrado o hora) */}
              {(formPaymentType === 'cerrado' || formPaymentType === 'hora') && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Cantidad</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={formPaymentAmount}
                    onChangeText={setFormPaymentAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.text + '60'}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}

              {/* Botones */}
              <View style={styles.modalButtons}>
                {selectedSession ? (
                  <>
                    <TouchableOpacity
                      style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
                      onPress={handleUpdateSession}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.buttonText}>Guardar cambios</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.deleteButton, { backgroundColor: '#dc3545' }]}
                      onPress={handleDeleteSession}
                      disabled={isSaving}
                    >
                      <Text style={styles.buttonText}>Eliminar sesión</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={handleCreateSession}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.buttonText}>Crear sesión</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#1f2937',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtons: {
    marginTop: 20,
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

