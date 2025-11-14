import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TimePickerProps {
  label: string;
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

const { width, height } = Dimensions.get('window');

const TimePicker: React.FC<TimePickerProps> = ({
  label,
  hour,
  minute,
  onChange,
}) => {
  const [isHourPickerVisible, setHourPickerVisible] = useState(false);
  const [isMinutePickerVisible, setMinutePickerVisible] = useState(false);

  // Generar array de horas (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // Generar array de minutos (0-59)
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleHourSelect = (selectedHour: number) => {
    onChange(selectedHour, minute);
    setHourPickerVisible(false);
  };

  const handleMinuteSelect = (selectedMinute: number) => {
    onChange(hour, selectedMinute);
    setMinutePickerVisible(false);
  };

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  const renderHourItem = ({ item }: { item: number }) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        hour === item && styles.selectedItem,
      ]}
      onPress={() => handleHourSelect(item)}
    >
      <Text
        style={[
          styles.listItemText,
          hour === item && styles.selectedItemText,
        ]}
      >
        {formatNumber(item)}
      </Text>
    </TouchableOpacity>
  );

  const renderMinuteItem = ({ item }: { item: number }) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        minute === item && styles.selectedItem,
      ]}
      onPress={() => handleMinuteSelect(item)}
    >
      <Text
        style={[
          styles.listItemText,
          minute === item && styles.selectedItemText,
        ]}
      >
        {formatNumber(item)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Time Input Row */}
      <View style={styles.timeInputRow}>
        {/* Hour Picker */}
        <TouchableOpacity
          style={styles.timeInput}
          onPress={() => setHourPickerVisible(true)}
        >
          <Text style={styles.timeInputText}>{formatNumber(hour)}</Text>
          <Ionicons name="chevron-down" size={18} color="#666" />
        </TouchableOpacity>

        {/* Separator */}
        <Text style={styles.separator}>:</Text>

        {/* Minute Picker */}
        <TouchableOpacity
          style={styles.timeInput}
          onPress={() => setMinutePickerVisible(true)}
        >
          <Text style={styles.timeInputText}>{formatNumber(minute)}</Text>
          <Ionicons name="chevron-down" size={18} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Hour Picker Modal */}
      <Modal
        visible={isHourPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setHourPickerVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setHourPickerVisible(false)}
          >
            <View style={styles.dropdownContainer}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Seleccionar hora</Text>
                <TouchableOpacity onPress={() => setHourPickerVisible(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={hours}
                renderItem={renderHourItem}
                keyExtractor={(item) => `hour-${item}`}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                style={styles.dropdownList}
              />
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Minute Picker Modal */}
      <Modal
        visible={isMinutePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMinutePickerVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setMinutePickerVisible(false)}
          >
            <View style={styles.dropdownContainer}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Seleccionar minutos</Text>
                <TouchableOpacity onPress={() => setMinutePickerVisible(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={minutes}
                renderItem={renderMinuteItem}
                keyExtractor={(item) => `minute-${item}`}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                style={styles.dropdownList}
              />
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 70,
  },
  timeInputText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  separator: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.5,
    paddingBottom: 20,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  dropdownList: {
    maxHeight: height * 0.4,
    paddingHorizontal: 12,
  },
  listItem: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
  },
  selectedItem: {
    backgroundColor: '#000',
  },
  listItemText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
  },
  selectedItemText: {
    color: '#FFF',
    fontWeight: '600',
  },
});

export default TimePicker;
