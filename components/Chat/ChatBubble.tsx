import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../src/theme/colors';

interface ChatBubbleProps {
    text: string;
    sender: 'user' | 'model';
    timestamp?: Date;
    avatarUrl?: string | null;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ text, sender, timestamp, avatarUrl }) => {
    const { colors, dark } = useTheme();

    return (
        <View style={[
            styles.container,
            sender === 'user' ? styles.containerUser : styles.containerModel
        ]}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
                {sender === 'model' ? (
                    <View style={[styles.avatar, { backgroundColor: dark ? '#333' : '#f0f0f0' }]}>
                        <Ionicons name="sparkles" size={16} color={AppColors.primary} />
                    </View>
                ) : (
                    // User Avatar
                    avatarUrl ? (
                        <Image
                            source={{ uri: avatarUrl }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <View style={[styles.avatar, { backgroundColor: AppColors.primary }]}>
                            <Ionicons name="person" size={16} color="#fff" />
                        </View>
                    )
                )}
            </View>

            {/* Bubble */}
            <View style={[
                styles.bubble,
                sender === 'user'
                    ? [styles.bubbleUser, { backgroundColor: AppColors.primary }]
                    : [styles.bubbleModel, { backgroundColor: colors.card }]
            ]}>
                {sender === 'user' ? (
                    <Text style={styles.userText}>{text}</Text>
                ) : (
                    <Markdown
                        style={{
                            body: { color: colors.text, fontSize: 16, lineHeight: 24 },
                            paragraph: { marginBottom: 10 },
                            link: { color: AppColors.primary },
                            code_inline: { backgroundColor: dark ? '#333' : '#eee', padding: 2, borderRadius: 4, fontFamily: 'Courier' },
                            fence: { backgroundColor: dark ? '#333' : '#eee', padding: 10, borderRadius: 8, marginVertical: 8 },
                        }}
                    >
                        {text}
                    </Markdown>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginBottom: 16,
        width: '100%',
        paddingHorizontal: 12, // Added outer padding
    },
    containerUser: {
        justifyContent: 'flex-start',
        flexDirection: 'row-reverse',
    },
    containerModel: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        marginHorizontal: 8,
        justifyContent: 'flex-end',
    },
    avatar: {
        width: 36, // Slightly larger
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ccc'
    },
    bubble: {
        maxWidth: '85%', // Reduced max width to avoid edge crowding
        padding: 12,
        borderRadius: 20,
    },
    bubbleUser: {
        borderBottomRightRadius: 4,
        marginRight: 4, // Extra margin from avatar
    },
    bubbleModel: {
        borderBottomLeftRadius: 4,
        marginLeft: 4, // Extra margin from avatar
    },
    userText: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 22,
    },
});
