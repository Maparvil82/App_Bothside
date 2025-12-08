import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useTheme } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { GeminiService } from '../services/gemini';
import { useTranslation } from '../src/i18n/useTranslation';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  imageUri?: string;
  analyzedAlbum?: {
    artist: string;
    album: string;
  };
}

const CHAT_STORAGE_KEY = 'ai_chat_messages';



export default function AIChatScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const { colors, dark } = useTheme();
  const { t } = useTranslation();
  const isLightMode = !dark;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [collectionData, setCollectionData] = useState<any[]>([]);
  const [albumStories, setAlbumStories] = useState<any[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);

  const PREDEFINED_QUESTIONS = [
    {
      id: 1,
      title: t('ai_question_valuable_albums'),
      question: t('ai_question_valuable_albums_query'),
      icon: "diamond-outline"
    },
    {
      id: 2,
      title: t('ai_question_favorite_genres'),
      question: t('ai_question_favorite_genres_query'),
      icon: "musical-notes-outline"
    },
    {
      id: 3,
      title: t('ai_question_frequent_artists'),
      question: t('ai_question_frequent_artists_query'),
      icon: "person-outline"
    },
    {
      id: 4,
      title: t('ai_question_popular_decades'),
      question: t('ai_question_popular_decades_query'),
      icon: "time-outline"
    },
    {
      id: 5,
      title: t('ai_question_general_stats'),
      question: t('ai_question_general_stats_query'),
      icon: "stats-chart-outline"
    },
  ];

  useEffect(() => {
    loadCollectionData();
    loadChatHistory();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={clearChat} style={{ marginRight: 10 }}>
          <Ionicons name="trash-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.text]);


  const loadChatHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }

      if (data) {
        const parsedMessages = data.map((msg: any) => ({
          id: msg.id.toString(),
          text: msg.message,
          isUser: msg.role === 'user',
          timestamp: new Date(msg.created_at),
          // Map other fields if necessary, e.g. imageUri if stored
        }));
        setMessages(parsedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Function to save message to Supabase (replaces saveChatHistory)
  const saveMessageToSupabase = async (text: string, role: 'user' | 'assistant') => {
    if (!user) return;
    try {
      const { error } = await supabase.from("ai_messages").insert({
        user_id: user.id,
        message: text,
        role: role,
        created_at: new Date().toISOString()
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message to Supabase:', error);
    }
  };

  const clearChat = () => {
    Alert.alert(
      t('ai_alert_clear_title'),
      t('ai_alert_clear_message'),
      [
        {
          text: t('common_cancel'),
          style: 'cancel',
        },
        {
          text: t('common_clear'),
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setMessages([]);
            try {
              await supabase
                .from('ai_messages')
                .delete()
                .eq('user_id', user.id);
            } catch (error) {
              console.error('Error clearing chat history:', error);
            }
          },
        },
      ]
    );
  };

  const loadCollectionData = async () => {
    if (!user) return;

    try {
      // Cargar colección
      const { data, error } = await supabase
        .from('user_collection')
        .select(`
          id,
          album_id,
          added_at,
          albums (
            id,
            title,
            release_year,
            artist,
            label,
            discogs_id,
            cover_url,
            album_styles (styles (name)),
            album_stats (
              avg_price,
              low_price,
              high_price
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading collection:', error);
        return;
      }

      setCollectionData(data || []);

      // Cargar historias (respuestas del typeform)
      const { data: storiesData, error: storiesError } = await supabase
        .from('album_typeform_responses')
        .select('*')
        .eq('user_id', user.id);

      if (storiesError) {
        console.error('Error loading stories:', storiesError);
      } else {
        console.log('📖 Historias cargadas:', storiesData?.length || 0);
        setAlbumStories(storiesData || []);
      }

    } catch (error) {
      console.error('Error loading collection data:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || !user) return;

    // 🧩 Verificar créditos antes de enviar
    const { data: creditsCheck, error: creditsError } = await supabase
      .from("ia_credits")
      .select("credits_total, credits_used")
      .eq("user_id", user.id)
      .single();

    if (creditsError) {
      console.error("❌ Error leyendo créditos:", creditsError);
    }

    if (creditsCheck && creditsCheck.credits_used >= creditsCheck.credits_total) {
      Alert.alert(
        t('ai_alert_no_credits_title'),
        t('ai_alert_no_credits_message')
      );
      return;
    }

    const textToSend = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      isUser: true,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    // Guardar mensaje del usuario en Supabase
    await saveMessageToSupabase(textToSend, 'user');

    try {
      const collectionContext = GeminiService.formatCollectionContext(collectionData, albumStories);
      const response = await GeminiService.generateResponse(
        userMessage.text,
        collectionContext,
        collectionData
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      // Guardar respuesta de la IA en Supabase
      await saveMessageToSupabase(response, 'assistant');

      // 🧩 Consumir crédito IA
      const isImage = false; // Detecta si el mensaje usa imagen
      const { data: creditResult, error: creditError } = await supabase.rpc(
        "consume_ai_credit",
        {
          p_user_id: user.id,
          p_amount: isImage ? 5 : 1
        }
      );

      if (creditError) {
        console.error("❌ Error al descontar crédito:", creditError);
        Alert.alert(t('common_error'), t('ai_error_credits'));
      }

      // 🧩 Refrescar créditos en la sesión (lectura directa)
      const { data: creditsData, error: creditsLoadError } = await supabase
        .from("ia_credits")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (creditsLoadError) {
        console.error("❌ Error refrescando créditos:", creditsLoadError);
      } else {
        console.log("🔄 Créditos actualizados:", creditsData);
      }

    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: t('ai_error_processing'),
        isUser: false,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);

      // Opcional: guardar mensaje de error o no
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handlePredefinedQuestion = (question: string) => {
    if (!question.trim() || isLoading) return;

    // Set the input text and trigger send
    setInputText(question);

    // Use a small delay to ensure the input is set before sending
    setTimeout(() => {
      sendMessage();
    }, 50);
  };


  const scrollToBottomIfUserMessage = (newMessages: Message[]) => {
    // Solo hacer scroll si el último mensaje es del usuario
    const lastMessage = newMessages[newMessages.length - 1];
    if (lastMessage && lastMessage.isUser) {
      // Pequeño delay para que el mensaje se renderice primero
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || isLoading) return;

    // Hacer scroll inmediatamente cuando el usuario envía un mensaje
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);

    sendMessage();
  };

  useEffect(() => {
    // Solo hacer scroll automático cuando el usuario envía un mensaje
    // Ahora se maneja manualmente en handleSendMessage para mejor control
  }, [messages]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]}>


      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.isUser ? styles.userMessage : styles.aiMessage,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.isUser ? styles.userBubble : [styles.aiBubble, { backgroundColor: colors.card }],
                ]}
              >
                <Text
                  style={[
                    message.isUser ? styles.userText : [styles.aiText, { color: colors.text }],
                    styles.messageText,
                  ]}
                >
                  {message.text}
                </Text>
              </View>
              <Text style={[styles.timestamp, { color: colors.text + '80' }]}>
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))}

          {isLoading && (
            <View style={[styles.messageContainer, styles.aiMessage]}>
              <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: colors.card }]}>
                <View style={styles.loadingContainer}>
                  <BothsideLoader />
                  <Text style={[styles.loadingText, { color: colors.text }]}>{t('ai_status_thinking')}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Estado vacío con titular y subtitular centrados - Solo mostrar cuando no hay mensajes */}
        {messages.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateTextContainer}>
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                {t('ai_empty_title')}
              </Text>
              <Text style={[styles.emptyStateSubtitle, { color: colors.text + 'CC' }]}>
                {t('ai_empty_subtitle')}
              </Text>
            </View>
          </View>
        )}

        {/* Preguntas preestablecidas flotantes - Solo mostrar cuando no hay mensajes */}
        {messages.length === 0 && (
          <View style={styles.predefinedQuestionsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.predefinedQuestionsScroll}
            >
              {PREDEFINED_QUESTIONS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.predefinedQuestionCard,
                    {
                      backgroundColor: isLightMode ? '#F5F5F7' : 'rgba(255,255,255,0.08)',
                      borderColor: isLightMode ? '#E5E5EA' : 'rgba(255,255,255,0.15)',
                    },
                  ]}
                  onPress={() => handlePredefinedQuestion(item.question)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.predefinedQuestionText, { color: colors.text }]} numberOfLines={2}>
                    {item.question}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                color: colors.text,
                marginRight: inputText.trim() ? 10 : 0
              }
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('ai_placeholder_input')}
            placeholderTextColor={colors.text + '80'}
            multiline
            maxLength={500}
          />
          {inputText.trim() && (
            <TouchableOpacity
              style={[
                styles.sendButton,
                isLoading && [
                  styles.sendButtonDisabled,
                  { backgroundColor: isLightMode ? '#E5E5EA' : colors.text + '20' },
                ],
              ]}
              onPress={handleSendMessage}
              disabled={isLoading}
            >
              <Ionicons
                name="send"
                size={20}
                color={isLoading ? (isLightMode ? '#8E8E93' : colors.text + '60') : '#fff'}
              />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  clearButton: {
    padding: 5,
  },
  rightButtonContainer: {
    width: 44, // Same width as backButton (24px icon + 10px padding each side)
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  aiMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    minWidth: 60,
  },
  userBubble: {
    backgroundColor: '#000',
  },
  aiBubble: {
    // backgroundColor se aplica dinámicamente
  },
  userText: {
    color: '#fff',
    fontSize: 16,
  },
  aiText: {
    fontSize: 16,
  },
  messageText: {
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 16,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    // backgroundColor se aplica dinámicamente
  },
  predefinedQuestionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  predefinedQuestionsScroll: {
    paddingVertical: 5,
  },
  predefinedQuestionCard: {
    width: 220, // Fixed width
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 1,
    minHeight: 50, // Minimum height to accommodate 2 lines
  },
  predefinedQuestionText: {
    fontSize: 16,
    textAlign: 'left',
    fontWeight: '400',
    lineHeight: 22, // Better line spacing for readability
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyStateTextContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
}); 