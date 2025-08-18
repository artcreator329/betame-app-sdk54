import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Shield, 
  User, 
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  icon: React.ReactNode;
}

interface DocumentType {
  id: string;
  name: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  verified: boolean;
}

export default function EKYCVerificationScreen() {
  const router = useRouter();
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState<'personal' | 'documents' | 'verification' | 'review' | 'complete'>('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Personal Information
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    icNumber: '',
    dateOfBirth: '',
    phoneNumber: '',
    email: '',
    address: '',
    city: '',
    postcode: '',
    state: ''
  });

  // Document uploads
  const [documents, setDocuments] = useState<DocumentType[]>([
    {
      id: 'ic_front',
      name: 'IC Front (MyKad)',
      description: 'Front side of your Malaysian Identity Card',
      required: true,
      uploaded: false,
      verified: false
    },
    {
      id: 'ic_back',
      name: 'IC Back (MyKad)',
      description: 'Back side of your Malaysian Identity Card',
      required: true,
      uploaded: false,
      verified: false
    },
    {
      id: 'selfie',
      name: 'Selfie with IC',
      description: 'Photo of yourself holding your IC',
      required: true,
      uploaded: false,
      verified: false
    },
    {
      id: 'bank_statement',
      name: 'Bank Statement (Optional)',
      description: 'Recent bank statement for payment verification',
      required: false,
      uploaded: false,
      verified: false
    }
  ]);

  const verificationSteps: VerificationStep[] = [
    {
      id: 'personal',
      title: 'Personal Information',
      description: 'Enter your personal details',
      status: currentStep === 'personal' ? 'in_progress' : currentStep === 'documents' || currentStep === 'verification' || currentStep === 'review' || currentStep === 'complete' ? 'completed' : 'pending',
      icon: <User size={20} />
    },
    {
      id: 'documents',
      title: 'Document Upload',
      description: 'Upload required documents',
      status: currentStep === 'documents' ? 'in_progress' : currentStep === 'verification' || currentStep === 'review' || currentStep === 'complete' ? 'completed' : 'pending',
      icon: <FileText size={20} />
    },
    {
      id: 'verification',
      title: 'Identity Verification',
      description: 'Verification in progress',
      status: currentStep === 'verification' ? 'in_progress' : currentStep === 'review' || currentStep === 'complete' ? 'completed' : 'pending',
      icon: <Shield size={20} />
    },
    {
      id: 'review',
      title: 'Review & Approval',
      description: 'Final review process',
      status: currentStep === 'review' ? 'in_progress' : currentStep === 'complete' ? 'completed' : 'pending',
      icon: <CheckCircle size={20} />
    }
  ];

  const handlePersonalInfoChange = (field: string, value: string) => {
    setPersonalInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleDocumentUpload = (documentId: string) => {
    // Simulate document upload
    Alert.alert(
      'Document Upload',
      'This is a mock implementation. In the real app, this would open camera/gallery for document capture.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Simulate Upload', 
          onPress: () => {
            setDocuments(prev => 
              prev.map(doc => 
                doc.id === documentId 
                  ? { ...doc, uploaded: true, verified: true }
                  : doc
              )
            );
            Alert.alert('Success', 'Document uploaded successfully!');
          }
        }
      ]
    );
  };

  const handleNextStep = () => {
    if (currentStep === 'personal') {
      // Validate personal information
      const requiredFields = ['fullName', 'icNumber', 'dateOfBirth', 'phoneNumber', 'email', 'address', 'city', 'postcode', 'state'];
      const missingFields = requiredFields.filter(field => !personalInfo[field as keyof typeof personalInfo]);
      
      if (missingFields.length > 0) {
        Alert.alert('Missing Information', 'Please fill in all required fields.');
        return;
      }
      setCurrentStep('documents');
    } else if (currentStep === 'documents') {
      // Check if required documents are uploaded
      const requiredDocuments = documents.filter(doc => doc.required);
      const uploadedRequired = requiredDocuments.every(doc => doc.uploaded);
      
      if (!uploadedRequired) {
        Alert.alert('Missing Documents', 'Please upload all required documents.');
        return;
      }
      setCurrentStep('verification');
      setIsProcessing(true);
      
      // Simulate verification process
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep('review');
      }, 3000);
    } else if (currentStep === 'review') {
      setCurrentStep('complete');
    }
  };

  const handleBackStep = () => {
    if (currentStep === 'documents') {
      setCurrentStep('personal');
    } else if (currentStep === 'verification') {
      setCurrentStep('documents');
    } else if (currentStep === 'review') {
      setCurrentStep('verification');
    }
  };

  const handleSubmitVerification = () => {
    setIsSubmitting(true);
    
    // Simulate submission process
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Verification Submitted!',
        'Your eKYC verification has been submitted successfully. You will receive updates via email and SMS. The verification process typically takes 1-3 business days.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/become-service-provider')
          }
        ]
      );
    }, 2000);
  };

  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      {verificationSteps.map((step, index) => (
        <View key={step.id} style={styles.stepContainer}>
          <View style={styles.stepIndicator}>
            <View style={[
              styles.stepIcon,
              { 
                backgroundColor: step.status === 'completed' ? colors.status.success : 
                               step.status === 'in_progress' ? colors.primary.main : 
                               colors.background.tertiary,
                borderColor: step.status === 'completed' ? colors.status.success : 
                           step.status === 'in_progress' ? colors.primary.main : 
                           colors.border.light
              }
            ]}>
              {step.status === 'completed' ? (
                <CheckCircle size={16} color="white" />
              ) : (
                step.icon
              )}
            </View>
            {index < verificationSteps.length - 1 && (
              <View style={[
                styles.stepLine,
                { 
                  backgroundColor: step.status === 'completed' ? colors.status.success : 
                                 colors.border.light 
                }
              ]} />
            )}
          </View>
          <View style={styles.stepInfo}>
            <Text style={[styles.stepTitle, { color: colors.text.primary }]}>{step.title}</Text>
            <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>{step.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderPersonalInfoStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Personal Information</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
        Please provide your accurate personal information for verification
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Full Name (as per IC)</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
          value={personalInfo.fullName}
          onChangeText={(text) => handlePersonalInfoChange('fullName', text)}
          placeholder="Enter your full name"
          placeholderTextColor={colors.text.tertiary}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>IC Number</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
          value={personalInfo.icNumber}
          onChangeText={(text) => handlePersonalInfoChange('icNumber', text)}
          placeholder="e.g., 880101-01-1234"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Date of Birth</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
          value={personalInfo.dateOfBirth}
          onChangeText={(text) => handlePersonalInfoChange('dateOfBirth', text)}
          placeholder="DD/MM/YYYY"
          placeholderTextColor={colors.text.tertiary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Phone Number</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
          value={personalInfo.phoneNumber}
          onChangeText={(text) => handlePersonalInfoChange('phoneNumber', text)}
          placeholder="e.g., 012-3456789"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Email Address</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
          value={personalInfo.email}
          onChangeText={(text) => handlePersonalInfoChange('email', text)}
          placeholder="your.email@example.com"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Address</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
          value={personalInfo.address}
          onChangeText={(text) => handlePersonalInfoChange('address', text)}
          placeholder="Enter your full address"
          placeholderTextColor={colors.text.tertiary}
          multiline
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={[styles.inputLabel, { color: colors.text.primary }]}>City</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
            value={personalInfo.city}
            onChangeText={(text) => handlePersonalInfoChange('city', text)}
            placeholder="City"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
          <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Postcode</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
            value={personalInfo.postcode}
            onChangeText={(text) => handlePersonalInfoChange('postcode', text)}
            placeholder="Postcode"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>State</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
          value={personalInfo.state}
          onChangeText={(text) => handlePersonalInfoChange('state', text)}
          placeholder="e.g., Selangor, Kuala Lumpur"
          placeholderTextColor={colors.text.tertiary}
        />
      </View>
    </View>
  );

  const renderDocumentsStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Document Upload</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
        Please upload clear photos of your documents for verification
      </Text>

      <View style={styles.documentsContainer}>
        {documents.map((document) => (
          <View key={document.id} style={[styles.documentCard, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
            <View style={styles.documentHeader}>
              <View style={styles.documentInfo}>
                <Text style={[styles.documentName, { color: colors.text.primary }]}>{document.name}</Text>
                <Text style={[styles.documentDescription, { color: colors.text.secondary }]}>{document.description}</Text>
                {document.required && (
                  <Text style={[styles.requiredBadge, { color: colors.status.error }]}>Required</Text>
                )}
              </View>
              {document.uploaded && (
                <CheckCircle size={24} color={colors.status.success} />
              )}
            </View>
            
            {!document.uploaded && (
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: colors.primary.main }]}
                onPress={() => handleDocumentUpload(document.id)}
              >
                <Upload size={20} color="white" />
                <Text style={[styles.uploadButtonText, { color: colors.text.white }]}>Upload Document</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
        <AlertCircle size={20} color={colors.status.warning} />
        <Text style={[styles.infoText, { color: colors.text.secondary }]}>
          Ensure all documents are clear, well-lit, and show all information. Blurry or incomplete documents may delay verification.
        </Text>
      </View>
    </View>
  );

  const renderVerificationStep = () => (
    <View style={styles.verificationContainer}>
      <ActivityIndicator size="large" color={colors.primary.main} />
      <Text style={[styles.verificationTitle, { color: colors.text.primary }]}>Verification in Progress</Text>
      <Text style={[styles.verificationSubtitle, { color: colors.text.secondary }]}>
        We are verifying your identity and documents. This may take a few minutes.
      </Text>
      
      <View style={styles.verificationSteps}>
        <View style={styles.verificationStep}>
          <CheckCircle size={20} color={colors.status.success} />
          <Text style={[styles.verificationStepText, { color: colors.text.secondary }]}>Personal information validated</Text>
        </View>
        <View style={styles.verificationStep}>
          <CheckCircle size={20} color={colors.status.success} />
          <Text style={[styles.verificationStepText, { color: colors.text.secondary }]}>Documents uploaded successfully</Text>
        </View>
        <View style={styles.verificationStep}>
          <Clock size={20} color={colors.primary.main} />
          <Text style={[styles.verificationStepText, { color: colors.text.secondary }]}>Identity verification in progress...</Text>
        </View>
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Review & Submit</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
        Please review your information before submission
      </Text>

      <View style={[styles.reviewCard, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
        <Text style={[styles.reviewSectionTitle, { color: colors.text.primary }]}>Personal Information</Text>
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Full Name:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.fullName}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>IC Number:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.icNumber}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Phone:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.phoneNumber}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Email:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.email}</Text>
        </View>
      </View>

      <View style={[styles.reviewCard, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
        <Text style={[styles.reviewSectionTitle, { color: colors.text.primary }]}>Documents Uploaded</Text>
        {documents.filter(doc => doc.uploaded).map((document) => (
          <View key={document.id} style={styles.reviewItem}>
            <CheckCircle size={16} color={colors.status.success} />
            <Text style={[styles.reviewValue, { color: colors.text.primary, marginLeft: 8 }]}>{document.name}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
        <Shield size={20} color={colors.status.success} />
        <Text style={[styles.infoText, { color: colors.text.secondary }]}>
          Your information will be securely processed and verified according to Malaysian eKYC regulations.
        </Text>
      </View>
    </View>
  );

  const renderCompleteStep = () => (
    <View style={styles.completeContainer}>
      <View style={styles.successIcon}>
        <CheckCircle size={64} color={colors.status.success} />
      </View>
      <Text style={[styles.completeTitle, { color: colors.text.primary }]}>Verification Submitted!</Text>
      <Text style={[styles.completeSubtitle, { color: colors.text.secondary }]}>
        Your eKYC verification has been submitted successfully
      </Text>
      
      <View style={[styles.completeInfo, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
        <Text style={[styles.completeInfoTitle, { color: colors.text.primary }]}>What happens next?</Text>
        <View style={styles.completeInfoItem}>
          <Clock size={16} color={colors.text.secondary} />
          <Text style={[styles.completeInfoText, { color: colors.text.secondary }]}>
            Verification typically takes 1-3 business days
          </Text>
        </View>
        <View style={styles.completeInfoItem}>
          <Mail size={16} color={colors.text.secondary} />
          <Text style={[styles.completeInfoText, { color: colors.text.secondary }]}>
            You'll receive updates via email and SMS
          </Text>
        </View>
        <View style={styles.completeInfoItem}>
          <Phone size={16} color={colors.text.secondary} />
          <Text style={[styles.completeInfoText, { color: colors.text.secondary }]}>
            Our team may contact you if additional information is needed
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.primary.main }]}
        onPress={handleSubmitVerification}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={[styles.submitButtonText, { color: colors.text.white }]}>Submit Verification</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>eKYC Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Indicator */}
      <View style={[styles.progressSection, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
        {renderProgressIndicator()}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 'personal' && renderPersonalInfoStep()}
        {currentStep === 'documents' && renderDocumentsStep()}
        {currentStep === 'verification' && renderVerificationStep()}
        {currentStep === 'review' && renderReviewStep()}
        {currentStep === 'complete' && renderCompleteStep()}
      </ScrollView>

      {/* Action Buttons */}
      {currentStep !== 'verification' && currentStep !== 'complete' && (
        <View style={[styles.actionContainer, { backgroundColor: colors.background.tertiary }]}>
          {currentStep !== 'personal' && (
            <TouchableOpacity
              style={[styles.backButton, { borderColor: colors.border.light }]}
              onPress={handleBackStep}
            >
              <Text style={[styles.backButtonText, { color: colors.text.primary }]}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: colors.primary.main }]}
            onPress={handleNextStep}
          >
            <Text style={[styles.nextButtonText, { color: colors.text.white }]}>
              {currentStep === 'review' ? 'Submit' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressSection: {
    padding: 20,
    borderBottomWidth: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
  },
  stepIndicator: {
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  stepLine: {
    width: 2,
    height: 20,
    marginVertical: 4,
  },
  stepInfo: {
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 10,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContent: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  documentsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  documentCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  requiredBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  verificationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  verificationTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  verificationSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  verificationSteps: {
    width: '100%',
    gap: 16,
  },
  verificationStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationStepText: {
    fontSize: 14,
    marginLeft: 12,
  },
  reviewCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 14,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    marginBottom: 20,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  completeInfo: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
  },
  completeInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  completeInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  completeInfoText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
