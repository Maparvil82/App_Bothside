import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { supabase } from '../lib/supabase';
import ShelfGrid from '../components/ShelfGrid';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from '../src/i18n/useTranslation';

type RootStackParamList = {
  ShelfEdit: { shelf: Shelf };
  // ... otras rutas
};

type ShelfViewNavigationProp = StackNavigationProp<RootStackParamList, 'ShelfEdit'>;

interface Shelf {
  id: string;
  name: string;
  shelf_rows: number;
  shelf_columns: number;
}

export default function ShelfViewScreen() {
  const navigation = useNavigation<ShelfViewNavigationProp>();
  const route = useRoute<RouteProp<{ params: { shelfId: string, shelfName: string } }, 'params'>>();
  const { shelfId, shelfName } = route.params;
  const { t } = useTranslation();

  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchShelfDetails = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shelves')
        .select('id, name, shelf_rows, shelf_columns')
        .eq('id', shelfId)
        .single();

      if (error) throw error;
      setShelf(data);
    } catch (error: any) {
      Alert.alert(t('common_error'), t('shelf_view_error_load'));
      console.error('Error fetching shelf details:', error.message);
    } finally {
      setLoading(false);
    }
  }, [shelfId]);

  useFocusEffect(
    useCallback(() => {
      fetchShelfDetails();
    }, [fetchShelfDetails])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => shelf && navigation.navigate('ShelfEdit', { shelf: shelf })}
          style={{ marginRight: 15 }}
          disabled={!shelf}
        >
          <Ionicons name="create-outline" size={24} color={shelf ? AppColors.primary : "#D1D1D6"} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, shelf]);


  if (loading) {
    return <BothsideLoader />;
  }

  if (!shelf) {
    return <Text style={styles.centered}>{t('shelf_view_not_found')}</Text>;
  }

  return (
    <View style={styles.container}>

      <View style={styles.gridWrapper}>
        <ShelfGrid rows={shelf.shelf_rows} columns={shelf.shelf_columns} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  gridWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 