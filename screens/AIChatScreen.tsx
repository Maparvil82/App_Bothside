import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useTheme } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { GeminiService } from '../services/gemini';

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

const PREDEFINED_QUESTIONS = [
  {
    id: 1,
    title: "Álbumes más valiosos",
    question: "¿Cuáles son mis álbumes más valiosos y cuánto valen?",
    icon: "diamond-outline"
  },
  {
    id: 2,
    title: "Géneros favoritos",
    question: "¿Qué géneros musicales predominan en mi colección?",
    icon: "musical-notes-outline"
  },
  {
    id: 3,
    title: "Artistas frecuentes",
    question: "¿Qué artistas tengo más representados en mi colección?",
    icon: "person-outline"
  },
  {
    id: 4,
    title: "Décadas populares",
    question: "¿De qué décadas son la mayoría de mis discos?",
    icon: "time-outline"
  },
  {
    id: 5,
    title: "Estadísticas generales",
    question: "Dame un resumen completo de las estadísticas de mi colección",
    icon: "stats-chart-outline"
  },
];

export default function AIChatScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { colors, dark } = useTheme();
  const isLightMode = !dark;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [collectionData, setCollectionData] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadCollectionData();
    loadChatHistory();
  }, []);


  const loadChatHistory = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(parsedMessages);
      } else {
        // Chat vacío si no hay historial
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Chat vacío en caso de error
      setMessages([]);
    }
  };

  const saveChatHistory = async (messagesToSave: Message[]) => {
    try {
      await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const clearChat = () => {
    Alert.alert(
      'Limpiar conversación',
      '¿Estás seguro de que quieres limpiar toda la conversación?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
          },
        },
      ]
    );
  };

  const loadCollectionData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_collection')
        .select(`
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
    } catch (error) {
      console.error('Error loading collection data:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    // Guardar inmediatamente el mensaje del usuario
    await saveChatHistory(updatedMessages);

    try {
      const collectionContext = GeminiService.formatCollectionContext(collectionData);
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
      
      // Guardar la conversación completa después de la respuesta de la IA
      await saveChatHistory(finalMessages);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Lo siento, no pude procesar tu pregunta. Inténtalo de nuevo.',
        isUser: false,
        timestamp: new Date(),
      };
      
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      
      // Guardar también en caso de error
      await saveChatHistory(finalMessages);
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
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Bothside IA</Text>
       
        </View>
        <View style={styles.rightButtonContainer}>
          {messages.length > 0 ? (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearChat}
            >
              <Ionicons name="refresh-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.clearButton} />
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                  <ActivityIndicator size="small" color={colors.text} />
                  <Text style={[styles.loadingText, { color: colors.text }]}>Pensando...</Text>
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
                Tu colección te conoce bien
              </Text>
              <Text style={[styles.emptyStateSubtitle, { color: colors.text + 'CC' }]}>
                He memorizado cada disco de tu estantería, es maravillosa, llena de datos sorprendentes.
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
            placeholder="Pregunta sobre tu colección..."
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
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