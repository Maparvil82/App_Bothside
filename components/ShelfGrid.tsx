import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ShelfGridProps {
  rows: number;
  columns: number;
  highlightRow?: number;
  highlightColumn?: number;
}

const ShelfGrid: React.FC<ShelfGridProps> = ({ rows, columns, highlightRow, highlightColumn }) => {
  const screenWidth = Dimensions.get('window').width;
  const containerPadding = 16 * 2;
  const gridGap = 8;
  const totalGapWidth = (columns - 1) * gridGap;
  const availableWidth = screenWidth - (containerPadding * 2); 
  const cellWidth = (availableWidth - totalGapWidth) / columns;

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
      gridRows.push(<View key={i} style={styles.row}>{rowCells}</View>);
    }
    return gridRows;
  };

  return (
    <View style={styles.gridContainer}>
      {renderGrid()}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    marginTop: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightedCell: {
    backgroundColor: '#007AFF',
    borderColor: '#0056b3',
    borderStyle: 'solid',
  },
});

export default ShelfGrid; 