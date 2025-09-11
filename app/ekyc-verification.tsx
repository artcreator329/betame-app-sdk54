import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AIDocumentAnalysisService } from '@/lib/ai-document-analysis';
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
  CreditCard,
  Scale,
  Download,
  XCircle
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/auth-service';
import { EKYCService } from '@/lib/ekyc-service';
import { supabase } from '@/lib/supabase';

import { PDPAConsentModal } from '@/components/PDPAConsentModal';
import { RealNameInputModal } from '@/components/RealNameInputModal';
import { PDPAConsentPDFService, PDPAConsentData } from '@/lib/pdpa-consent-pdf-service';

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
  uri?: string;
}

export default function EKYCVerificationScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<'identity_document' | 'personal' | 'documents' | 'verification' | 'review' | 'complete'>('identity_document');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isAnalyzingDocument, setIsAnalyzingDocument] = useState(false);
  const [showPDPAConsent, setShowPDPAConsent] = useState(false);
  const [pdpaConsentGiven, setPDPAConsentGiven] = useState(false);
  const [showRealNameInput, setShowRealNameInput] = useState(false);
  const [realName, setRealName] = useState('');
  const [pdpaConsentPdfUrl, setPDPAConsentPdfUrl] = useState<string>('');

  // Malaysian States and Federal Territories
  const malaysianStates = [
    'Johor',
    'Kedah',
    'Kelantan',
    'Melaka',
    'Negeri Sembilan',
    'Pahang',
    'Perak',
    'Perlis',
    'Pulau Pinang',
    'Sabah',
    'Sarawak',
    'Selangor',
    'Terengganu',
    'Kuala Lumpur',
    'Labuan',
    'Putrajaya'
  ];

  // List of Countries
  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
    'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
    'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
    'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
    'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
    'Fiji', 'Finland', 'France',
    'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
    'Haiti', 'Honduras', 'Hungary',
    'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Ivory Coast',
    'Jamaica', 'Japan', 'Jordan',
    'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
    'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
    'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
    'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
    'Oman',
    'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
    'Qatar',
    'Romania', 'Russia', 'Rwanda',
    'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
    'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
    'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
    'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
    'Yemen',
    'Zambia', 'Zimbabwe'
  ];

  // Check current verification status when component mounts
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        console.log('🔍 Checking verification status for user:', user?.id);
        if (!user) {
          setLoadingStatus(false);
          return;
        }
        
        setLoadingStatus(true);
        
        // Get current user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('verification_status')
          .eq('user_id', user.id)
          .single();
        
        console.log('📋 User profile:', profile);
        
        if (profile) {
          // Check if user has already submitted eKYC
          const { data: existingSubmission } = await supabase
            .from('ekyc_submissions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          console.log('📄 Existing submission:', existingSubmission);
          
          if (existingSubmission) {
            // Set the submission status for display
            setSubmissionStatus(existingSubmission);
            
            // User has already submitted eKYC, show appropriate status
            if (existingSubmission.status === 'approved') {
              setCurrentStep('complete');
            } else if (existingSubmission.status === 'rejected') {
              // Allow user to resubmit - show real name input first
              setShowRealNameInput(true);
            } else {
              // Pending review
              setCurrentStep('verification');
            }
          } else {
            // No submission yet, show real name input first
            console.log('🆕 No existing submission, showing real name input');
            setShowRealNameInput(true);
          }
        } else {
          console.log('⚠️ No user profile found, showing real name input');
          setShowRealNameInput(true);
        }
      } catch (error) {
        console.error('❌ Error checking verification status:', error);
        // If error, show real name input
        setShowRealNameInput(true);
      } finally {
        setLoadingStatus(false);
      }
    };
    
    // Only start checking if user is available
    if (user) {
      checkVerificationStatus();
    } else {
      setLoadingStatus(false);
    }
  }, [user]);

  // Helper function to format IC number with dashes
  const formatICNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as XXXXXX-XX-XXXX
    if (digits.length <= 6) {
      return digits;
    } else if (digits.length <= 8) {
      return `${digits.slice(0, 6)}-${digits.slice(6)}`;
    } else {
      return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`;
    }
  };

  // Helper function to extract DOB from IC number
  const extractDOBFromIC = (icNumber: string) => {
    const digits = icNumber.replace(/\D/g, '');
    if (digits.length >= 6) {
      const year = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const day = digits.slice(4, 6);
      
      // Determine century (assume 00-30 is 2000s, 31-99 is 1900s)
      const fullYear = parseInt(year) <= 30 ? `20${year}` : `19${year}`;
      
      return `${day}/${month}/${fullYear}`;
    }
    return '';
  };

  // Personal Information
  const [personalInfo, setPersonalInfo] = useState({
    nationality: 'malaysian', // 'malaysian' or 'foreigner'
    fullName: '',
    icNumber: '',
    passportNumber: '',
    country: '', // for foreigners
    dateOfBirth: '',
    phoneNumber: '+60',
    email: '',
    addressType: 'current', // 'current' or 'registered'
    address: '',
    city: '',
    postcode: '',
    state: ''
  });

  // Auto-fill email from user context
  useEffect(() => {
    if (user?.email && !personalInfo.email) {
      setPersonalInfo(prev => ({
        ...prev,
        email: user.email || ''
      }));
    }
  }, [user?.email]);

  // Load submission status when user changes
  useEffect(() => {
    const loadSubmissionStatus = async () => {
      try {
        if (!user) return;
        
        const { data: submission } = await supabase
          .from('ekyc_submissions')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        setSubmissionStatus(submission);
      } catch (error) {
        console.error('Error loading submission status:', error);
      } finally {
        setLoadingStatus(false);
      }
    };
    
    loadSubmissionStatus();
  }, [user]);



  // Identity documents (IC/Passport)
  const [identityDocuments, setIdentityDocuments] = useState<DocumentType[]>([
    {
      id: 'ic_front',
      name: 'IC Front (MyKad)',
      description: 'Front side of your Malaysian Identity Card',
      required: true,
      uploaded: false,
      verified: false
    },
    {
      id: 'passport_front',
      name: 'Passport Front',
      description: 'Front page of your passport',
      required: false,
      uploaded: false,
      verified: false
    }
  ]);

  // Function to get additional documents based on uploaded identity document and nationality
  const getAdditionalDocuments = (): DocumentType[] => {
    // Check what identity document was uploaded
    const uploadedIC = identityDocuments.find(doc => doc.id === 'ic_front' && doc.uploaded);
    const uploadedPassport = identityDocuments.find(doc => doc.id === 'passport_front' && doc.uploaded);
    
    console.log('🔍 Checking identity documents for additional docs:');
    console.log('📄 Uploaded IC:', uploadedIC);
    console.log('📄 Uploaded Passport:', uploadedPassport);
    console.log('📄 All identity documents:', identityDocuments);
    console.log('🌍 User nationality:', personalInfo.nationality);
    
    // For foreigners, always require selfie with passport regardless of what's uploaded
    if (personalInfo.nationality === 'foreigner') {
      console.log('✅ Foreigner detected - showing Selfie with Passport');
      return [
        {
          id: 'selfie_with_passport',
          name: 'Selfie with Passport',
          description: 'Photo of yourself holding your passport',
          required: true,
          uploaded: false,
          verified: false
        }
      ];
    }
    
    // For Malaysian nationals, check what document was uploaded
    if (uploadedPassport) {
      console.log('✅ Passport detected for Malaysian - showing Selfie with Passport');
      // If passport was uploaded, show "Selfie with Passport" instead of "IC Back"
      return [
        {
          id: 'selfie_with_passport',
          name: 'Selfie with Passport',
          description: 'Photo of yourself holding your passport',
          required: true,
          uploaded: false,
          verified: false
        }
      ];
    } else if (uploadedIC) {
      console.log('✅ IC detected for Malaysian - showing IC Back and Selfie with IC');
      // If Malaysian IC was uploaded, show both IC Back and Selfie with IC
      return [
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
        }
      ];
    } else {
      console.log('⚠️ No identity document detected for Malaysian - showing default documents');
      // Default state - no identity document uploaded yet
      return [
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
        }
      ];
    }
  };

  // Additional documents - dynamically updated based on uploaded identity document
  const [additionalDocuments, setAdditionalDocuments] = useState<DocumentType[]>(getAdditionalDocuments());

  // Function to update additional documents when identity document changes
  const updateAdditionalDocuments = () => {
    setAdditionalDocuments(getAdditionalDocuments());
  };

  // Update additional documents when navigating to documents step
  useEffect(() => {
    if (currentStep === 'documents') {
      updateAdditionalDocuments();
    }
  }, [currentStep]);

  // Combined documents for backward compatibility
  const documents = [...identityDocuments, ...additionalDocuments];

  const verificationSteps: VerificationStep[] = [
    {
      id: 'identity_document',
      title: '',
      description: 'Upload document',
      status: currentStep === 'identity_document' ? 'in_progress' : ['personal', 'documents', 'verification', 'review', 'complete'].includes(currentStep) ? 'completed' : 'pending',
      icon: <CreditCard size={20} />
    },
    {
      id: 'personal',
      title: '',
      description: 'Review details',
      status: currentStep === 'personal' ? 'in_progress' : ['documents', 'verification', 'review', 'complete'].includes(currentStep) ? 'completed' : 'pending',
      icon: <User size={20} />
    },
    {
      id: 'documents',
      title: '',
      description: 'Upload documents',
      status: currentStep === 'documents' ? 'in_progress' : ['verification', 'review', 'complete'].includes(currentStep) ? 'completed' : 'pending',
      icon: <FileText size={20} />
    },
    {
      id: 'verification',
      title: '',
      description: 'In progress',
      status: currentStep === 'verification' ? 'in_progress' : ['review', 'complete'].includes(currentStep) ? 'completed' : 'pending',
      icon: <Shield size={20} />
    },
    {
      id: 'review',
      title: '',
      description: 'Final review',
      status: currentStep === 'review' ? 'in_progress' : currentStep === 'complete' ? 'completed' : 'pending',
      icon: <CheckCircle size={20} />
    }
  ];

  const handlePersonalInfoChange = (field: string, value: string) => {
    if (field === 'icNumber' && personalInfo.nationality === 'malaysian') {
      // Format IC number with dashes
      const formattedIC = formatICNumber(value);
      const extractedDOB = extractDOBFromIC(formattedIC);
      
      setPersonalInfo(prev => ({
        ...prev,
        icNumber: formattedIC,
        dateOfBirth: extractedDOB || prev.dateOfBirth
      }));
    } else if (field === 'nationality') {
      // Reset relevant fields when nationality changes
      setPersonalInfo(prev => ({
        ...prev,
        nationality: value,
        icNumber: '',
        passportNumber: '',
        dateOfBirth: value === 'foreigner' ? prev.dateOfBirth : '',
        // Auto-set country to Malaysia when nationality is Malaysian
        country: value === 'malaysian' ? 'Malaysia' : prev.country
      }));
      
      // Update additional documents when nationality changes
      setTimeout(() => {
        updateAdditionalDocuments();
      }, 100);
    } else {
      setPersonalInfo(prev => ({ ...prev, [field]: value }));
    }
  };

  /**
   * Parse address string into separate components
   */
  const parseAddress = (addressString: string) => {
    try {
      // Remove extra spaces and normalize
      const cleanAddress = addressString.trim().replace(/\s+/g, ' ');
      
      // Try to extract postcode (5-digit Malaysian postcode)
      const postcodeMatch = cleanAddress.match(/\b\d{5}\b/);
      const postcode = postcodeMatch ? postcodeMatch[0] : '';
      
      // Try to extract state (common Malaysian states)
      const malaysianStates = [
        'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
        'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor',
        'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'
      ];
      
      let state = '';
      for (const stateName of malaysianStates) {
        if (cleanAddress.toLowerCase().includes(stateName.toLowerCase())) {
          state = stateName;
          break;
        }
      }
      
      // Extract city (usually before state or postcode)
      let city = '';
      if (state) {
        const beforeState = cleanAddress.split(state)[0].trim();
        const parts = beforeState.split(',').map(p => p.trim()).filter(p => p);
        city = parts[parts.length - 1] || '';
      } else if (postcode) {
        const beforePostcode = cleanAddress.split(postcode)[0].trim();
        const parts = beforePostcode.split(',').map(p => p.trim()).filter(p => p);
        city = parts[parts.length - 1] || '';
      }
      
      // Street address is everything before city
      let street = cleanAddress;
      if (city) {
        street = cleanAddress.split(city)[0].trim();
        if (street.endsWith(',')) {
          street = street.slice(0, -1).trim();
        }
      }
      
      return {
        street: street || '',
        city: city || '',
        postcode: postcode || '',
        state: state || ''
      };
    } catch (error: any) {
      console.error('Error parsing address:', error);
      return null;
    }
  };

  const handleAIAutoFillWithUri = async (documentUri: string) => {
    try {
      setIsAnalyzingDocument(true);
      
      console.log('🤖 Starting AI analysis with provided URI:', documentUri);
      
      // Use the new type detection method to analyze the document
      const result = await AIDocumentAnalysisService.analyzeDocumentWithTypeDetection(
        documentUri
      );

      if (!result.success || !result.extractedInfo) {
        Alert.alert(
          'Analysis Failed',
          result.error || 'Failed to analyze document. Please check the image quality and try again.'
        );
        return;
      }

      const extracted = result.extractedInfo;
      console.log('✅ AI extracted information:', extracted);

      // Check if AI analysis was successful or if it's fallback data
      const confidence = extracted.confidence || 0;
      const isFallback = confidence < 0.5;

      // Handle document type detection and validation
      if (extracted.documentType === 'Passport') {
        if (extracted.isMalaysianDocument) {
          Alert.alert(
            'Malaysian Passport Detected',
            'You have uploaded a Malaysian passport. For eKYC verification, Malaysian citizens must use their Malaysian IC (MyKad, MyKid, etc.) instead of a passport. Please upload your Malaysian IC.',
            [
              { text: 'OK', onPress: () => {
                // Reset the passport document and go back to document upload
                setIdentityDocuments(prev => prev.map(doc => 
                  doc.id === 'passport_front' ? { ...doc, uploaded: false, uri: undefined } : doc
                ));
                // Update additional documents when identity document changes
                setTimeout(() => {
                  updateAdditionalDocuments();
                }, 100);
                // Always navigate back to first step for invalid documents
                setCurrentStep('identity_document');
              }}
            ]
          );
          return;
        } else {
          // Foreign passport detected - confirm with user
          Alert.alert(
            'Foreign Passport Detected',
            `We detected a ${extracted.detectedCountry || 'foreign'} passport. Is this correct?`,
            [
              { text: 'No, Upload Different Document', onPress: () => {
                // Reset the passport document and go back to document upload
                setIdentityDocuments(prev => prev.map(doc => 
                  doc.id === 'passport_front' ? { ...doc, uploaded: false, uri: undefined } : doc
                ));
                // Update additional documents when identity document changes
                setTimeout(() => {
                  updateAdditionalDocuments();
                }, 100);
                // Always navigate back to first step for invalid documents
                setCurrentStep('identity_document');
              }},
              { text: 'Yes, Continue', onPress: () => {
                // Set nationality to foreigner and continue with auto-fill
                setPersonalInfo(prev => ({ ...prev, nationality: 'foreigner' }));
                // Auto-fill the form with extracted data but stay on current step
                autoFillFormData(extracted);
              }}
            ]
          );
          return;
        }
      } else if (extracted.documentType === 'IC') {
        // Malaysian IC detected - validate IC type
        if (!extracted.isMalaysianDocument) {
          Alert.alert(
            'Invalid IC Detected',
            'The uploaded document does not appear to be a valid Malaysian IC. Please upload a valid Malaysian IC (MyKad, MyKid, MyTentera, MyPolis, MyPR, MyKAS, or MyPoca).',
            [{ text: 'OK', onPress: () => {
              // Reset the IC document and go back to document upload
              setIdentityDocuments(prev => prev.map(doc => 
                doc.id === 'ic_front' ? { ...doc, uploaded: false, uri: undefined } : doc
              ));
              // Update additional documents when identity document changes
              setTimeout(() => {
                updateAdditionalDocuments();
              }, 100);
              // Always navigate back to first step for invalid documents
              setCurrentStep('identity_document');
            }}]
          );
          return;
        }

        // Show IC type confirmation
        const icType = extracted.detectedICType || 'Unknown';
        Alert.alert(
          'Malaysian IC Detected',
          `We detected a ${icType} (Malaysian IC). Is this correct?`,
          [
            { text: 'No, Upload Different Document', onPress: () => {
              // Reset the IC document and go back to document upload
              setIdentityDocuments(prev => prev.map(doc => 
                doc.id === 'ic_front' ? { ...doc, uploaded: false, uri: undefined } : doc
              ));
              // Update additional documents when identity document changes
              setTimeout(() => {
                updateAdditionalDocuments();
              }, 100);
              // Always navigate back to first step for invalid documents
              setCurrentStep('identity_document');
            }},
            { text: 'Yes, Continue', onPress: () => {
              // Set nationality to Malaysian and continue with auto-fill
              setPersonalInfo(prev => ({ ...prev, nationality: 'malaysian' }));
              // Continue with the current extracted data but preserve Malaysian nationality
              continueWithExtractedDataForMalaysianIC(extracted);
            }}
          ]
        );
        return;
      }

      // If we reach here, no special handling needed, proceed with auto-fill
      if (isFallback) {
        Alert.alert(
          'Manual Entry Required',
          'The AI couldn\'t automatically extract information from your document. Please fill in the details manually. The form has been prepared for you to complete.',
          [{ text: 'OK' }]
        );
      }

      // Use the extracted data to auto-fill the form
      continueWithExtractedData(extracted);

      // Show appropriate message based on confidence
      if (isFallback) {
        console.log('⚠️ AI analysis failed, using fallback data');
      } else {
        console.log(`✅ AI auto-fill completed with ${Math.round(confidence * 100)}% confidence`);
      }

    } catch (error: any) {
      console.error('❌ AI auto-fill error:', error);
      Alert.alert(
        'Auto-fill Error',
        'An error occurred while analyzing your document. Please fill in the information manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAnalyzingDocument(false);
    }
  };

  const autoFillFormData = (extracted: any) => {
    // Auto-fill the form with extracted information but stay on current step
    const updatedInfo = { ...personalInfo };
    
    if (extracted.fullName && extracted.fullName !== 'Manual entry required') {
      updatedInfo.fullName = extracted.fullName;
    }
    
    if (extracted.documentType === 'IC' && extracted.icNumber && extracted.icNumber !== 'Manual entry required') {
      updatedInfo.icNumber = extracted.icNumber;
    } else if (extracted.documentType === 'Passport' && extracted.passportNumber && extracted.passportNumber !== 'Manual entry required') {
      updatedInfo.passportNumber = extracted.passportNumber;
    }
    
    if (extracted.dateOfBirth && extracted.dateOfBirth !== 'Manual entry required') {
      updatedInfo.dateOfBirth = extracted.dateOfBirth;
    }
    
    if (extracted.nationality && extracted.nationality !== 'Manual entry required') {
      updatedInfo.nationality = extracted.nationality.toLowerCase() === 'malaysian' ? 'malaysian' : 'foreigner';
      // Auto-set country to Malaysia for Malaysian nationals
      if (updatedInfo.nationality === 'malaysian') {
        updatedInfo.country = 'Malaysia';
      }
    }

    // Extract and parse address if available
    if (extracted.address && extracted.address !== 'Manual entry required' && extracted.address !== 'null') {
      const parsedAddress = parseAddress(extracted.address);
      if (parsedAddress) {
        updatedInfo.address = parsedAddress.street || '';
        updatedInfo.city = parsedAddress.city || '';
        updatedInfo.postcode = parsedAddress.postcode || '';
        updatedInfo.state = parsedAddress.state || '';
      }
    }

    setPersonalInfo(updatedInfo);
    console.log('✅ Auto-fill completed with extracted data (staying on current step)');
    
    // Update additional documents when nationality changes
    setTimeout(() => {
      updateAdditionalDocuments();
    }, 100);
  };

  const continueWithExtractedDataForMalaysianIC = (extracted: any) => {
    // Auto-fill the form with extracted information for Malaysian IC (preserve nationality)
    const updatedInfo = { ...personalInfo };
    
    if (extracted.fullName && extracted.fullName !== 'Manual entry required') {
      updatedInfo.fullName = extracted.fullName;
    }
    
    if (extracted.documentType === 'IC' && extracted.icNumber && extracted.icNumber !== 'Manual entry required') {
      updatedInfo.icNumber = extracted.icNumber;
    } else if (extracted.documentType === 'Passport' && extracted.passportNumber && extracted.passportNumber !== 'Manual entry required') {
      updatedInfo.passportNumber = extracted.passportNumber;
    }
    
    if (extracted.dateOfBirth && extracted.dateOfBirth !== 'Manual entry required') {
      updatedInfo.dateOfBirth = extracted.dateOfBirth;
    }
    
    // For Malaysian IC, always keep nationality as 'malaysian'
    updatedInfo.nationality = 'malaysian';
    // Auto-set country to Malaysia for Malaysian nationals
    updatedInfo.country = 'Malaysia';

    // Extract and parse address if available
    if (extracted.address && extracted.address !== 'Manual entry required' && extracted.address !== 'null') {
      const parsedAddress = parseAddress(extracted.address);
      if (parsedAddress) {
        updatedInfo.address = parsedAddress.street || '';
        updatedInfo.city = parsedAddress.city || '';
        updatedInfo.postcode = parsedAddress.postcode || '';
        updatedInfo.state = parsedAddress.state || '';
      }
    }

    setPersonalInfo(updatedInfo);
    console.log('✅ Auto-fill completed with extracted data for Malaysian IC');
    
    // Update additional documents when nationality changes
    setTimeout(() => {
      updateAdditionalDocuments();
    }, 100);
    
    // Move to next step after successful auto-fill
    setCurrentStep('personal');
  };

  const continueWithExtractedData = (extracted: any) => {
    // Auto-fill the form with extracted information
    const updatedInfo = { ...personalInfo };
    
    if (extracted.fullName && extracted.fullName !== 'Manual entry required') {
      updatedInfo.fullName = extracted.fullName;
    }
    
    if (extracted.documentType === 'IC' && extracted.icNumber && extracted.icNumber !== 'Manual entry required') {
      updatedInfo.icNumber = extracted.icNumber;
    } else if (extracted.documentType === 'Passport' && extracted.passportNumber && extracted.passportNumber !== 'Manual entry required') {
      updatedInfo.passportNumber = extracted.passportNumber;
    }
    
    if (extracted.dateOfBirth && extracted.dateOfBirth !== 'Manual entry required') {
      updatedInfo.dateOfBirth = extracted.dateOfBirth;
    }
    
    if (extracted.nationality && extracted.nationality !== 'Manual entry required') {
      updatedInfo.nationality = extracted.nationality.toLowerCase() === 'malaysian' ? 'malaysian' : 'foreigner';
      // Auto-set country to Malaysia for Malaysian nationals
      if (updatedInfo.nationality === 'malaysian') {
        updatedInfo.country = 'Malaysia';
      }
    }

    // Extract and parse address if available
    if (extracted.address && extracted.address !== 'Manual entry required' && extracted.address !== 'null') {
      const parsedAddress = parseAddress(extracted.address);
      if (parsedAddress) {
        updatedInfo.address = parsedAddress.street || '';
        updatedInfo.city = parsedAddress.city || '';
        updatedInfo.postcode = parsedAddress.postcode || '';
        updatedInfo.state = parsedAddress.state || '';
      }
    }

    setPersonalInfo(updatedInfo);
    console.log('✅ Auto-fill completed with extracted data');
    
    // Update additional documents when nationality changes
    setTimeout(() => {
      updateAdditionalDocuments();
    }, 100);
    
    // Move to next step after successful auto-fill
    setCurrentStep('personal');
  };

  const handleAIAutoFill = async () => {
    try {
      setIsAnalyzingDocument(true);
      
      // Find the identity document (IC front or passport)
      console.log('🔍 Current identity documents state:', identityDocuments);
      
      const identityDoc = identityDocuments.find(doc => 
        (doc.id === 'ic_front' || doc.id === 'passport_front') && doc.uploaded && doc.uri
      );
      
      console.log('🔍 Found identity document:', identityDoc);
      
      if (!identityDoc) {
        console.log('❌ No uploaded identity document found');
        console.log('❌ Available documents:', identityDocuments.map(doc => ({
          id: doc.id,
          uploaded: doc.uploaded,
          hasUri: !!doc.uri,
          uri: doc.uri || 'no-uri'
        })));
        
        Alert.alert(
          'Document Required',
          'Please upload your IC front or passport first before using AI auto-fill.'
        );
        return;
      }

      // Use the newer function that takes URI directly
      if (identityDoc.uri) {
        await handleAIAutoFillWithUri(identityDoc.uri);
      }

    } catch (error: any) {
      console.error('❌ AI auto-fill error:', error);
      Alert.alert(
        'Auto-fill Error',
        'An error occurred while analyzing your document. Please fill in the information manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAnalyzingDocument(false);
    }
  };

  const handleDocumentUpload = async (documentId: string, documentType: 'identity' | 'additional' = 'additional') => {
    try {
      // Only allow camera capture - no gallery upload option
      await handleCameraUpload(documentId, documentType);
    } catch (error: any) {
      console.error('❌ Document upload error:', error);
      Alert.alert(
        'Upload Failed',
        'Failed to initiate document upload. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCameraUpload = async (documentId: string, documentType: 'identity' | 'additional' = 'additional') => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera access to take photos of your documents.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      await processUploadedImage(asset, documentId, documentType);
    } catch (error: any) {
      console.error('❌ Camera upload error:', error);
      
      // Check if this is a simulator error
      if (error.message && error.message.includes('simulator')) {
        Alert.alert(
          'Camera Not Available',
          'Camera is not available in the simulator. Please test this feature on a real device.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Camera Error',
          'Failed to take photo. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };



  const processUploadedImage = async (asset: any, documentId: string, documentType: 'identity' | 'additional' = 'additional') => {
    try {
      console.log('📸 Selected image URI:', asset.uri);
      console.log('📸 Image size:', asset.fileSize);
      console.log('📸 Image type:', asset.type);
      
      // Test file access
      try {
        const testResponse = await fetch(asset.uri);
        console.log('📸 Test fetch response status:', testResponse.status);
        console.log('📸 Test fetch response ok:', testResponse.ok);
        if (testResponse.ok) {
          const testBlob = await testResponse.blob();
          console.log('📸 Test blob size:', testBlob.size);
          console.log('📸 Test blob type:', testBlob.type);
        }
      } catch (testError) {
        console.error('❌ Test fetch failed:', testError);
      }

      // First, update the appropriate document array with the local URI for immediate preview
      if (documentType === 'identity') {
        setIdentityDocuments(prev => 
          prev.map(doc => 
            doc.id === documentId 
              ? { ...doc, uploaded: true, verified: false, uri: asset.uri }
              : doc
          )
        );
      } else {
        setAdditionalDocuments(prev => 
          prev.map(doc => 
            doc.id === documentId 
              ? { ...doc, uploaded: true, verified: false, uri: asset.uri }
              : doc
          )
        );
      }

      // Then upload to Supabase storage in the background
      try {
        console.log('🚀 Starting upload for document:', documentId);
        const fileName = `${documentId}_${Date.now()}.jpg`;
        const uploadedUrl = await EKYCService.uploadDocument(asset.uri, fileName, user?.id || '');
        console.log('✅ Upload successful, URL:', uploadedUrl);
        
        // Update the appropriate document array with the uploaded URL
        if (documentType === 'identity') {
          setIdentityDocuments(prev => {
            const updated = prev.map(doc => 
              doc.id === documentId 
                ? { ...doc, uploaded: true, verified: true, uri: uploadedUrl }
                : doc
            );
            console.log('🔄 Updated identity documents:', updated);
            return updated;
          });
          
          // Update additional documents when identity document changes
          setTimeout(() => {
            updateAdditionalDocuments();
          }, 100);
        } else {
          setAdditionalDocuments(prev => {
            const updated = prev.map(doc => 
              doc.id === documentId 
                ? { ...doc, uploaded: true, verified: true, uri: uploadedUrl }
                : doc
            );
            console.log('🔄 Updated additional documents:', updated);
            return updated;
          });
        }
        
        // For identity documents, trigger AI analysis automatically
        if (documentType === 'identity' && (documentId === 'ic_front' || documentId === 'passport_front')) {
          console.log('🤖 Triggering automatic AI analysis for identity document');
          // Use the uploaded URL directly instead of relying on state update
          setTimeout(() => {
            handleAIAutoFillWithUri(uploadedUrl);
          }, 500);
        } else {
          Alert.alert(
            'Success',
            'Document uploaded successfully',
            [{ text: 'OK' }]
          );
        }
      } catch (uploadError: any) {
        console.error('❌ Upload to storage failed:', uploadError);
        console.error('❌ Upload error details:', {
          message: uploadError?.message || 'Unknown error',
          stack: uploadError?.stack,
          documentId,
          fileName: `${documentId}_${Date.now()}.jpg`
        });
        
        // Keep the local image but mark as not verified
        if (documentType === 'identity') {
          setIdentityDocuments(prev => 
            prev.map(doc => 
              doc.id === documentId 
                ? { ...doc, uploaded: true, verified: false, uri: asset.uri }
                : doc
            )
          );
        } else {
          setAdditionalDocuments(prev => 
            prev.map(doc => 
              doc.id === documentId 
                ? { ...doc, uploaded: true, verified: false, uri: asset.uri }
                : doc
            )
          );
        }
        
        Alert.alert(
          'Upload Warning',
          'Document selected but upload to server failed. You can continue, but please try uploading again later.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('❌ Image processing error:', error);
      Alert.alert(
        'Processing Failed',
        'Failed to process the selected image. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleNextStep = () => {
    if (currentStep === 'identity_document') {
      // Check if ANY identity document is uploaded (IC or Passport)
      const uploadedIdentityDoc = identityDocuments.find(doc => 
        (doc.id === 'ic_front' || doc.id === 'passport_front') && doc.uploaded
      );
      
      if (!uploadedIdentityDoc) {
        Alert.alert('Identity Document Required', 'Please upload either your IC front or passport front first.');
        return;
      }
      
      // Check if AI analysis has already been triggered automatically
      // If not, trigger it manually
      const hasUploadedDoc = identityDocuments.find(doc => 
        (doc.id === 'ic_front' || doc.id === 'passport_front') && doc.uploaded && doc.uri
      );
      
      if (hasUploadedDoc && !isAnalyzingDocument) {
        console.log('🤖 Triggering manual AI analysis from Next button');
        handleAIAutoFill();
      } else if (hasUploadedDoc && isAnalyzingDocument) {
        console.log('🤖 AI analysis already in progress, skipping manual trigger');
      } else {
        console.log('❌ No uploaded document found for AI analysis');
      }
      
      setCurrentStep('personal');
    } else if (currentStep === 'personal') {
      // Validate personal information - ALL fields are compulsory
      let requiredFields = [
        'fullName', 
        'dateOfBirth', 
        'phoneNumber', 
        'email', 
        'address', 
        'city', 
        'postcode', 
        'state',
        'country'
      ];
      
      if (personalInfo.nationality === 'malaysian') {
        requiredFields.push('icNumber');
      } else {
        requiredFields.push('passportNumber');
      }
      
      const missingFields = requiredFields.filter(field => {
        const value = personalInfo[field as keyof typeof personalInfo];
        return !value || value.trim() === '';
      });
      
      if (missingFields.length > 0) {
        const missingFieldNames = missingFields.map(field => {
          switch (field) {
            case 'fullName': return 'Full Name';
            case 'dateOfBirth': return 'Date of Birth';
            case 'phoneNumber': return 'Phone Number';
            case 'email': return 'Email Address';
            case 'address': return 'Address';
            case 'city': return 'City';
            case 'postcode': return 'Postcode';
            case 'state': return 'State';
            case 'country': return 'Country';
            case 'icNumber': return 'IC Number';
            case 'passportNumber': return 'Passport Number';
            default: return field;
          }
        });
        
        Alert.alert(
          'Missing Information', 
          `Please fill in all required fields:\n\n${missingFieldNames.join('\n')}`
        );
        return;
      }
      setCurrentStep('documents');
    } else if (currentStep === 'documents') {
      // Check if required additional documents are uploaded
      const requiredDocuments = additionalDocuments.filter(doc => doc.required);
      const uploadedRequired = requiredDocuments.every(doc => doc.uploaded);
      
      if (!uploadedRequired) {
        Alert.alert('Missing Documents', 'Please upload all required additional documents.');
        return;
      }
      if (!realName.trim()) {
        Alert.alert('Real Name Required', 'You must provide your real name before proceeding with eKYC verification.');
        setShowRealNameInput(true);
        return;
      }
      if (!pdpaConsentGiven) {
        Alert.alert('PDPA Consent Required', 'You must provide PDPA consent before proceeding with eKYC verification.');
        setShowPDPAConsent(true);
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
    if (currentStep === 'personal') {
      setCurrentStep('identity_document');
    } else if (currentStep === 'documents') {
      setCurrentStep('personal');
    } else if (currentStep === 'verification') {
      setCurrentStep('documents');
    } else if (currentStep === 'review') {
      setCurrentStep('verification');
    }
  };

  const handleRealNameSubmit = () => {
    if (!realName.trim()) {
      Alert.alert('Real Name Required', 'Please enter your real name to continue with eKYC verification.');
      return;
    }
    
    // Validate that it's a reasonable name (at least 2 characters, no numbers)
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    if (!nameRegex.test(realName.trim())) {
      Alert.alert(
        'Invalid Name Format', 
        'Please enter your real name using only letters and spaces (2-50 characters).'
      );
      return;
    }
    
    setShowRealNameInput(false);
    setShowPDPAConsent(true);
  };

  const handleRealNameCancel = () => {
    setShowRealNameInput(false);
    router.back();
  };

  const handlePDPAConsentAccept = async () => {
    try {
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      console.log('🔄 Processing PDPA consent for user:', user.id);

      // Prepare consent data
      const consentData: PDPAConsentData = {
        userName: realName,
        userEmail: user.email || '',
        consentGivenAt: new Date().toISOString(),
        // Note: IP address and user agent would be captured from the request in a real implementation
      };

      // Generate PDF and save consent record
      const result = await PDPAConsentPDFService.processPDPAConsent(user.id, consentData);
      
      console.log('✅ PDPA consent processed successfully:', result);

      // Update state with PDF URL
      setPDPAConsentPdfUrl(result.pdfUrl);
      setPDPAConsentGiven(true);
      setShowPDPAConsent(false);
      setCurrentStep('identity_document');

      Alert.alert(
        'PDPA Consent Recorded',
        'Your PDPA consent has been recorded and a signed PDF document has been generated for your records.',
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('❌ Error processing PDPA consent:', error);
      Alert.alert(
        'Error',
        'Failed to process PDPA consent. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePDPAConsentDecline = () => {
    setShowPDPAConsent(false);
    router.back();
  };

  const handleSubmitVerification = async () => {
    console.log('🚀 Starting eKYC submission process...');
    console.log('👤 Current user:', user);
    console.log('📋 Personal info:', personalInfo);
    console.log('📄 Documents:', documents);
    
    setIsSubmitting(true);
    
    try {
      // Check if user is authenticated
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      console.log('✅ User is authenticated:', user.id);

      // Prepare document URLs from uploaded documents
      const documentUrls: Record<string, string> = {};
      const allDocuments = [...identityDocuments, ...additionalDocuments];
      allDocuments.forEach(doc => {
        if (doc.uploaded && doc.uri) {
          documentUrls[doc.id] = doc.uri;
          console.log(`📎 Document ${doc.id}:`, doc.uri);
        }
      });

      console.log('📎 Total documents with URLs:', Object.keys(documentUrls).length);

      // Submit eKYC data to Supabase
      const submissionData = {
        nationality: personalInfo.nationality === 'malaysian' ? 'Malaysian' as const : 'Foreigner' as const,
        full_name: personalInfo.fullName,
        ic_number: personalInfo.nationality === 'malaysian' ? personalInfo.icNumber : undefined,
        passport_number: personalInfo.nationality === 'foreigner' ? personalInfo.passportNumber : undefined,
        country: personalInfo.nationality === 'foreigner' ? personalInfo.country : undefined,
        date_of_birth: personalInfo.dateOfBirth,
        phone_number: personalInfo.phoneNumber,
        email: personalInfo.email,
        address_type: personalInfo.addressType === 'current' ? 'Current Address' as const : 'Registered Address' as const,
        address: personalInfo.address,
        city: personalInfo.city,
        postcode: personalInfo.postcode,
        state: personalInfo.state,
        document_urls: documentUrls,
        pdpa_consent_given: pdpaConsentGiven,
        pdpa_consent_given_at: pdpaConsentGiven ? new Date().toISOString() : undefined,
        pdpa_consent_pdf_url: pdpaConsentPdfUrl
      };

      console.log('📤 Submitting eKYC data:', submissionData);
      
      // Submit to Supabase (this already updates the user's verification status internally)
      const result = await EKYCService.submitEKYC(submissionData);
      console.log('✅ eKYC submission result:', result);
      
      // Refresh the user profile to get the updated verification status
      await refreshProfile();
      console.log('✅ Profile refreshed after eKYC submission');
      
      setIsSubmitting(false);
      Alert.alert(
        'Verification Submitted!',
        'Your eKYC verification has been submitted successfully and is now under review. You will receive updates via email and SMS. The verification process typically takes 1-3 business days.',
        [
          {
            text: 'Return to Home',
            onPress: () => router.replace('/')
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ Error submitting eKYC verification:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        user: user?.id,
        personalInfo: personalInfo
      });
      setIsSubmitting(false);
      Alert.alert(
        'Error',
        `There was an error submitting your verification: ${error.message}. Please try again.`,
        [
          {
            text: 'OK'
          }
        ]
      );
    }
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

          </View>
          <View style={styles.stepInfo}>
            <Text style={[styles.stepTitle, { color: colors.text.primary }]}>{step.title}</Text>
            <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>{step.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderIdentityDocumentStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Identity Document Upload</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
        Please upload your {personalInfo.nationality === 'malaysian' ? 'Malaysian IC' : 'Passport'} for verification. 
        AI will automatically extract your information in the next step.
      </Text>

      {/* Identity Documents */}
      <View style={styles.documentsContainer}>
        {identityDocuments.map((document) => (
          <View key={document.id} style={[styles.documentCard, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
            <View style={styles.documentHeader}>
              <View style={styles.documentInfo}>
                <Text style={[styles.documentName, { color: colors.text.primary }]}>{document.name}</Text>
                <Text style={[styles.documentDescription, { color: colors.text.secondary }]}>{document.description}</Text>
                {document.required && (
                  <Text style={[styles.requiredBadge, { color: colors.status.error }]}>Required</Text>
                )}
                <Text style={[styles.aiAnalysisBadge, { color: colors.primary.main }]}>🤖 AI Analysis Available</Text>
              </View>
              {document.uploaded && (
                document.verified ? (
                  <CheckCircle size={24} color={colors.status.success} />
                ) : (
                  <Clock size={24} color={colors.status.warning} />
                )
              )}
            </View>

            {document.uploaded && document.uri && (
              <View style={styles.documentPreview}>
                <View style={[styles.previewImageContainer, { backgroundColor: colors.background.secondary }]}>
                  <Image 
                    source={{ 
                      uri: document.uri,
                      headers: {
                        'Cache-Control': 'no-cache'
                      }
                    }} 
                    style={styles.previewImage} 
                    resizeMode="cover"
                    onError={(error) => {
                      console.error('❌ Image loading error:', error.nativeEvent);
                      console.error('❌ Failed URL:', document.uri);
                    }}
                    onLoad={() => console.log('✅ Image loaded successfully:', document.uri)}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.reuploadButton, { backgroundColor: colors.background.secondary }]}
                  onPress={() => handleDocumentUpload(document.id, 'identity')}
                >
                  <Upload size={16} color={colors.text.secondary} />
                  <Text style={[styles.reuploadButtonText, { color: colors.text.secondary }]}>Re-upload</Text>
                </TouchableOpacity>
              </View>
            )}

            {!document.uploaded && (
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: colors.primary.main }]}
                onPress={() => handleDocumentUpload(document.id, 'identity')}
              >
                <Camera size={20} color={colors.text.white} />
                <Text style={[styles.uploadButtonText, { color: colors.text.white }]}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
        <AlertCircle size={20} color={colors.status.warning} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoTitle, { color: colors.text.primary }]}>Important Notes</Text>
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            • Take a photo directly with your camera{'\n'}
            • Ensure your document is clearly visible and well-lit{'\n'}
            • All text should be readable and not blurry{'\n'}
            • Upload the front side of your {personalInfo.nationality === 'malaysian' ? 'IC' : 'Passport'}{'\n'}
            • The AI will help extract information from your document
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPersonalInfoStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Personal Information</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
        Review and edit the information extracted from your document
      </Text>

      {/* AI Analysis Status */}
      {isAnalyzingDocument && (
        <View style={styles.aiAnalysisOverlay}>
          <View style={styles.aiAnalysisContent}>
            <View style={styles.aiAnalysisIconContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
            <Text style={styles.aiAnalysisTitle}>
              AI Analysis in Progress
            </Text>
            <Text style={styles.aiAnalysisSubtitle}>
              Our AI is carefully analyzing your document and extracting information...
            </Text>
            <View style={styles.aiAnalysisProgress}>
              <View style={styles.aiAnalysisProgressBar}>
                <View style={styles.aiAnalysisProgressFill} />
              </View>
              <Text style={styles.aiAnalysisProgressText}>
                Processing document...
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Nationality Selection */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Nationality</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.nationalityButton,
              {
                backgroundColor: personalInfo.nationality === 'malaysian' ? colors.primary.main : colors.background.tertiary,
                borderColor: personalInfo.nationality === 'malaysian' ? colors.primary.main : colors.border.light,
                marginRight: 12
              }
            ]}
            onPress={() => handlePersonalInfoChange('nationality', 'malaysian')}
          >
            <Text style={[
              styles.nationalityButtonText,
              { color: personalInfo.nationality === 'malaysian' ? 'white' : colors.text.primary }
            ]}>Malaysian</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.nationalityButton,
              {
                backgroundColor: personalInfo.nationality === 'foreigner' ? colors.primary.main : colors.background.tertiary,
                borderColor: personalInfo.nationality === 'foreigner' ? colors.primary.main : colors.border.light
              }
            ]}
            onPress={() => handlePersonalInfoChange('nationality', 'foreigner')}
          >
            <Text style={[
              styles.nationalityButtonText,
              { color: personalInfo.nationality === 'foreigner' ? 'white' : colors.text.primary }
            ]}>Foreigner</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Full Name {personalInfo.nationality === 'malaysian' ? '(as per IC)' : '(as per Passport)'} <Text style={{ color: colors.status.error }}>*</Text></Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
          value={personalInfo.fullName}
          onChangeText={(text) => handlePersonalInfoChange('fullName', text)}
          placeholder="Enter your full name"
          placeholderTextColor={colors.text.tertiary}
          autoCapitalize="words"
        />
      </View>

      {/* Conditional IC/Passport Field */}
      {personalInfo.nationality === 'malaysian' ? (
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.text.primary }]}>IC Number <Text style={{ color: colors.status.error }}>*</Text></Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
            value={personalInfo.icNumber}
            onChangeText={(text) => handlePersonalInfoChange('icNumber', text)}
            placeholder="e.g., 880101-01-1234"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="numeric"
            maxLength={14}
          />
        </View>
      ) : (
        <>
          <View style={[styles.inputGroup, { position: 'relative', zIndex: 1001, marginBottom: showCountryDropdown ? 220 : 20 }]}>
            <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Country <Text style={{ color: colors.status.error }}>*</Text></Text>
            <TouchableOpacity
              style={[styles.dropdownContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}
              onPress={() => setShowCountryDropdown(!showCountryDropdown)}
            >
              <Text style={[
                styles.dropdownText, 
                { 
                  color: personalInfo.country ? colors.text.primary : colors.text.tertiary 
                }
              ]}>
                {personalInfo.country || 'Select your country'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            
            {showCountryDropdown && (
              <View style={[styles.dropdownOptions, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
                <ScrollView style={styles.dropdownScrollView} showsVerticalScrollIndicator={false}>
                  {countries.map((country) => (
                    <TouchableOpacity
                      key={country}
                      style={[
                        styles.dropdownOption,
                        { 
                          backgroundColor: personalInfo.country === country ? colors.primary.main : colors.background.tertiary,
                          borderBottomColor: colors.border.light 
                        }
                      ]}
                      onPress={() => {
                        handlePersonalInfoChange('country', country);
                        setShowCountryDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        { 
                          color: personalInfo.country === country ? 'white' : colors.text.primary 
                        }
                      ]}>
                        {country}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Passport Number <Text style={{ color: colors.status.error }}>*</Text></Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
              value={personalInfo.passportNumber}
              onChangeText={(text) => handlePersonalInfoChange('passportNumber', text)}
              placeholder="Enter passport number"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="characters"
            />
          </View>
        </>
      )}

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Date of Birth <Text style={{ color: colors.status.error }}>*</Text></Text>
        <TextInput
          style={[
            styles.textInput, 
            { 
              backgroundColor: personalInfo.nationality === 'malaysian' ? colors.background.secondary : colors.background.tertiary, 
              borderColor: colors.border.light, 
              color: personalInfo.nationality === 'malaysian' ? colors.text.secondary : colors.text.primary 
            }
          ]}
          value={personalInfo.dateOfBirth}
          onChangeText={(text) => personalInfo.nationality === 'foreigner' ? handlePersonalInfoChange('dateOfBirth', text) : null}
          placeholder="DD/MM/YYYY"
          placeholderTextColor={colors.text.tertiary}
          editable={personalInfo.nationality === 'foreigner'}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Phone Number <Text style={{ color: colors.status.error }}>*</Text></Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
          value={personalInfo.phoneNumber.startsWith('+60') ? personalInfo.phoneNumber : `+60${personalInfo.phoneNumber}`}
          onChangeText={(text) => {
            // Remove +60 prefix if user tries to edit it, then re-add it
            const cleanText = text.replace(/^\+60/, '');
            handlePersonalInfoChange('phoneNumber', `+60${cleanText}`);
          }}
          placeholder="+60 12-3456789"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Email Address</Text>
        <TextInput
          style={[
            styles.textInput, 
            { 
              backgroundColor: colors.background.secondary, 
              borderColor: colors.border.light, 
              color: colors.text.secondary 
            }
          ]}
          value={personalInfo.email}
          placeholder="your.email@example.com"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={false}
        />
      </View>

      {/* Address Type Selection */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Address Type</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.nationalityButton,
              {
                backgroundColor: personalInfo.addressType === 'current' ? colors.primary.main : colors.background.tertiary,
                borderColor: personalInfo.addressType === 'current' ? colors.primary.main : colors.border.light,
                marginRight: 12
              }
            ]}
            onPress={() => handlePersonalInfoChange('addressType', 'current')}
          >
            <Text style={[
              styles.nationalityButtonText,
              { color: personalInfo.addressType === 'current' ? 'white' : colors.text.primary }
            ]}>Current Address</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.nationalityButton,
              {
                backgroundColor: personalInfo.addressType === 'registered' ? colors.primary.main : colors.background.tertiary,
                borderColor: personalInfo.addressType === 'registered' ? colors.primary.main : colors.border.light
              }
            ]}
            onPress={() => handlePersonalInfoChange('addressType', 'registered')}
          >
            <Text style={[
              styles.nationalityButtonText,
              { color: personalInfo.addressType === 'registered' ? 'white' : colors.text.primary }
            ]}>Registered Address</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
          {personalInfo.addressType === 'current' ? 'Current Address' : 'Registered Address'} <Text style={{ color: colors.status.error }}>*</Text>
        </Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
          value={personalInfo.address}
          onChangeText={(text) => handlePersonalInfoChange('address', text)}
          placeholder={`Enter your ${personalInfo.addressType} address`}
          placeholderTextColor={colors.text.tertiary}
          multiline
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={[styles.inputLabel, { color: colors.text.primary }]}>City <Text style={{ color: colors.status.error }}>*</Text></Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, color: colors.text.primary }]}
            value={personalInfo.city}
            onChangeText={(text) => handlePersonalInfoChange('city', text)}
            placeholder="City"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
          <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Postcode <Text style={{ color: colors.status.error }}>*</Text></Text>
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

      <View style={[styles.inputGroup, { position: 'relative', zIndex: 1000, marginBottom: showStateDropdown ? 220 : 20 }]}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>State <Text style={{ color: colors.status.error }}>*</Text></Text>
        <TouchableOpacity
          style={[styles.dropdownContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}
          onPress={() => setShowStateDropdown(!showStateDropdown)}
        >
          <Text style={[styles.dropdownText, { color: personalInfo.state ? colors.text.primary : colors.text.tertiary }]}>
            {personalInfo.state || 'Select State'}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
        
        {showStateDropdown && (
          <View style={[styles.dropdownOptions, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
            <ScrollView 
              style={styles.dropdownScrollView} 
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {malaysianStates.map((state) => (
                <TouchableOpacity
                  key={state}
                  style={[styles.dropdownOption, { backgroundColor: colors.background.primary }]}
                  onPress={() => {
                    handlePersonalInfoChange('state', state);
                    setShowStateDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownOptionText, { color: colors.text.primary }]}>{state}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );

  const renderDocumentsStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Additional Documents</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
        Please upload the remaining required documents for verification
      </Text>

      <View style={styles.documentsContainer}>
        {additionalDocuments.map((document) => (
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
                document.verified ? (
                  <CheckCircle size={24} color={colors.status.success} />
                ) : (
                  <Clock size={24} color={colors.status.warning} />
                )
              )}
            </View>
            
            {document.uploaded && document.uri ? (
              <View style={styles.documentPreview}>
                <View style={[styles.previewImageContainer, { backgroundColor: colors.background.secondary }]}>
                  <Image 
                    source={{ 
                      uri: document.uri,
                      headers: {
                        'Cache-Control': 'no-cache'
                      }
                    }} 
                    style={styles.previewImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.error('❌ Image loading error:', error.nativeEvent);
                      console.error('❌ Failed URL:', document.uri);
                    }}
                    onLoad={() => console.log('✅ Image loaded successfully:', document.uri)}
                  />
                </View>
                <View style={styles.documentStatus}>
                  <Text style={[
                    styles.documentStatusText, 
                    { color: document.verified ? colors.status.success : colors.status.warning }
                  ]}>
                    {document.verified ? 'Uploaded' : 'Uploading...'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.reuploadButton, { backgroundColor: colors.background.secondary }]}
                  onPress={() => handleDocumentUpload(document.id, 'additional')}
                >
                  <Upload size={16} color={colors.text.secondary} />
                  <Text style={[styles.reuploadButtonText, { color: colors.text.secondary }]}>Replace</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: colors.primary.main }]}
                onPress={() => handleDocumentUpload(document.id, 'additional')}
              >
                <Camera size={20} color="white" />
                <Text style={[styles.uploadButtonText, { color: colors.text.white }]}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
        <AlertCircle size={20} color={colors.status.warning} />
        <Text style={[styles.infoText, { color: colors.text.secondary }]}>
          Take photos directly with your camera. Ensure all documents are clear, well-lit, and show all information. Blurry or incomplete documents may delay verification.
        </Text>
      </View>
    </View>
  );

  const renderVerificationStep = () => {
    // Show loading state while checking status
    if (loadingStatus) {
      return (
        <View style={styles.verificationContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.verificationTitle, { color: colors.text.primary }]}>Loading Status...</Text>
          <Text style={[styles.verificationSubtitle, { color: colors.text.secondary }]}>
            Checking your verification status...
          </Text>
        </View>
      );
    }

    // If no submission status and not loading, show start verification option
    if (!submissionStatus) {
      return (
        <View style={styles.verificationContainer}>
          <Shield size={48} color={colors.primary.main} />
          <Text style={[styles.verificationTitle, { color: colors.text.primary }]}>Start Verification</Text>
          <Text style={[styles.verificationSubtitle, { color: colors.text.secondary }]}>
            Begin your eKYC verification process to verify your identity and access all features.
          </Text>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary.main }]}
            onPress={() => setShowRealNameInput(true)}
          >
            <Text style={[styles.submitButtonText, { color: colors.text.white }]}>Start Verification</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const getStatusIcon = () => {
      switch (submissionStatus.status) {
        case 'approved':
          return <CheckCircle size={48} color={colors.status.success} />;
        case 'rejected':
          return <XCircle size={48} color={colors.status.error} />;
        default:
          return <Clock size={48} color={colors.primary.main} />;
      }
    };

    const getStatusTitle = () => {
      switch (submissionStatus.status) {
        case 'approved':
          return 'Verification Approved';
        case 'rejected':
          return 'Verification Rejected';
        default:
          return 'Verification in Progress';
      }
    };

    const getStatusSubtitle = () => {
      switch (submissionStatus.status) {
        case 'approved':
          return 'Your identity has been successfully verified. You can now access all features.';
        case 'rejected':
          return submissionStatus.admin_notes || 'Your verification was not approved. Please review and resubmit.';
        default:
          return 'We are reviewing your submission. This may take 1-3 business days.';
      }
    };

    return (
      <View style={styles.verificationContainer}>
        {getStatusIcon()}
        <Text style={[styles.verificationTitle, { color: colors.text.primary }]}>{getStatusTitle()}</Text>
        <Text style={[styles.verificationSubtitle, { color: colors.text.secondary }]}>
          {getStatusSubtitle()}
        </Text>
        
        <View style={[styles.reviewCard, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light, marginTop: 20 }]}>
          <Text style={[styles.reviewSectionTitle, { color: colors.text.primary }]}>Submission Details</Text>
          <View style={styles.reviewItem}>
            <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Submitted:</Text>
            <Text style={[styles.reviewValue, { color: colors.text.primary }]}>
              {new Date(submissionStatus.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Status:</Text>
            <Text style={[styles.reviewValue, { color: colors.text.primary }]}>
              {submissionStatus.status.charAt(0).toUpperCase() + submissionStatus.status.slice(1)}
            </Text>
          </View>
          {submissionStatus.reviewed_at && (
            <View style={styles.reviewItem}>
              <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Reviewed:</Text>
              <Text style={[styles.reviewValue, { color: colors.text.primary }]}>
                {new Date(submissionStatus.reviewed_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {submissionStatus.status === 'rejected' && (
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary.main, marginTop: 20 }]}
            onPress={() => setCurrentStep('personal')}
          >
            <Text style={[styles.submitButtonText, { color: colors.text.white }]}>Resubmit Application</Text>
          </TouchableOpacity>
        )}
        
        {(submissionStatus.status === 'approved' || submissionStatus.status === 'pending') && (
          <View style={styles.completeButtonContainer}>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary.main, flex: 1, marginRight: 10 }]}
              onPress={() => router.replace('/')}
            >
              <Text style={[styles.submitButtonText, { color: colors.text.white }]}>Return to Home</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.background.tertiary, borderWidth: 1, borderColor: colors.primary.main, flex: 1, marginLeft: 10 }]}
              onPress={() => router.push('/my-account')}
            >
              <Text style={[styles.submitButtonText, { color: colors.primary.main }]}>View Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderReviewStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Review & Submit</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
        Please review your information before submission
      </Text>

      <View style={[styles.reviewCard, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
        <Text style={[styles.reviewSectionTitle, { color: colors.text.primary }]}>Personal Information</Text>
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Nationality:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>
            {personalInfo.nationality === 'malaysian' ? 'Malaysian' : 'Foreigner'}
          </Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Full Name:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.fullName}</Text>
        </View>
        {personalInfo.nationality === 'malaysian' ? (
          <View style={styles.reviewItem}>
            <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>IC Number:</Text>
            <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.icNumber}</Text>
          </View>
        ) : (
          <>
            <View style={styles.reviewItem}>
              <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Country:</Text>
              <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.country}</Text>
            </View>
            <View style={styles.reviewItem}>
              <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Passport Number:</Text>
              <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.passportNumber}</Text>
            </View>
          </>
        )}
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Date of Birth:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.dateOfBirth}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Phone:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.phoneNumber}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Email:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.email}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Address Type:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>
            {personalInfo.addressType === 'current' ? 'Current Address' : 'Registered Address'}
          </Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Address:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.address}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>City:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.city}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>Postcode:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.postcode}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={[styles.reviewLabel, { color: colors.text.secondary }]}>State:</Text>
          <Text style={[styles.reviewValue, { color: colors.text.primary }]}>{personalInfo.state}</Text>
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

      <View style={styles.completeButtonContainer}>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary.main, flex: 1, marginRight: 10 }]}
          onPress={() => router.replace('/')}
        >
          <Text style={[styles.submitButtonText, { color: colors.text.white }]}>Return to Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.background.tertiary, borderWidth: 1, borderColor: colors.primary.main, flex: 1, marginLeft: 10 }]}
          onPress={() => router.push('/my-account')}
        >
          <Text style={[styles.submitButtonText, { color: colors.primary.main }]}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Real Name Input Modal */}
      <RealNameInputModal
        visible={showRealNameInput}
        onSubmit={handleRealNameSubmit}
        onCancel={handleRealNameCancel}
        realName={realName}
        setRealName={setRealName}
      />

      {/* PDPA Consent Modal */}
      <PDPAConsentModal
        visible={showPDPAConsent}
        onAccept={handlePDPAConsentAccept}
        onDecline={handlePDPAConsentDecline}
        userName={realName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
      />

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
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Show loading state for verification step while loading */}
          {currentStep === 'verification' && loadingStatus ? (
            <View style={styles.verificationContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <Text style={[styles.verificationTitle, { color: colors.text.primary }]}>Loading Status...</Text>
              <Text style={[styles.verificationSubtitle, { color: colors.text.secondary }]}>
                Checking your verification status...
              </Text>
            </View>
          ) : (
            <>
              {currentStep === 'identity_document' && renderIdentityDocumentStep()}
              {currentStep === 'personal' && renderPersonalInfoStep()}
              {currentStep === 'documents' && renderDocumentsStep()}
              {currentStep === 'verification' && renderVerificationStep()}
              {currentStep === 'review' && renderReviewStep()}
              {currentStep === 'complete' && renderCompleteStep()}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
            style={[
              styles.nextButton, 
              { 
                backgroundColor: colors.primary.main 
              }
            ]}
            onPress={currentStep === 'review' ? handleSubmitVerification : handleNextStep}
            disabled={currentStep === 'review' && isSubmitting}
          >
            {currentStep === 'review' && isSubmitting ? (
              <ActivityIndicator size="small" color={colors.text.white} />
            ) : (
              <Text style={[
                styles.nextButtonText, 
                { 
                  color: colors.text.white 
                }
              ]}>
                {currentStep === 'review' ? 'Submit' : 'Next'}
              </Text>
            )}
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
    marginBottom: 4,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 2,
  },
  stepLine: {
    width: 2,
    height: 12,
    marginVertical: 1,
  },
  stepInfo: {
    alignItems: 'center',
    marginTop: 2,
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
  nationalityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nationalityButtonText: {
    fontSize: 16,
    fontWeight: '500',
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

  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#8E8E93',
  },
  dropdownOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 1001,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginTop: 4,
    backgroundColor: 'white',
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    backgroundColor: 'white',
  },
  dropdownOptionText: {
    fontSize: 16,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  documentStatus: {
    alignItems: 'center',
    marginTop: 8,
  },
  documentStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  documentPreview: {
    marginTop: 12,
    alignItems: 'center',
  },
  previewImageContainer: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  reuploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  reuploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  completeButtonContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  aiAutoFillContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  aiAutoFillHeader: {
    marginBottom: 12,
  },
  aiAutoFillTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiAutoFillSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  aiAutoFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  aiAutoFillButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  aiAnalysisBadge: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  aiAnalysisStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  aiAnalysisStatusText: {
    fontSize: 14,
    flex: 1,
  },
  aiAnalysisOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  aiAnalysisContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiAnalysisIconContainer: {
    marginBottom: 20,
  },
  aiAnalysisTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  aiAnalysisSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  aiAnalysisProgress: {
    width: '100%',
    alignItems: 'center',
  },
  aiAnalysisProgressBar: {
    width: 200,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  aiAnalysisProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
    width: '60%',
    // Add a subtle animation effect
    transform: [{ scaleX: 1 }],
  },
  aiAnalysisProgressText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pdpaConsentSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  pdpaConsentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pdpaConsentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  pdpaConsentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  pdpaConsentStatusText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  pdpaConsentButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  pdpaConsentButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});
