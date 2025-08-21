import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { X, AlertTriangle, Shield, Ban } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { moderationService, UserWarning, UserModerationStatus } from '../lib/moderation-service';

interface ModerationWarningModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

export function ModerationWarningModal({ visible, onClose, userId }: ModerationWarningModalProps) {
  const [warnings, setWarnings] = useState<UserWarning[]>([]);
  const [moderationStatus, setModerationStatus] = useState<UserModerationStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      loadModerationData();
    }
  }, [visible, userId]);

  const loadModerationData = async () => {
    setLoading(true);
    try {
      const [warningsData, statusData] = await Promise.all([
        moderationService.getUserWarnings(userId, 5),
        moderationService.getUserModerationStatus(userId)
      ]);
      
      setWarnings(warningsData);
      setModerationStatus(statusData);
    } catch (error) {
      console.error('Error loading moderation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeWarning = async (warningId: string) => {
    const success = await moderationService.acknowledgeWarning(warningId, userId);
    if (success) {
      setWarnings(prev => prev.map(w => 
        w.id === warningId 
          ? { ...w, acknowledged_at: new Date().toISOString() }
          : w
      ));
    }
  };

  const getWarningIcon = (warningType: string) => {
    switch (warningType) {
      case 'ban_notice':
        return <Ban size={24} color={Colors.status.error} />;
      case 'final_warning':
        return <AlertTriangle size={24} color="#FF9500" />;
      default:
        return <Shield size={24} color="#FFA500" />;
    }
  };

  const getWarningColor = (warningType: string) => {
    switch (warningType) {
      case 'ban_notice':
        return Colors.status.error;
      case 'final_warning':
        return '#FF9500';
      default:
        return '#FFA500';
    }
  };

  const formatWarningType = (warningType: string) => {
    switch (warningType) {
      case 'first_warning':
        return 'First Warning';
      case 'second_warning':
        return 'Second Warning';
      case 'final_warning':
        return 'Final Warning';
      case 'ban_notice':
        return 'Account Banned';
      default:
        return 'Warning';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Shield size={24} color={Colors.primary.main} />
              <Text style={styles.title}>Account Safety</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Account Status */}
            {moderationStatus && (
              <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>Account Status</Text>
                <View style={[
                  styles.statusCard,
                  moderationStatus.is_banned ? styles.bannedCard : styles.activeCard
                ]}>
                  <View style={styles.statusHeader}>
                    <Text style={[
                      styles.statusText,
                      moderationStatus.is_banned ? styles.bannedText : styles.activeText
                    ]}>
                      {moderationStatus.is_banned ? 'Account Restricted' : 'Account Active'}
                    </Text>
                  </View>
                  
                  {moderationStatus.is_banned && (
                    <View style={styles.banDetails}>
                      <Text style={styles.banReason}>
                        Reason: {moderationStatus.ban_reason}
                      </Text>
                      {moderationStatus.banned_until && (
                        <Text style={styles.banDuration}>
                          Until: {formatDate(moderationStatus.banned_until)}
                        </Text>
                      )}
                    </View>
                  )}

                  <View style={styles.violationStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{moderationStatus.total_violations}</Text>
                      <Text style={styles.statLabel}>Total Violations</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{moderationStatus.contact_info_violations}</Text>
                      <Text style={styles.statLabel}>Contact Info</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{moderationStatus.warning_count}</Text>
                      <Text style={styles.statLabel}>Warnings</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Recent Warnings */}
            {warnings.length > 0 && (
              <View style={styles.warningsSection}>
                <Text style={styles.sectionTitle}>Recent Warnings</Text>
                {warnings.map((warning) => (
                  <View key={warning.id} style={styles.warningCard}>
                    <View style={styles.warningHeader}>
                      {getWarningIcon(warning.warning_type)}
                      <View style={styles.warningInfo}>
                        <Text style={[
                          styles.warningTitle,
                          { color: getWarningColor(warning.warning_type) }
                        ]}>
                          {formatWarningType(warning.warning_type)}
                        </Text>
                        <Text style={styles.warningDate}>
                          {formatDate(warning.sent_at)}
                        </Text>
                      </View>
                      {!warning.acknowledged_at && (
                        <TouchableOpacity
                          style={styles.acknowledgeButton}
                          onPress={() => handleAcknowledgeWarning(warning.id)}
                        >
                          <Text style={styles.acknowledgeButtonText}>OK</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.warningMessage}>
                      {warning.warning_message}
                    </Text>
                    {warning.acknowledged_at && (
                      <Text style={styles.acknowledgedText}>
                        ✓ Acknowledged on {formatDate(warning.acknowledged_at)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Safety Guidelines */}
            <View style={styles.guidelinesSection}>
              <Text style={styles.sectionTitle}>Safety Guidelines</Text>
              <View style={styles.guidelineCard}>
                <Text style={styles.guidelineTitle}>🚫 Do Not Share:</Text>
                <Text style={styles.guidelineText}>
                  • Phone numbers or contact information{'\n'}
                  • Email addresses{'\n'}
                  • Social media handles{'\n'}
                  • External messaging app details
                </Text>
                
                <Text style={styles.guidelineTitle}>✅ Use Platform Features:</Text>
                <Text style={styles.guidelineText}>
                  • Built-in messaging system{'\n'}
                  • Service offers and payments{'\n'}
                  • Order tracking and communication
                </Text>

                <Text style={styles.guidelineTitle}>⚠️ Violation Consequences:</Text>
                <Text style={styles.guidelineText}>
                  • 3 violations = 24 hour restriction{'\n'}
                  • 5 violations = 7 day restriction{'\n'}
                  • 7+ violations = permanent ban
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
              <Text style={styles.closeFooterButtonText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    width: '100%',
    maxHeight: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  activeCard: {
    backgroundColor: '#F0F9FF',
    borderColor: Colors.status.success,
  },
  bannedCard: {
    backgroundColor: '#FEF2F2',
    borderColor: Colors.status.error,
  },
  statusHeader: {
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeText: {
    color: Colors.status.success,
  },
  bannedText: {
    color: Colors.status.error,
  },
  banDetails: {
    marginBottom: 12,
  },
  banReason: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  banDuration: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  violationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  warningsSection: {
    marginBottom: 24,
  },
  warningCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningInfo: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningDate: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  acknowledgeButton: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  acknowledgeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  warningMessage: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  acknowledgedText: {
    fontSize: 12,
    color: Colors.status.success,
    marginTop: 8,
    fontStyle: 'italic',
  },
  guidelinesSection: {
    marginBottom: 24,
  },
  guidelineCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
  },
  guidelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 12,
    marginBottom: 6,
  },
  guidelineText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  closeFooterButton: {
    backgroundColor: Colors.primary.main,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeFooterButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});