import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const FeedbackScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [category, setCategory] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToInput = () => {
    // Hacer scroll hacia abajo para mostrar el input cuando aparece el teclado
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const categories = [
    { id: 'bug', label: '🐛 Bug/Error' },
    { id: 'feature', label: '💡 Nueva funcionalidad' },
    { id: 'improvement', label: '⚡ Mejora' },
    { id: 'ui', label: '🎨 Interfaz' },
    { id: 'performance', label: '⚡ Rendimiento' },
    { id: 'other', label: '📝 Otro' },
  ];

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert('Error', 'Por favor, escribe tu feedback');
      return;
    }

    if (!category) {
      Alert.alert('Error', 'Por favor, selecciona una categoría');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user?.id,
          feedback_text: feedback.trim(),
          category: category,
          rating: rating,
          created_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      Alert.alert(
        '¡Gracias!',
        'Tu feedback ha sido enviado. Lo revisaremos para mejorar Bothside.',
        [
          {
            text: 'OK',
            onPress: () => {
              setFeedback('');
              setRating(null);
              setCategory('');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'No se pudo enviar el feedback. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        <Text style={[styles.starsLabel, { color: colors.text }]}>¿Cómo calificarías Bothside?</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Text style={[
                styles.star,
                { color: rating && star <= rating ? '#FFD700' : colors.border }
              ]}>
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>
              Tu opinión nos importa
            </Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              Ayúdanos a mejorar Bothside compartiendo tu experiencia
            </Text>

            {/* Rating */}
            {renderStars()}

            {/* Category */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Categoría
              </Text>
              <View style={styles.categoriesContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryButton,
                      { 
                        backgroundColor: category === cat.id ? colors.primary : colors.card,
                        borderColor: colors.border,
                      }
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Text style={[
                      styles.categoryText,
                      { 
                        color: category === cat.id ? '#fff' : colors.text 
                      }
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Feedback Text */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Tu feedback
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  }
                ]}
                placeholder="Cuéntanos qué piensas, qué te gustaría ver mejorado, o si has encontrado algún problema..."
                placeholderTextColor={colors.text + '80'}
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                returnKeyType="default"
                blurOnSubmit={false}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { 
                  backgroundColor: isSubmitting ? colors.border : colors.primary,
                }
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Espacio extra para el teclado
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    opacity: 0.8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  starsContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  starsLabel: {
    fontSize: 16,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 32,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    maxHeight: 200, // Limitar altura máxima
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
