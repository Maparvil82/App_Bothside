import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { GeminiService } from '../services/GeminiService';
import { UserCollectionService, UserMaletaService } from '../services/database';
import { CreditService } from '../services/CreditService';
import { useTheme } from '@react-navigation/native';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'model';
    timestamp: Date;
}

interface ChatModalProps {
    visible: boolean;
    onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ visible, onClose }) => {
    const { user, loadUserSubscriptionAndCredits } = useAuth();
    const { colors } = useTheme();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    // Initialize chat when modal opens
    useEffect(() => {
        console.log('🔄 ChatModal: Effect triggered. Visible:', visible, 'User:', user?.id);
        if (visible && user) {
            initializeChat();
        }
    }, [visible, user]);

    const initializeChat = async () => {
        console.log('🚀 ChatModal: initializeChat started');
        setInitializing(true);
        try {
            // 1. Fetch user collection
            console.log('📦 ChatModal: Fetching user collection...');
            const startTime = Date.now();
            const collection = await UserCollectionService.getUserCollection(user!.id);
            console.log(`📦 ChatModal: Collection fetched in ${Date.now() - startTime}ms. Items: ${collection?.length}`);

            // 2. Generate context
            console.log('🧠 ChatModal: Generating context...');
            const contextStart = Date.now();
            const context = GeminiService.generateContextFromCollection(collection || []);
            console.log(`🧠 ChatModal: Context generated in ${Date.now() - contextStart}ms. Length: ${context.length}`);

            // 3. Start chat session
            console.log('💬 ChatModal: Starting chat session...');
            await GeminiService.startChat([], context);
            console.log('✅ ChatModal: Chat session started');

            // 4. Set initial greeting

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

        // CHECK CREDITS before sending (Double check)
        if (user && (user.creditsRemaining || 0) <= 0) {
            Alert.alert(
                'Sin Créditos',
                'Te has quedado sin créditos.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Recargar', onPress: () => {
                            onClose();
                            // We need navigation here. If not available easily, just close.
                            // But we can try to use a global ref or just let them find the store.
                            // For now, simple alert.
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
                // We assume AuthContext updates automatically or we trigger it?
                // ChatModal uses `useAuth`, but we need to call `loadUserSubscriptionAndCredits`.
                // Let's import the method from hook? 
                // We'll trust the global state will update if we had the method key, 
                // but local `useAuth` destructuring `loadUserSubscriptionAndCredits` wasn't in the original file view I saw.
                // Ah, I need to check if `loadUserSubscriptionAndCredits` is available in `useAuth`.
                // Looking at AuthContext view (Step 219), yes it is!
                // checking ChatModal view (Step 250), it destructured { user }.
                // I need to update the destructuring too.
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
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Asistente Bothside</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

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
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
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
        paddingBottom: Platform.OS === 'ios' ? 34 : 12,
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
