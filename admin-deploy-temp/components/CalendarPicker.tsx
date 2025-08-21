import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface CalendarPickerProps {
  visible: boolean;
  onClose: () => void;
  onDateSelect: (startDate: Date, endDate?: Date) => void;
  allowRange?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

interface DayData {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isStartDate: boolean;
  isEndDate: boolean;
}

export default function CalendarPicker({
  visible,
  onClose,
  onDateSelect,
  allowRange = true,
  minDate,
  maxDate,
}: CalendarPickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [isSelectingEndDate, setIsSelectingEndDate] = useState(false);

  const today = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  useEffect(() => {
    if (!visible) {
      // Reset selection when modal closes
      setSelectedStartDate(null);
      setSelectedEndDate(null);
      setIsSelectingEndDate(false);
    }
  }, [visible]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = (): DayData[] => {
    const days: DayData[] = [];
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
    
    // Add days from previous month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
    
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(prevYear, prevMonth, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        isSelected: isDateSelected(date),
        isInRange: isDateInRange(date),
        isStartDate: isSameDay(date, selectedStartDate),
        isEndDate: isSameDay(date, selectedEndDate),
      });
    }
    
    // Add days from current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        isSelected: isDateSelected(date),
        isInRange: isDateInRange(date),
        isStartDate: isSameDay(date, selectedStartDate),
        isEndDate: isSameDay(date, selectedEndDate),
      });
    }
    
    // Add days from next month to fill the grid
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(nextYear, nextMonth, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        isSelected: isDateSelected(date),
        isInRange: isDateInRange(date),
        isStartDate: isSameDay(date, selectedStartDate),
        isEndDate: isSameDay(date, selectedEndDate),
      });
    }
    
    return days;
  };

  const isSameDay = (date1: Date, date2: Date | null) => {
    if (!date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const isDateSelected = (date: Date) => {
    if (allowRange) {
      return isSameDay(date, selectedStartDate) || isSameDay(date, selectedEndDate);
    }
    return isSameDay(date, selectedStartDate);
  };

  const isDateInRange = (date: Date) => {
    if (!allowRange || !selectedStartDate || !selectedEndDate) return false;
    return date >= selectedStartDate && date <= selectedEndDate;
  };

  const handleDatePress = (date: Date) => {
    if (minDate && date < minDate) return;
    if (maxDate && date > maxDate) return;

    if (allowRange) {
      if (!selectedStartDate || isSelectingEndDate) {
        // Start selecting range
        setSelectedStartDate(date);
        setSelectedEndDate(null);
        setIsSelectingEndDate(true);
      } else {
        // Complete range selection
        if (date >= selectedStartDate) {
          setSelectedEndDate(date);
          setIsSelectingEndDate(false);
        } else {
          // If end date is before start date, swap them
          setSelectedEndDate(selectedStartDate);
          setSelectedStartDate(date);
          setIsSelectingEndDate(false);
        }
      }
    } else {
      // Single date selection
      setSelectedStartDate(date);
      setSelectedEndDate(null);
    }
  };

  const handleConfirm = () => {
    if (selectedStartDate) {
      onDateSelect(selectedStartDate, selectedEndDate || undefined);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setIsSelectingEndDate(false);
    onClose();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const canGoToPreviousMonth = () => {
    if (!minDate) return true;
    const prevMonth = new Date(currentYear, currentMonth - 1, 1);
    return prevMonth >= minDate;
  };

  const canGoToNextMonth = () => {
    if (!maxDate) return true;
    const nextMonth = new Date(currentYear, currentMonth + 1, 1);
    return nextMonth <= maxDate;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatSelectedDate = () => {
    if (!selectedStartDate) return 'Select date';
    if (!allowRange) return formatDate(selectedStartDate);
    if (!selectedEndDate) return `${formatDate(selectedStartDate)} - Select end date`;
    return `${formatDate(selectedStartDate)} - ${formatDate(selectedEndDate)}`;
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
          <Text style={styles.headerTitle}>Select Date{allowRange ? 's' : ''}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Month Navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity 
            onPress={goToPreviousMonth}
            disabled={!canGoToPreviousMonth()}
            style={[styles.navButton, !canGoToPreviousMonth() && styles.navButtonDisabled]}
          >
            <ChevronLeft size={20} color={canGoToPreviousMonth() ? Colors.primary.main : Colors.text.secondary} />
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>{formatDate(currentDate)}</Text>
          
          <TouchableOpacity 
            onPress={goToNextMonth}
            disabled={!canGoToNextMonth()}
            style={[styles.navButton, !canGoToNextMonth() && styles.navButtonDisabled]}
          >
            <ChevronRight size={20} color={canGoToNextMonth() ? Colors.primary.main : Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Week Days Header */}
        <View style={styles.weekDaysContainer}>
          {weekDays.map((day, index) => (
            <Text key={index} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((dayData, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayButton,
                !dayData.isCurrentMonth && styles.otherMonthDay,
                dayData.isToday && styles.todayButton,
                dayData.isSelected && styles.selectedDayButton,
                dayData.isInRange && styles.rangeDayButton,
                dayData.isStartDate && styles.startDateButton,
                dayData.isEndDate && styles.endDateButton,
              ]}
              onPress={() => handleDatePress(dayData.date)}
              disabled={!dayData.isCurrentMonth}
            >
              <Text style={[
                styles.dayText,
                !dayData.isCurrentMonth && styles.otherMonthText,
                dayData.isToday && styles.todayText,
                dayData.isSelected && styles.selectedDayText,
                dayData.isInRange && styles.rangeDayText,
              ]}>
                {dayData.day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selection Info */}
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>{formatSelectedDate()}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.confirmButton, !selectedStartDate && styles.confirmButtonDisabled]} 
            onPress={handleConfirm}
            disabled={!selectedStartDate}
          >
            <Text style={[styles.confirmButtonText, !selectedStartDate && styles.confirmButtonTextDisabled]}>
              Confirm
            </Text>
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
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navButton: {
    padding: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  dayButton: {
    width: (width - 40) / 7,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  todayButton: {
    backgroundColor: Colors.primary.light,
  },
  selectedDayButton: {
    backgroundColor: Colors.primary.main,
  },
  rangeDayButton: {
    backgroundColor: Colors.primary.light,
  },
  startDateButton: {
    backgroundColor: Colors.primary.main,
  },
  endDateButton: {
    backgroundColor: Colors.primary.main,
  },
  dayText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  otherMonthText: {
    color: Colors.text.secondary,
  },
  todayText: {
    color: Colors.primary.main,
    fontWeight: '600',
  },
  selectedDayText: {
    color: Colors.text.white,
    fontWeight: '600',
  },
  rangeDayText: {
    color: Colors.primary.main,
  },
  selectionInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
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
  confirmButtonDisabled: {
    backgroundColor: Colors.background.secondary,
  },
  confirmButtonText: {
    fontSize: 16,
    color: Colors.text.white,
    fontWeight: '600',
  },
  confirmButtonTextDisabled: {
    color: Colors.text.secondary,
  },
}); 