import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSessionNoteModal } from '../contexts/SessionNoteContext';
import TimePicker from '../components/TimePicker';
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

  // Estados de validación
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    time?: string;
    amount?: string;
  }>({});

  // Estados para los pickers embebidos (@react-native-community/datetimepicker)
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Estados para hora y minutos (TimePicker personalizado)
  const [startHour, setStartHour] = useState<number>(10);
  const [startMinute, setStartMinute] = useState<number>(0);
  const [endHour, setEndHour] = useState<number>(11);
  const [endMinute, setEndMinute] = useState<number>(0);

  // Sincronizar los Date objects con los strings de formulario (formStartTime / formEndTime)
  useEffect(() => {
    if (formStartTime) {
      const parts = formStartTime.split(':').map(Number);
      if (parts.length === 2) {
        setStartHour(parts[0]);
        setStartMinute(parts[1]);
        const d = new Date();
        d.setHours(parts[0], parts[1], 0, 0);
        setStartDate(d);
      }
    }
  }, [formStartTime]);

  useEffect(() => {
    if (formEndTime) {
      const parts = formEndTime.split(':').map(Number);
      if (parts.length === 2) {
        setEndHour(parts[0]);
        setEndMinute(parts[1]);
        const d = new Date();
        d.setHours(parts[0], parts[1], 0, 0);
        setEndDate(d);
      }
    }
  }, [formEndTime]);

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
      // Inicializar start/end con los valores actuales del picker
      setFormStartTime(`${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`);
      setFormEndTime(`${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`);
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
    setValidationErrors({});
  };

  // Función para validar el formulario
  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    // Validar nombre
    if (!formName.trim()) {
      errors.name = 'El nombre es obligatorio';
    }

    // Validar horario
    if (formStartTime && formEndTime) {
      const [startHours, startMinutes] = formStartTime.split(':').map(Number);
      const [endHours, endMinutes] = formEndTime.split(':').map(Number);
      
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;

      if (endTotalMinutes <= startTotalMinutes) {
        errors.time = 'La hora de fin debe ser posterior a la de inicio';
      }
    }

    // Validar cantidad si aplica
    if (formPaymentType === 'cerrado' || formPaymentType === 'hora') {
      const amount = parseFloat(formPaymentAmount);
      if (!formPaymentAmount || isNaN(amount) || amount <= 0) {
        errors.amount = 'Introduce una cantidad válida';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Función para crear sesión
  const handleCreateSession = async () => {
    if (!user?.id || selectedDay === null) return;

    // Validar formulario
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // Asegurar que tenemos strings formateados HH:MM antes de insertar
      const startTime = formStartTime || `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      const endTime = formEndTime || `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      console.log('Creando sesión - startTime, endTime:', startTime, endTime);

      const sessionDate = formatDateToString(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        selectedDay
      );

      const sessionData: any = {
        user_id: user.id,
        name: formName.trim(),
        date: sessionDate,
        start_time: startTime || null,
        end_time: endTime || null,
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

        // Mostrar feedback y cerrar modal
        if (Platform.OS === 'android') {
          ToastAndroid.show('Sesión creada', ToastAndroid.SHORT);
        }
        handleCloseModal();
        await loadSessions();
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

    // Validar formulario
    if (!validateForm()) {
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

      // Asegurar que tenemos strings formateados HH:MM antes de actualizar
      const startTime = formStartTime || `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      const endTime = formEndTime || `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      console.log('Actualizando sesión - startTime, endTime:', startTime, endTime);

      const updateData: any = {
        name: formName.trim(),
        start_time: startTime || null,
        end_time: endTime || null,
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

        // Mostrar feedback y cerrar modal
        if (Platform.OS === 'android') {
          ToastAndroid.show('Cambios guardados', ToastAndroid.SHORT);
        }
        handleCloseModal();
        await loadSessions();
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
                // Mostrar feedback y cerrar modal
                if (Platform.OS === 'android') {
                  ToastAndroid.show('Sesión eliminada', ToastAndroid.SHORT);
                }
                handleCloseModal();
                await loadSessions();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}edges={['top']}>
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
                  },
                  calendarDay.isCurrentMonth ? styles.dayCellCurrent : styles.dayCellOtherMonth,
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
                      styles.dayNumberOtherMonth,
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

      {/* Modal para crear/editar sesión */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContentWrapper}
            pointerEvents="box-none"
          >
            <View style={styles.modalContent}>
              {/* Encabezado */}
              <View style={styles.modalHeaderNew}>
                <Text style={styles.modalTitleNew}>
                  {selectedSession ? 'Editar sesión' : 'Nueva sesión'}
                </Text>
                <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButtonNew}>
                  <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBodyNew}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Nombre */}
                <View style={styles.formGroupNew}>
                  <Text style={styles.labelNew}>Nombre <Text style={styles.requiredAsterisk}>*</Text></Text>
                  <TextInput
                    style={[
                      styles.inputNew,
                      validationErrors.name ? styles.inputError : null,
                    ]}
                    value={formName}
                    onChangeText={(text) => {
                      setFormName(text);
                      if (validationErrors.name) {
                        setValidationErrors({ ...validationErrors, name: undefined });
                      }
                    }}
                    placeholder="Nombre de la sesión"
                    placeholderTextColor="#999"
                  />
                  {validationErrors.name && (
                    <Text style={styles.errorText}>{validationErrors.name}</Text>
                  )}
                </View>

                {/* Horario: Inicio y Fin lado a lado (TimePicker personalizado) */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <TimePicker
                      label="Hora inicio"
                      hour={startHour}
                      minute={startMinute}
                      onChange={(h, m, f) => {
                        setStartHour(h);
                        setStartMinute(m);
                        // Asegurar el string usado por Supabase (recibimos el formatted directamente)
                        setFormStartTime(f);
                        if (validationErrors.time) setValidationErrors({ ...validationErrors, time: undefined });
                      }}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <TimePicker
                      label="Hora fin"
                      hour={endHour}
                      minute={endMinute}
                      onChange={(h, m, f) => {
                        setEndHour(h);
                        setEndMinute(m);
                        // Asegurar el string usado por Supabase (recibimos el formatted directamente)
                        setFormEndTime(f);
                        if (validationErrors.time) setValidationErrors({ ...validationErrors, time: undefined });
                      }}
                    />
                  </View>
                </View>
                {validationErrors.time && (
                  <Text style={[styles.errorText, { marginBottom: 12 }]}>
                    {validationErrors.time}
                  </Text>
                )}

                {/* Nota rápida */}
                <View style={styles.formGroupNew}>
                  <Text style={styles.labelNew}>Nota rápida</Text>
                  <TextInput
                    style={[styles.inputNew, styles.textAreaNew]}
                    value={formQuickNote}
                    onChangeText={setFormQuickNote}
                    placeholder="Notas adicionales..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                {/* Tag */}
                <View style={styles.formGroupNew}>
                  <Text style={styles.labelNew}>Tag</Text>
                  <TextInput
                    style={styles.inputNew}
                    value={formTag}
                    onChangeText={setFormTag}
                    placeholder="Etiqueta"
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Tipo de pago */}
                <View style={styles.formGroupNew}>
                  <Text style={styles.labelNew}>Tipo de pago</Text>
                  <View style={styles.paymentPickerNew}>
                    {(['gratis', 'cerrado', 'hora'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.paymentOptionNew,
                          formPaymentType === type && styles.paymentOptionSelectedNew,
                        ]}
                        onPress={() => setFormPaymentType(type)}
                      >
                        <Text
                          style={[
                            styles.paymentOptionTextNew,
                            formPaymentType === type && styles.paymentOptionTextSelectedNew,
                          ]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Cantidad (solo si no es gratis) */}
                {(formPaymentType === 'cerrado' || formPaymentType === 'hora') && (
                  <View style={styles.formGroupNew}>
                    <Text style={styles.labelNew}>Cantidad</Text>
                    <TextInput
                      style={[
                        styles.inputNew,
                        validationErrors.amount ? styles.inputError : null,
                      ]}
                      value={formPaymentAmount}
                      onChangeText={(text) => {
                        setFormPaymentAmount(text);
                        if (validationErrors.amount) {
                          setValidationErrors({ ...validationErrors, amount: undefined });
                        }
                      }}
                      placeholder="0.00"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                    />
                    {validationErrors.amount && (
                      <Text style={styles.errorText}>{validationErrors.amount}</Text>
                    )}
                  </View>
                )}

                {/* Espacio para botones */}
                <View style={{ height: 20 }} />
              </ScrollView>

              {/* Botones */}
              <View style={styles.modalButtonsNew}>
                {selectedSession ? (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.buttonPrimaryNew,
                        isSaving || Object.keys(validationErrors).length > 0
                          ? styles.buttonDisabledNew
                          : null,
                      ]}
                      onPress={handleUpdateSession}
                      disabled={isSaving || Object.keys(validationErrors).length > 0}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.buttonTextPrimaryNew}>Guardar cambios</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.buttonSecondaryNew}
                      onPress={handleDeleteSession}
                      disabled={isSaving}
                    >
                      <Text style={styles.buttonTextSecondaryNew}>Eliminar sesión</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.buttonPrimaryNew,
                      isSaving || !formName.trim()
                        ? styles.buttonDisabledNew
                        : null,
                    ]}
                    onPress={handleCreateSession}
                    disabled={isSaving || !formName.trim()}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.buttonTextPrimaryNew}>Crear sesión</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
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
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 0,
    paddingTop: 0,
    justifyContent: 'space-between',
  },
  dayCell: {
    width: '14.28%', // 100% / 7 días
    aspectRatio: 1,
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContentWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
    flex: 1,
    flexDirection: 'column',
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
  
  // ========== NUEVOS ESTILOS DEL MODAL MEJORADO ==========
  modalHeaderNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitleNew: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  modalCloseButtonNew: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  modalBodyNew: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  formGroupNew: {
    marginBottom: 16,
  },
  timeRowNew: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  labelNew: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  requiredAsterisk: {
    color: '#ef4444',
  },
  inputNew: {
    borderWidth: 1,
    borderColor: '#dadada',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    minHeight: 48,
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  textAreaNew: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 6,
    fontWeight: '500',
  },
  paymentPickerNew: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentOptionNew: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#dadada',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  paymentOptionSelectedNew: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  paymentOptionTextNew: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  paymentOptionTextSelectedNew: {
    color: '#fff',
  },
  modalButtonsNew: {
    flexDirection: 'column',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  buttonPrimaryNew: {
    paddingVertical: 16,
    backgroundColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabledNew: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  buttonTextPrimaryNew: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonSecondaryNew: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonTextSecondaryNew: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  dayCellCurrent: {
    backgroundColor: '#f5f5f5',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  dayCellOtherMonth: {
    backgroundColor: '#fafafa',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    opacity: 0.5,
  },
  dayNumberOtherMonth: {
    color: '#b5b5b5',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#DADADA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#F5F5F5',
  },
  timeInputText: {
    fontSize: 16,
    color: '#111',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeColumn: {
    width: '48%',
  },
  timePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  timePicker: {
    height: 120,
    marginTop: -10,
  },
});

