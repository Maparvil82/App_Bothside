import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

interface FloatingChatButtonProps {
    onPress: () => void;
    style?: ViewStyle;
}

import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ onPress, style }) => {
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const { user } = useAuth();
    const navigation = useNavigation<any>();

    const handlePress = () => {
        if (!user) return;

        // Gating Check
        if ((user.creditsRemaining || 0) <= 0) {
            Alert.alert(
                'Sin Créditos AI',
                'Necesitas créditos para usar el asistente AI. ¿Quieres adquirir un paquete?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ir a la Tienda', onPress: () => navigation.navigate('AICreditsStore') }
                ]
            );
            return;
        }

        navigation.navigate('Chat');
        if (onPress) onPress();
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: colors.primary, shadowColor: colors.text },
                style
            ]}
            onPress={handlePress}
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
