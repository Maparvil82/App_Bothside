import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { GeminiService } from '../services/GeminiService';
import { UserCollectionService } from '../services/database';
import { CreditService } from '../services/CreditService';
import { useNavigation, useTheme } from '@react-navigation/native';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'model';
    timestamp: Date;
}

export const ChatScreen: React.FC = () => {
    const { user, loadUserSubscriptionAndCredits } = useAuth();
    const { colors } = useTheme();
    const navigation = useNavigation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    // Initialize chat when screen opens
    useEffect(() => {
        if (user) {
            if ((user.creditsRemaining || 0) <= 0) {
                Alert.alert(
                    'Sin Créditos AI',
                    'Necesitas créditos para usar el asistente. ¿Quieres ir a la tienda?',
                    [
                        { text: 'Cancelar', onPress: () => navigation.goBack(), style: 'cancel' },
                        {
                            text: 'Ir a Tienda',
                            onPress: () => {
                                navigation.goBack();
                                // navigate to store if possible, or just close
                                // navigation.navigate('AICreditsStore'); 
                            }
                        }
                    ]
                );
            } else {
                initializeChat();
            }
        }
    }, [user?.id]);

    const initializeChat = async () => {
        setInitializing(true);
        try {
            // 1. Fetch user collection
            const startTime = Date.now();
            const collection = await UserCollectionService.getUserCollection(user!.id);
            console.log(`📦 ChatScreen: Collection fetched in ${Date.now() - startTime}ms. Items: ${collection?.length}`);

            // 2. Generate context
            const contextStart = Date.now();
            const context = GeminiService.generateContextFromCollection(collection || []);
            console.log(`🧠 ChatScreen: Context generated in ${Date.now() - contextStart}ms. Length: ${context.length}`);

            // 3. Start chat session
            await GeminiService.startChat([], context);
            console.log('✅ ChatScreen: Chat session started');

            // 4. Set initial greeting
            setMessages([
                {
                    id: '1',
                    text: '¡Hola! Soy tu asistente musical. He revisado tu colección de vinilos. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre qué discos tienes, buscar recomendaciones o detalles de tus álbumes.',
                    sender: 'model',
                    timestamp: new Date(),
                },
            ]);
        } catch (error) {
            console.error('Error initializing chat:', error);
            Alert.alert('Error', 'No se pudo conectar con el asistente.');
        } finally {
            setInitializing(false);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;

        // CHECK CREDITS before sending
        if (user && (user.creditsRemaining || 0) <= 0) {
            Alert.alert(
                'Sin Créditos',
                'Te has quedado sin créditos.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Recargar', onPress: () => {
                            // Navigate to store
                            // navigation.navigate('AICreditsStore'); // Assuming name
                            // But for now just close or stay?
                            // Ideally navigate to store if in stack
                            // navigation.navigate('AICreditsStore');
                        }
                    }
                ]
            );
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setLoading(true);

        try {
            const responseText = await GeminiService.sendMessage(userMessage.text);

            // SUCCESS: Deduct and Update
            if (user) {
                await CreditService.deductCredits(user.id, 1);
                // Update local state to reflect new balance immediately
                await loadUserSubscriptionAndCredits(user.id);
            }

            const modelMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: responseText,
                sender: 'model',
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, modelMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Lo siento, tuve un problema al procesar tu mensaje. Por favor intenta de nuevo.',
                sender: 'model',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[styles.container, { backgroundColor: colors.background }]}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {/* Chat Area */}
                {initializing ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.text }]}>Analizando tu colección...</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.messagesList}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        renderItem={({ item }) => (
                            <View
                                style={[
                                    styles.messageBubble,
                                    item.sender === 'user'
                                        ? { alignSelf: 'flex-end', backgroundColor: colors.primary }
                                        : { alignSelf: 'flex-start', backgroundColor: colors.card },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.messageText,
                                        { color: item.sender === 'user' ? '#fff' : colors.text }
                                    ]}
                                >
                                    {item.text}
                                </Text>
                            </View>
                        )}
                    />
                )}

                {/* Input Area */}
                <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                        placeholder="Escribe un mensaje..."
                        placeholderTextColor="gray"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { opacity: !inputText.trim() || loading ? 0.5 : 1 }]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.primary} size="small" />
                        ) : (
                            <Ionicons name="send" size={24} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
    },
    messagesList: {
        padding: 16,
        paddingBottom: 32,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
        marginBottom: 12,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 12 : 12,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        marginRight: 10,
        maxHeight: 100,
    },
    sendButton: {
        padding: 8,
    },
});
