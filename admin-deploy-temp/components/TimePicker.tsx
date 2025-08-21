import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Clock, X } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

interface TimePickerProps {
  visible: boolean;
  onClose: () => void;
  onTimeSelect: (time: Date) => void;
  initialTime?: Date;
}

export default function TimePicker({
  visible,
  onClose,
  onTimeSelect,
  initialTime = new Date(),
}: TimePickerProps) {
  const [selectedHour, setSelectedHour] = useState(initialTime.getHours());
  const [selectedMinute, setSelectedMinute] = useState(initialTime.getMinutes());

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    const selectedTime = new Date();
    selectedTime.setHours(selectedHour, selectedMinute, 0, 0);
    onTimeSelect(selectedTime);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <X size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Time</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Time Display */}
        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>{formatTime(selectedHour, selectedMinute)}</Text>
        </View>

        {/* Time Selection */}
        <View style={styles.timeSelection}>
          {/* Hours */}
          <View style={styles.columnContainer}>
            <Text style={styles.columnTitle}>Hour</Text>
            <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
              {hours.map((hour) => (
                <TouchableOpacity
                  key={hour}
                  style={[
                    styles.timeOption,
                    selectedHour === hour && styles.selectedTimeOption,
                  ]}
                  onPress={() => setSelectedHour(hour)}
                >
                  <Text style={[
                    styles.timeOptionText,
                    selectedHour === hour && styles.selectedTimeOptionText,
                  ]}>
                    {hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.separator}>:</Text>

          {/* Minutes */}
          <View style={styles.columnContainer}>
            <Text style={styles.columnTitle}>Minute</Text>
            <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
              {minutes.map((minute) => (
                <TouchableOpacity
                  key={minute}
                  style={[
                    styles.timeOption,
                    selectedMinute === minute && styles.selectedTimeOption,
                  ]}
                  onPress={() => setSelectedMinute(minute)}
                >
                  <Text style={[
                    styles.timeOptionText,
                    selectedMinute === minute && styles.selectedTimeOptionText,
                  ]}>
                    {minute.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* AM/PM */}
          <View style={styles.columnContainer}>
            <Text style={styles.columnTitle}>Period</Text>
            <View style={styles.periodContainer}>
              <TouchableOpacity
                style={[
                  styles.periodOption,
                  selectedHour < 12 && styles.selectedPeriodOption,
                ]}
                onPress={() => {
                  if (selectedHour >= 12) {
                    setSelectedHour(selectedHour - 12);
                  }
                }}
              >
                <Text style={[
                  styles.periodOptionText,
                  selectedHour < 12 && styles.selectedPeriodOptionText,
                ]}>
                  AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodOption,
                  selectedHour >= 12 && styles.selectedPeriodOption,
                ]}
                onPress={() => {
                  if (selectedHour < 12) {
                    setSelectedHour(selectedHour + 12);
                  }
                }}
              >
                <Text style={[
                  styles.periodOptionText,
                  selectedHour >= 12 && styles.selectedPeriodOptionText,
                ]}>
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  placeholder: {
    width: 32,
  },
  timeDisplay: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  timeText: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  timeSelection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    flex: 1,
  },
  columnContainer: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  column: {
    height: 200,
    width: 60,
  },
  timeOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 2,
  },
  selectedTimeOption: {
    backgroundColor: Colors.primary.main,
  },
  timeOptionText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  selectedTimeOptionText: {
    color: Colors.text.white,
    fontWeight: '600',
  },
  separator: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text.primary,
    marginHorizontal: 10,
  },
  periodContainer: {
    gap: 8,
  },
  periodOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  selectedPeriodOption: {
    backgroundColor: Colors.primary.main,
    borderColor: Colors.primary.main,
  },
  periodOptionText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  selectedPeriodOptionText: {
    color: Colors.text.white,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: Colors.primary.main,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: Colors.text.white,
    fontWeight: '600',
  },
}); 