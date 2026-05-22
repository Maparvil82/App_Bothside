import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from '../src/i18n/useTranslation';
import { supabase } from '../lib/supabase';

interface ShelfGridSelectableProps {
  rows: number;
  columns: number;
  onSelectCell: (row: number, column: number) => void;
  selectedRow?: number;
  selectedColumn?: number;
  shelfId?: string;
}

const ShelfGridSelectable: React.FC<ShelfGridSelectableProps> = ({
  rows,
  columns,
  onSelectCell,
  selectedRow,
  selectedColumn,
  shelfId,
}) => {
  const { mode } = useThemeMode();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
  const screenWidth = Dimensions.get('window').width;
  const containerPadding = 16 * 2; // Padding total del scrollview en SelectCellScreen
  const gridGap = 8; // Espaciado unificado
  const totalGapWidth = (columns - 1) * gridGap;
  const availableWidth = screenWidth - containerPadding;
  const cellWidth = (availableWidth - totalGapWidth) / columns;
  const cellHeight = cellWidth; // Perfectamente cuadrado

  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(!!shelfId);

  useEffect(() => {
    if (!shelfId) return;

    let isMounted = true;
    const fetchCounts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_collection')
          .select('location_row, location_column')
          .eq('shelf_id', shelfId);

        if (error) throw error;

        const counts: Record<string, number> = {};
        if (data) {
          data.forEach(item => {
            if (item.location_row !== null && item.location_column !== null) {
              // Convertir a 0-indexed para la UI
              const key = `${item.location_row - 1}-${item.location_column - 1}`;
              counts[key] = (counts[key] || 0) + 1;
            }
          });
        }

        if (isMounted) {
          setSlotCounts(counts);
        }
      } catch (err) {
        console.error('Error fetching shelf slot counts:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCounts();
    return () => {
      isMounted = false;
    };
  }, [shelfId]);

  const renderGrid = () => {
    const gridRows = [];
    for (let i = 0; i < rows; i++) {
      const rowCells = [];
      const rowLetter = String.fromCharCode(65 + i); // Genera A, B, C, D...

      for (let j = 0; j < columns; j++) {
        const isSelected = i === selectedRow && j === selectedColumn;
        const key = `${i}-${j}`;
        const count = slotCounts[key] || 0;
        const hasRecords = count > 0;

        const colNumber = j + 1;
        const positionLabel = `${rowLetter}${colNumber}`;

        const countText = hasRecords
          ? (count === 1
              ? t('search_modal_record_singular', { '0': 1 })
              : t('search_modal_record_plural', { '0': count }))
          : t('shelf_slot_empty');

        // Clases de estilos dinámicos
        const cellStyle = [
          styles.cell,
          { width: cellWidth, height: cellHeight },
          isSelected
            ? [styles.selectedCell, { backgroundColor: primaryColor, borderColor: primaryColor }]
            : hasRecords
              ? (mode === 'dark' ? styles.cellOccupiedDark : styles.cellOccupiedLight)
              : (mode === 'dark' ? styles.cellEmptyDark : styles.cellEmptyLight)
        ];

        const labelStyle = [
          styles.cellLabel,
          { fontSize: Math.max(cellWidth * 0.22, 14) },
          isSelected
            ? styles.labelSelected
            : hasRecords
              ? (mode === 'dark' ? styles.labelOccupiedDark : styles.labelOccupiedLight)
              : styles.labelEmpty
        ];

        rowCells.push(
          <TouchableOpacity
            key={key}
            style={cellStyle}
            onPress={() => onSelectCell(i, j)}
            activeOpacity={0.7}
          >
            <Text style={labelStyle}>{positionLabel}</Text>

            {isSelected ? (
              <View style={styles.selectedContent}>
                <Ionicons name="checkmark-circle" size={Math.max(cellWidth * 0.22, 16)} color="white" />
                <Text
                  style={styles.countSelected}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {countText}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.cellCount,
                  { fontSize: Math.max(cellWidth * 0.14, 9.5) },
                  hasRecords
                    ? (mode === 'dark' ? styles.countOccupiedDark : styles.countOccupiedLight)
                    : (mode === 'dark' ? styles.countEmptyDark : styles.countEmptyLight)
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {countText}
              </Text>
            )}
          </TouchableOpacity>
        );
      }
      gridRows.push(
        <View key={i} style={styles.row}>
          {rowCells}
        </View>
      );
    }
    return gridRows;
  };

  return <View style={styles.gridContainer}>{renderGrid()}</View>;
};

const styles = StyleSheet.create({
  gridContainer: {
    marginTop: 20,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  // Estados de celda vacía (Empty Slots)
  cellEmptyLight: {
    backgroundColor: '#F2F2F7', // Gris claro premium que resalta sobre el fondo blanco
    borderColor: '#C7C7CC', // Borde gris más definido
    borderStyle: 'dashed',
    opacity: 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 0.5,
  },
  cellEmptyDark: {
    backgroundColor: '#1E1E1E',
    borderColor: '#48484A',
    borderStyle: 'dashed',
    opacity: 0.75,
  },
  // Estados de celda ocupada (Occupied Slots)
  cellOccupiedLight: {
    backgroundColor: '#E5E5EA', // Gris sólido
    borderColor: '#8E8E93', // Borde sólido más contrastante
    borderStyle: 'solid',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cellOccupiedDark: {
    backgroundColor: '#3A3A3C', // Gris más claro para que resalte del fondo
    borderColor: '#8E8E93', // Borde sólido y definido
    borderStyle: 'solid',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  // Estado seleccionado (Selected Cell)
  selectedCell: {
    borderStyle: 'solid',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  // Etiquetas de posición (A1, B2...)
  cellLabel: {
    fontFamily: 'System',
    fontWeight: 'bold',
  },
  labelSelected: {
    color: '#FFFFFF',
  },
  labelOccupiedLight: {
    color: '#1C1C1E',
  },
  labelOccupiedDark: {
    color: '#FFFFFF',
  },
  labelEmpty: {
    color: '#8E8E93',
  },
  // Textos de conteo (X records / Empty)
  cellCount: {
    fontFamily: 'System',
    fontWeight: '500',
    textAlign: 'center',
    width: '95%',
  },
  countOccupiedLight: {
    color: '#636366',
  },
  countOccupiedDark: {
    color: '#AEAEB2',
  },
  countEmptyLight: {
    color: '#AEAEB2',
  },
  countEmptyDark: {
    color: '#636366',
  },
  // Contenido especial para la celda seleccionada (check circle + text)
  selectedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '95%',
    gap: 2,
  },
  countSelected: {
    fontFamily: 'System',
    fontWeight: '600',
    fontSize: 9.5,
    color: '#F2F2F7',
    textAlign: 'center',
  },
});

export default ShelfGridSelectable;