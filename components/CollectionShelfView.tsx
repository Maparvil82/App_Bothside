import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';
import { useTranslation } from '../src/i18n/useTranslation';

export interface CollectionShelf {
  id: string;
  name: string;
  shelf_rows: number;
  shelf_columns: number;
}

export interface LocatedRecord {
  id: string;
  shelf_id?: string | null;
  location_row?: number | null;
  location_column?: number | null;
  is_out_of_shelf?: boolean | null;
  albums?: {
    id: string;
    title?: string;
    artist?: string;
    cover_url?: string | null;
  } | null;
}

interface Props {
  shelves: CollectionShelf[];
  records: LocatedRecord[];
  selectedShelfId: string | null;
  onSelectShelf: (id: string) => void;
  onOpenRecord: (albumId: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
}

export const CollectionShelfView: React.FC<Props> = ({
  shelves,
  records,
  selectedShelfId,
  onSelectShelf,
  onOpenRecord,
  refreshing,
  onRefresh,
}) => {
  const { colors } = useTheme();
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
  const shelf = shelves.find(item => item.id === selectedShelfId) || shelves[0];
  const [openCell, setOpenCell] = useState<{ row: number; column: number } | null>(null);

  const { byCell, placedCount, outCount } = useMemo(() => {
    const byCell = new Map<string, LocatedRecord[]>();
    let placedCount = 0;
    let outCount = 0;
    if (!shelf) return { byCell, placedCount, outCount };

    records.forEach(record => {
      if (record.shelf_id !== shelf.id) return;
      if (record.is_out_of_shelf) {
        outCount += 1;
        return;
      }
      const row = record.location_row;
      const column = record.location_column;
      if (!row || !column || row > shelf.shelf_rows || column > shelf.shelf_columns) return;
      const key = `${row}-${column}`;
      byCell.set(key, [...(byCell.get(key) || []), record]);
      placedCount += 1;
    });

    return { byCell, placedCount, outCount };
  }, [records, shelf]);

  if (!shelf) return null;

  const gap = 10;
  const cellSize = Math.max(76, Math.min(112, (width - 48 - gap * (shelf.shelf_columns - 1)) / shelf.shelf_columns));
  const cellRecords = openCell ? byCell.get(`${openCell.row}-${openCell.column}`) || [] : [];
  const cellLabel = openCell ? `${String.fromCharCode(64 + openCell.row)}${openCell.column}` : '';

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
      >
        <Text style={[styles.title, { color: colors.text }]}>{t('collection_shelf_title')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfTabs}>
          {shelves.map(item => {
            const selected = item.id === shelf.id;
            return (
              <TouchableOpacity
                key={item.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => {
                  setOpenCell(null);
                  onSelectShelf(item.id);
                }}
                style={[styles.shelfTab, { borderColor: selected ? primaryColor : colors.border, backgroundColor: selected ? primaryColor : colors.card }]}
              >
                <Ionicons name="albums-outline" size={17} color={selected ? '#fff' : colors.text} />
                <Text style={[styles.shelfTabText, { color: selected ? '#fff' : colors.text }]} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.shelfName, { color: colors.text }]}>{shelf.name}</Text>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            {t('collection_shelf_placed', { '0': placedCount })}
            {outCount > 0 ? ` · ${t('collection_shelf_out', { '0': outCount })}` : ''}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapScroll}>
          <View style={[styles.map, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {Array.from({ length: shelf.shelf_rows }, (_, rowIndex) => (
              <View key={rowIndex} style={[styles.mapRow, { gap }]}>
                {Array.from({ length: shelf.shelf_columns }, (_, columnIndex) => {
                  const row = rowIndex + 1;
                  const column = columnIndex + 1;
                  const items = byCell.get(`${row}-${column}`) || [];
                  const cover = items.find(item => item.albums?.cover_url)?.albums?.cover_url;
                  const position = `${String.fromCharCode(64 + row)}${column}`;
                  return (
                    <TouchableOpacity
                      key={column}
                      accessibilityRole="button"
                      accessibilityLabel={`${position}, ${t('collection_shelf_placed', { '0': items.length })}`}
                      accessibilityState={{ disabled: items.length === 0 }}
                      disabled={items.length === 0}
                      onPress={() => setOpenCell({ row, column })}
                      activeOpacity={0.8}
                      style={[styles.cell, { width: cellSize, height: cellSize, borderColor: items.length ? primaryColor : colors.border, backgroundColor: colors.background }]}
                    >
                      {cover ? (
                        <Image source={{ uri: cover }} style={styles.cellCover} resizeMode="cover" />
                      ) : items.length > 0 ? (
                        <Ionicons name="disc-outline" size={28} color={primaryColor} />
                      ) : (
                        <Text style={[styles.emptyMark, { color: colors.text }]}>—</Text>
                      )}
                      <View style={[styles.positionBadge, { backgroundColor: items.length ? primaryColor : colors.card }]}>
                        <Text style={[styles.positionText, { color: items.length ? '#fff' : colors.text }]}>{position}</Text>
                      </View>
                      {items.length > 0 && (
                        <View style={styles.countBadge}>
                          <Text style={styles.countText}>{items.length}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>

        <Text style={[styles.hint, { color: colors.text }]}>
          {placedCount > 0 ? t('collection_shelf_hint') : t('collection_shelf_empty')}
        </Text>
      </ScrollView>

      <Modal visible={openCell !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpenCell(null)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{shelf.name} · {cellLabel}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.text }]}>{t('collection_shelf_placed', { '0': cellRecords.length })}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common_close')} onPress={() => setOpenCell(null)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalList}>
            {cellRecords.map(record => (
              <TouchableOpacity
                key={record.id}
                onPress={() => {
                  setOpenCell(null);
                  if (record.albums?.id) onOpenRecord(record.albums.id);
                }}
                style={[styles.recordRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                {record.albums?.cover_url ? (
                  <Image source={{ uri: record.albums.cover_url }} style={styles.recordCover} />
                ) : (
                  <View style={[styles.recordCover, styles.recordPlaceholder, { backgroundColor: colors.border }]}>
                    <Ionicons name="disc-outline" size={26} color={colors.text} />
                  </View>
                )}
                <View style={styles.recordInfo}>
                  <Text style={[styles.recordTitle, { color: colors.text }]} numberOfLines={2}>{record.albums?.title || t('common_untitled')}</Text>
                  <Text style={[styles.recordArtist, { color: colors.text }]} numberOfLines={1}>{record.albums?.artist || t('common_unknown_artist')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={colors.text} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  title: { fontSize: 25, fontWeight: '800', marginHorizontal: 20, marginTop: 22, marginBottom: 14 },
  shelfTabs: { paddingHorizontal: 16, gap: 8, paddingBottom: 18 },
  shelfTab: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 22, paddingHorizontal: 15, paddingVertical: 10, maxWidth: 220 },
  shelfTabText: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  summary: { borderWidth: 1, borderRadius: 18, marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 18, paddingVertical: 14 },
  shelfName: { fontSize: 18, fontWeight: '800' },
  summaryText: { fontSize: 13, opacity: 0.7, marginTop: 4 },
  mapScroll: { paddingHorizontal: 16 },
  map: { borderWidth: 1, borderRadius: 20, padding: 12, gap: 10 },
  mapRow: { flexDirection: 'row' },
  cell: { borderWidth: 1.5, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cellCover: { width: '100%', height: '100%' },
  emptyMark: { fontSize: 22, opacity: 0.3 },
  positionBadge: { position: 'absolute', left: 5, bottom: 5, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  positionText: { fontSize: 11, fontWeight: '800' },
  countBadge: { position: 'absolute', right: 5, top: 5, minWidth: 21, height: 21, borderRadius: 11, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  hint: { textAlign: 'center', marginHorizontal: 24, marginTop: 18, fontSize: 13, opacity: 0.65 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalSubtitle: { fontSize: 13, opacity: 0.6, marginTop: 3 },
  closeButton: { padding: 7 },
  modalList: { padding: 16, gap: 10 },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 13, padding: 10 },
  recordCover: { width: 58, height: 58, borderRadius: 6 },
  recordPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  recordInfo: { flex: 1 },
  recordTitle: { fontSize: 15, fontWeight: '700' },
  recordArtist: { fontSize: 13, opacity: 0.65, marginTop: 3 },
});
