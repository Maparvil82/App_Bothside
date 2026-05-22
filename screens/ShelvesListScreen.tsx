import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { CreateShelfModal } from '../components/CreateShelfModal';
import { SwipeListView } from 'react-native-swipe-list-view';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Line } from 'react-native-svg';

const ShelvesFABIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer Cabinet Frame */}
      <Rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="2.5"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
      {/* Partition Lines */}
      <Line
        x1="12"
        y1="2"
        x2="12"
        y2="22"
        stroke={color}
        strokeWidth={1.5}
      />
      <Line
        x1="2"
        y1="12"
        x2="22"
        y2="12"
        stroke={color}
        strokeWidth={1.5}
      />
      
      {/* Top-Left Shelf Vinyls (leaning) */}
      <Line
        x1={5.5}
        y1={4.5}
        x2={6.5}
        y2={9.5}
        stroke={color}
        strokeWidth={1.5}
      />
      <Line
        x1={7.5}
        y1={4.5}
        x2={8.5}
        y2={9.5}
        stroke={color}
        strokeWidth={1.5}
      />
      <Line
        x1={9.5}
        y1={4.5}
        x2={10.5}
        y2={9.5}
        stroke={color}
        strokeWidth={1.5}
      />

      {/* Bottom-Right Shelf Vinyls (leaning) */}
      <Line
        x1={14.5}
        y1={14.5}
        x2={15.5}
        y2={19.5}
        stroke={color}
        strokeWidth={1.5}
      />
      <Line
        x1={16.5}
        y1={14.5}
        x2={17.5}
        y2="19.5"
        stroke={color}
        strokeWidth={1.5}
      />
      <Line
        x1={18.5}
        y1={14.5}
        x2={19.5}
        y2="19.5"
        stroke={color}
        strokeWidth={1.5}
      />

      {/* Bottom-Left Shelf: Small Plus sign representing ADD shelf */}
      <Line
        x1={5}
        y1={17}
        x2={9}
        y2={17}
        stroke={color}
        strokeWidth={2}
      />
      <Line
        x1={7}
        y1={15}
        x2={7}
        y2={19}
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
};
import { AppColors } from '../src/theme/colors';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from '../src/i18n/useTranslation';
import { useThemeMode } from '../contexts/ThemeContext';

type RootStackParamList = {
  ShelfView: { shelfId: string, shelfName: string };
  ShelfEdit: undefined; // No se necesitan parámetros para la creación
};

type ShelvesListNavigationProp = StackNavigationProp<RootStackParamList, 'ShelfView', 'ShelfEdit'>;

interface Shelf {
  id: string;
  name: string;
  shelf_rows: number;
  shelf_columns: number;
}

export default function ShelvesListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<ShelvesListNavigationProp>();
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchShelves = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shelves')
        .select('id, name, shelf_rows, shelf_columns')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShelves(data || []);
    } catch (error: any) {
      Alert.alert(t('common_error'), t('shelves_list_error_load'));
      console.error('Error fetching shelves:', error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);



  useFocusEffect(
    useCallback(() => {
      fetchShelves();
    }, [fetchShelves])
  );

  const renderItem = ({ item }: { item: Shelf }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate('ShelfView', { shelfId: item.id, shelfName: item.name })}
    >
      <View style={styles.itemTextContainer}>
        <Ionicons name="grid-outline" size={24} color="#000" />
        <Text style={styles.itemText}>{item.name}</Text>
      </View>
      <View style={styles.itemDetailsContainer}>
        <Text style={styles.itemDetails}>{`${item.shelf_rows}x${item.shelf_columns}`}</Text>
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  const handleSwipeDelete = async (rowMap: any, rowKey: string) => {
    const item = shelves.find(shelf => shelf.id === rowKey);
    if (!item) return;

    Alert.alert(
      t('shelves_list_delete_title'),
      t('shelves_list_delete_message').replace('{0}', item.name),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('common_delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('shelves')
                .delete()
                .eq('id', item.id)
                .eq('user_id', user!.id);

              if (error) throw error;

              // Actualizar la lista local
              setShelves(prevShelves => prevShelves.filter(shelf => shelf.id !== item.id));

              Alert.alert(t('common_success'), t('shelves_list_success_delete'));
            } catch (error: any) {
              Alert.alert(t('common_error'), t('shelves_list_error_delete'));
              console.error('Error deleting shelf:', error.message);
            }
          }
        }
      ]
    );
    rowMap[rowKey]?.closeRow();
  };

  const renderSwipeActions = (rowData: any, rowMap: any) => (
    <View style={styles.swipeActionsContainer}>
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeDelete]}
        onPress={() => handleSwipeDelete(rowMap, rowData.item.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="trash" size={18} color="white" />
        <Text style={styles.swipeActionText}>{t('common_delete')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <BothsideLoader />;
  }

  return (
    <View style={styles.container}>
      <SwipeListView
        data={shelves}
        renderItem={renderItem}
        renderHiddenItem={renderSwipeActions}
        keyExtractor={(item) => item.id}
        rightOpenValue={-90}
        previewOpenValue={0}
        previewOpenDelay={0}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('shelves_list_empty_title')}</Text>
            <Text style={styles.emptySubText}>{t('shelves_list_empty_text')}</Text>
          </View>
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: primaryColor, shadowColor: primaryColor }]}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.8}
      >
        <ShelvesFABIcon color="#fff" size={26} />
      </TouchableOpacity>
      <CreateShelfModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onShelfCreated={fetchShelves}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 0,
  },
  swipeAction: {
    width: 90,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
  },
  swipeDelete: {
    backgroundColor: '#FF3B30',
  },
  swipeActionText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  itemTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: {
    fontSize: 17,
  },
  itemDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDetails: {
    fontSize: 15,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3C3C43',
  },
  emptySubText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
}); 