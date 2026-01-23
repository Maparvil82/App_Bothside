import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../src/theme/colors';

interface ChatInputProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    loading: boolean;
    placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    value,
    onChangeText,
    onSend,
    loading,
    placeholder = "Message Bothside..."
}) => {
    const { colors, dark } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <View style={[styles.inputWrapper, { backgroundColor: dark ? '#2C2C2E' : '#F2F2F7', borderColor: colors.border }]}>
                <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={placeholder}
                    placeholderTextColor={dark ? '#8E8E93' : '#8E8E93'}
                    value={value}
                    onChangeText={onChangeText}
                    multiline
                    maxLength={1000}
                />
                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        { backgroundColor: value.trim() ? AppColors.primary : (dark ? '#3A3A3C' : '#E5E5EA') }
                    ]}
                    onPress={onSend}
                    disabled={!value.trim() || loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Ionicons
                            name="arrow-up"
                            size={20}
                            color={value.trim() ? '#fff' : (dark ? '#636366' : '#AEAEB2')}
                        />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Safe area handling
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderRadius: 26,
        padding: 6,
        minHeight: 52,
        borderWidth: 0.5,
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 14,
        fontSize: 16,
        maxHeight: 120, // Limit height
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 4,
    },
});
