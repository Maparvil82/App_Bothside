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
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { GeminiService } from '../services/gemini';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
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
  }
];

export default function AIChatScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Bothside IA</Text>
          <Text style={styles.headerSubtitle}>Analiza tu colección</Text>
        </View>
        <View style={styles.rightButtonContainer}>
          {messages.length > 0 ? (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearChat}
            >
              <Ionicons name="refresh-outline" size={24} color="#FF6B6B" />
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
                  message.isUser ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    message.isUser ? styles.userText : styles.aiText,
                    styles.messageText,
                  ]}
                >
                  {message.text}
                </Text>
              </View>
              <Text style={styles.timestamp}>
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))}
          
          {isLoading && (
            <View style={[styles.messageContainer, styles.aiMessage]}>
              <View style={[styles.messageBubble, styles.aiBubble]}>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#666" />
                  <Text style={styles.loadingText}>Pensando...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Estado vacío con titular y subtitular centrados - Solo mostrar cuando no hay mensajes */}
        {messages.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateTextContainer}>
              <Text style={styles.emptyStateTitle}>
                Tu colección te conoce bien
              </Text>
              <Text style={styles.emptyStateSubtitle}>
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
                  style={styles.predefinedQuestionCard}
                  onPress={() => handlePredefinedQuestion(item.question)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.predefinedQuestionText} numberOfLines={2}>
                    {item.question}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Pregunga sobre tu colección..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={20}
              color={!inputText.trim() || isLoading ? '#ccc' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#e0e0e0',
  },
  userText: {
    color: '#fff',
    fontSize: 16,
  },
  aiText: {
    color: '#333',
    fontSize: 16,
  },
  messageText: {
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    marginBottom: 10,
    marginLeft: 16,
    marginRight: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 16,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
    color: '#333',
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
    backgroundColor: '#f0f0f0',
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
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 50, // Minimum height to accommodate 2 lines
  },
  predefinedQuestionText: {
    fontSize: 16,
    color: '#333',
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
    color: '#333(',
    textAlign: 'center',
    marginBottom: 5,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
}); 