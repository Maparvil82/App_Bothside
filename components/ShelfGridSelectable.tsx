import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

interface ShelfGridSelectableProps {
  rows: number;
  columns: number;
  onSelectCell: (row: number, column: number) => void;
  selectedRow?: number;
  selectedColumn?: number;
}

const ShelfGridSelectable: React.FC<ShelfGridSelectableProps> = ({
  rows,
  columns,
  onSelectCell,
  selectedRow,
  selectedColumn,
}) => {
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
  const screenWidth = Dimensions.get('window').width;
  const containerPadding = 16 * 2;
  const gridGap = 8;
  const totalGapWidth = (columns - 1) * gridGap;
  const availableWidth = screenWidth - containerPadding;
  const cellWidth = (availableWidth - totalGapWidth) / columns;

  const renderGrid = () => {
    const gridRows = [];
    for (let i = 0; i < rows; i++) {
      const rowCells = [];
      for (let j = 0; j < columns; j++) {
        const isSelected = i === selectedRow && j === selectedColumn;
        rowCells.push(
          <TouchableOpacity
            key={`${i}-${j}`}
            style={[
              styles.cell,
              { width: cellWidth, height: cellWidth },
              { width: cellWidth, height: cellWidth },
              isSelected && [styles.selectedCell, { backgroundColor: primaryColor }],
            ]}
            onPress={() => onSelectCell(i, j)}
          />
        );
      }
      gridRows.push(<View key={i} style={styles.row}>{rowCells}</View>);
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
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
  },
  selectedCell: {
    backgroundColor: AppColors.primary,
    borderColor: '#0056b3',
    borderStyle: 'solid',
  },
});

export default ShelfGridSelectable; 