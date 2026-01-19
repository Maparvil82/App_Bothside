import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

interface FloatingChatButtonProps {
    onPress: () => void;
    style?: ViewStyle;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ onPress, style }) => {
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: colors.primary, shadowColor: colors.text },
                style
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90, // Positioned above bottom tab bar
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        zIndex: 9999,
    },
});
