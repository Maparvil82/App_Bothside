import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

interface ShelfGridProps {
  rows: number;
  columns: number;
}

const ShelfGrid: React.FC<ShelfGridProps> = ({ rows, columns }) => {
  const screenWidth = Dimensions.get('window').width;
  // Ajustar por el padding del contenedor padre (View con style=styles.section)
  const containerPadding = 16 * 2;
  const gridGap = 8;
  const totalGapWidth = (columns - 1) * gridGap;
  const cellWidth = (screenWidth - containerPadding - totalGapWidth) / columns;

  const renderGrid = () => {
    const gridRows = [];
    for (let i = 0; i < rows; i++) {
      const rowCells = [];
      for (let j = 0; j < columns; j++) {
        rowCells.push(<View key={`${i}-${j}`} style={[styles.cell, { width: cellWidth, height: cellWidth }]} />);
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
    justifyContent: 'space-between',
  },
  cell: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
  },
});

export default ShelfGrid; 