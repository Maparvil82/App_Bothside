import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';

// Configurar el handler de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Solicitar permisos de notificaciones
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error al solicitar permisos de notificaciones:', error);
    return false;
  }
}

// Función para programar notificaciones de una sesión
export async function scheduleNotificationsForSession(session: {
  id: string;
  date: string;
  start_time: string;
  end_time?: string;
  name: string;
  notification_48h_id?: string;
  notification_post_id?: string;
}, userName?: string): Promise<{ notification_48h_id: string | null; notification_post_id: string | null }> {
  try {
    // Verificar permisos
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('No se tienen permisos para notificaciones');
      return { notification_48h_id: null, notification_post_id: null };
    }

    // Calcular nombre seguro del usuario y sesión
    const displayName = userName || 'Tu';
    const sessionName = session.name || 'tu sesión';

    // Cancelar notificaciones previas si existen
    if (session.notification_48h_id) {
      await Notifications.cancelScheduledNotificationAsync(session.notification_48h_id);
    }
    if (session.notification_post_id) {
      await Notifications.cancelScheduledNotificationAsync(session.notification_post_id);
    }

    // Parsear fecha y hora de inicio
    const sessionDate = new Date(session.date);
    const [startHours, startMinutes] = session.start_time.split(':').map(Number);
    const sessionStartDateTime = new Date(sessionDate);
    sessionStartDateTime.setHours(startHours, startMinutes || 0, 0, 0);

    // Decidir comportamiento según el flag de configuración
    let notification48hId: string | null = null;
    let notificationPostId: string | null = null;

    if (ENV.NOTIFICATIONS_TEST_MODE) {
      // En modo test programamos notificaciones a 30s y 60s desde ahora
      try {
        const notifPreview = new Date(Date.now() + 30000); // 30 segundos
        const notifPost = new Date(Date.now() + 60000); // 60 segundos

        notification48hId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🎧 ${displayName}, tu próxima sesión está cerca`,
            body: `En dos días pinchas en "${sessionName}" ¿te ayudo a preparar la maleta?.`,
            data: {
              sessionId: session.id,
              type: '48h_before_test',
            },
            categoryIdentifier: 'session_48h',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notifPreview },
        });

        // Solo programar post si session.end_time existe (mantener lógica original)
        if (session.end_time) {
          notificationPostId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `¿Cómo te fué en "${sessionName}"?`,
              body: `${displayName}, cuéntame ¿tu sesión en "${sessionName}" fué lo que esperabas?.`,
              data: {
                type: 'post_session_note_test',
                session_id: session.id,
              },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notifPost },
          });
        }
      } catch (err) {
        console.error('Error al programar notificaciones en TEST MODE:', err);
      }
    } else {
      // Comportamiento normal: 48h antes y 1h después (si hay end_time)
      try {
        // Calcular fecha de notificación 48h antes
        const notification48hDate = new Date(sessionStartDateTime);
        notification48hDate.setHours(notification48hDate.getHours() - 48);

        if (notification48hDate > new Date()) {
          notification48hId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `🎧 ${displayName}, tu próxima sesión está cerca`,
              body: `En dos días pinchas en "${sessionName}" ¿te ayudo a preparar la maleta?.`,
              data: {
                sessionId: session.id,
                type: '48h_before',
              },
              categoryIdentifier: 'session_48h',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: notification48hDate,
            },
          });
        }

        // Calcular fecha de notificación 1h después del fin (si existe end_time)
        if (session.end_time) {
          const [endHours, endMinutes] = session.end_time.split(':').map(Number);
          const sessionEndDateTime = new Date(sessionDate);
          sessionEndDateTime.setHours(endHours, endMinutes || 0, 0, 0);

          const notificationPostDate = new Date(sessionEndDateTime);
          notificationPostDate.setHours(notificationPostDate.getHours() + 1);

          if (notificationPostDate > new Date()) {
            notificationPostId = await Notifications.scheduleNotificationAsync({
              content: {
                title: `¿Cómo te fué en "${sessionName}"?`,
                body: `${displayName}, cuéntame ¿tu sesión en "${sessionName}" fué lo que esperabas?.`,
                data: {
                  type: 'post_session_note',
                  session_id: session.id,
                },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: notificationPostDate,
              },
            });
          }
        }
      } catch (err) {
        console.error('Error al programar notificaciones (modo normal):', err);
      }
    }

    // Guardar IDs en AsyncStorage (temporalmente hasta que se actualice la tabla)
    const storageKey = `session_notifications_${session.id}`;
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify({
        notification_48h_id: notification48hId,
        notification_post_id: notificationPostId,
      })
    );

    return {
      notification_48h_id: notification48hId,
      notification_post_id: notificationPostId,
    };
  } catch (error) {
    console.error('Error al programar notificaciones:', error);
    return { notification_48h_id: null, notification_post_id: null };
  }
}

// Función para cancelar notificaciones de una sesión
export async function cancelSessionNotifications(session: {
  id: string;
  notification_48h_id?: string;
  notification_post_id?: string;
}): Promise<void> {
  try {
    // Cancelar usando los IDs del objeto si existen
    if (session.notification_48h_id) {
      await Notifications.cancelScheduledNotificationAsync(session.notification_48h_id);
    }
    if (session.notification_post_id) {
      await Notifications.cancelScheduledNotificationAsync(session.notification_post_id);
    }

    // También intentar cancelar desde AsyncStorage (por si acaso)
    const storageKey = `session_notifications_${session.id}`;
    const stored = await AsyncStorage.getItem(storageKey);
    if (stored) {
      const { notification_48h_id, notification_post_id } = JSON.parse(stored);
      if (notification_48h_id) {
        await Notifications.cancelScheduledNotificationAsync(notification_48h_id);
      }
      if (notification_post_id) {
        await Notifications.cancelScheduledNotificationAsync(notification_post_id);
      }
      await AsyncStorage.removeItem(storageKey);
    }
  } catch (error) {
    console.error('Error al cancelar notificaciones:', error);
  }
}

// Función para obtener IDs de notificaciones desde AsyncStorage
export async function getSessionNotificationIds(sessionId: string): Promise<{
  notification_48h_id: string | null;
  notification_post_id: string | null;
}> {
  try {
    const storageKey = `session_notifications_${sessionId}`;
    const stored = await AsyncStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
    return { notification_48h_id: null, notification_post_id: null };
  } catch (error) {
    console.error('Error al obtener IDs de notificaciones:', error);
    return { notification_48h_id: null, notification_post_id: null };
  }
}

// Configurar categorías de notificaciones con acciones
export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('session_48h', [
    {
      identifier: 'prepare_now',
      buttonTitle: 'Preparar ahora',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'snooze_2h',
      buttonTitle: 'Snooze 2h',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'snooze_4h',
      buttonTitle: 'Snooze 4h',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'snooze_8h',
      buttonTitle: 'Snooze 8h',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

// Función para programar un snooze
export async function scheduleSnoozeNotification(
  sessionId: string,
  sessionName: string,
  hours: number
): Promise<string | null> {
  try {
    const snoozeDate = new Date();
    snoozeDate.setHours(snoozeDate.getHours() + hours);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Recordatorio de sesión',
        body: `"${sessionName}" - Recordatorio`,
        data: {
          sessionId: sessionId,
          type: 'snooze',
          hours: hours,
        },
        categoryIdentifier: 'session_48h',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeDate,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error al programar snooze:', error);
    return null;
  }
}

