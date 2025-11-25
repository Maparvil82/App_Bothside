import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Dimensions,
} from 'react-native';
import { CustomHeader } from '../components/CustomHeader';

const { width } = Dimensions.get('window');

export const IaSubscriptionScreen: React.FC = () => {
    // Mock data for UI
    const planName = "Prueba gratuita (7 días)";
    const totalCredits = 50;
    const usedCredits = 15; // Example usage
    const remainingCredits = 35;
    const renewalDate = "28 de febrero";

    const progressPercentage = (remainingCredits / totalCredits) * 100;

    const handleManageSubscription = () => {
        Alert.alert("Gestión disponible en producción");
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>


                {/* Bloque 1 — Estado del plan actual */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Plan actual:</Text>
                    <Text style={styles.cardValue}>{planName}</Text>

                    <View style={styles.separator} />

                    <Text style={styles.cardLabel}>Créditos disponibles:</Text>
                    <Text style={styles.cardValue}>{totalCredits} créditos en total</Text>
                </View>

                {/* Bloque 2 — Créditos IA restantes (barra de progreso) */}
                <View style={styles.card}>
                    <View style={styles.creditsHeader}>
                        <Text style={styles.cardLabel}>Créditos restantes:</Text>
                        <Text style={styles.creditsValue}>{remainingCredits} / {totalCredits}</Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
                    </View>

                    <Text style={styles.renewalText}>
                        Se renovarán automáticamente el {renewalDate}.
                    </Text>
                </View>

                {/* Bloque 3 — Descripción del sistema IA */}
                <Text style={styles.descriptionText}>
                    Cada acción basada en IA consume créditos.{'\n'}
                    Las imágenes consumen más créditos que las consultas de texto.{'\n'}
                    Tus créditos se renuevan automáticamente en cada ciclo de facturación.
                </Text>

                {/* Bloque 4 — Botón para ver gestión de suscripción */}
                <TouchableOpacity style={styles.button} onPress={handleManageSubscription}>
                    <Text style={styles.buttonText}>Gestionar mi suscripción</Text>
                </TouchableOpacity>

                {/* Bloque 5 — (Opcional pero recomendado) */}
                <Text style={styles.footerText}>
                    Pronto podrás comprar paquetes extra de créditos IA.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        alignItems: 'center',
        marginTop: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 30,
        color: '#000000',
        textAlign: 'center',
    },
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        padding: 20,
        marginBottom: 20,
    },
    cardLabel: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
    },
    separator: {
        height: 1,
        backgroundColor: '#E5E5E5',
        marginVertical: 12,
    },
    creditsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    creditsValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#007AFF',
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: '#E8E8E8',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 6,
    },
    renewalText: {
        fontSize: 12,
        color: '#888888',
    },
    descriptionText: {
        fontSize: 13,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#007AFF',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    footerText: {
        fontSize: 12,
        color: '#777777',
        textAlign: 'center',
    },
});
