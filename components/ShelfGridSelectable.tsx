import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';

interface ShelfGridSelectableProps {
  rows: number;
  columns: number;
  onSelectCell: (row: number, column: number) => void;
}

const ShelfGridSelectable: React.FC<ShelfGridSelectableProps> = ({ rows, columns, onSelectCell }) => {
  const screenWidth = Dimensions.get('window').width;
  const containerPadding = 16 * 2; // Padding del contenedor padre
  const gridGap = 8;
  const totalGapWidth = (columns - 1) * gridGap;
  const cellWidth = (screenWidth - containerPadding - totalGapWidth) / columns;

  const renderGrid = () => {
    const gridRows = [];
    for (let i = 0; i < rows; i++) {
      const rowCells = [];
      for (let j = 0; j < columns; j++) {
        rowCells.push(
          <TouchableOpacity 
            key={`${i}-${j}`} 
            style={[styles.cell, { width: cellWidth, height: cellWidth }]} 
            onPress={() => onSelectCell(i, j)}
          />
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
    justifyContent: 'space-between',
  },
  cell: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
});

export default ShelfGridSelectable; 