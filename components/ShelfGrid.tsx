import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';

interface ShelfGridProps {
  rows: number;
  columns: number;
  highlightRow?: number;
  highlightColumn?: number;
}

const ShelfGrid: React.FC<ShelfGridProps> = ({ rows, columns, highlightRow, highlightColumn }) => {
  const screenWidth = Dimensions.get('window').width;
  const containerPadding = 32; // Padding total (16 * 2)
  const gridGap = 12; // Espaciado unificado
  const totalGapWidth = (columns - 1) * gridGap;
  const availableWidth = screenWidth - containerPadding;
  const cellWidth = Math.min((availableWidth - totalGapWidth) / columns, 80); // Máximo 80px por celda

  const renderGrid = () => {
    const gridRows = [];
    for (let i = 0; i < rows; i++) {
      const rowCells = [];
      for (let j = 0; j < columns; j++) {
        const isHighlighted = (i + 1) === highlightRow && (j + 1) === highlightColumn;
        rowCells.push(
          <View key={`${i}-${j}`} style={[styles.cell, { width: cellWidth, height: cellWidth }, isHighlighted && styles.highlightedCell]}>
            {isHighlighted && <Ionicons name="disc" size={cellWidth * 0.6} color="white" />}
          </View>
        );
      }
      gridRows.push(<View key={i} style={[styles.row, { marginBottom: i < rows - 1 ? gridGap : 0 }]}>{rowCells}</View>);
    }
    return gridRows;
  };

  return (
    <View style={styles.gridContainer}>
      <View style={styles.gridContent}>
        {renderGrid()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    marginTop: 16,
  },
  gridContent: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  cell: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightedCell: {
    backgroundColor: AppColors.primary,
    borderColor: '#0056b3',
    borderStyle: 'solid',
  },
});

export default ShelfGrid; 