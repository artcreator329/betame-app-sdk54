export const SERVICE_PROVIDER_TERMS_OF_SERVICE = {
  title: "Service Provider Terms of Service",
  lastUpdated: "January 2025",
  content: `
SERVICE PROVIDER TERMS OF SERVICE

Last Updated: January 2025

WELCOME TO BETAME

These Service Provider Terms of Service ("Terms") govern your use of BetaMe's platform as a service provider. By accepting these Terms, you agree to be bound by all provisions outlined herein.

1. DEFINITIONS

1.1 "Platform" refers to the BetaMe mobile application and related services.
1.2 "Service Provider" refers to individuals or entities offering services through the Platform.
1.3 "Customer" refers to users who request and purchase services through the Platform.
1.4 "Services" refers to any work, products, or assistance offered by Service Providers.
1.5 "Company" refers to BetaMe and its affiliates.

2. ELIGIBILITY AND REGISTRATION

2.1 You must be at least 18 years old and legally capable of entering into contracts.
2.2 You must provide accurate, complete, and current information during registration.
2.3 You must complete the eKYC (electronic Know Your Customer) verification process.
2.4 You must maintain valid identification documents and business licenses where applicable.
2.5 You represent that you have the right to offer the services you list on the Platform.

3. SERVICE PROVIDER OBLIGATIONS

3.1 SERVICE QUALITY
- Provide services with professional competence and in accordance with industry standards
- Deliver services as described in your listings
- Maintain appropriate qualifications, licenses, and certifications
- Use suitable equipment and materials for service delivery

3.2 PROFESSIONAL CONDUCT
- Treat all customers with respect and professionalism
- Communicate clearly and promptly with customers
- Arrive punctually for scheduled appointments
- Maintain confidentiality of customer information
- Comply with all applicable laws and regulations

3.3 PLATFORM COMPLIANCE
- Keep your profile and service listings accurate and up-to-date
- Respond to customer inquiries within 24 hours
- Accept or decline service requests within the specified timeframe
- Complete services within agreed timelines
- Provide accurate pricing and service descriptions

4. PAYMENT TERMS

4.1 COMMISSION STRUCTURE
- BetaMe charges a service fee on completed transactions
- Commission rates are clearly displayed in your provider dashboard
- Fees may vary based on service category and provider tier

4.2 PAYMENT PROCESSING
- Payments are processed through secure third-party payment processors
- Service providers receive payment after successful service completion
- Payment timing may vary based on payment method and verification requirements
- Refunds and disputes are handled according to our Refund Policy

4.3 TAXES AND COMPLIANCE
- You are responsible for all applicable taxes on your earnings
- You must comply with local tax laws and regulations
- BetaMe may provide tax documentation as required by law

5. INTELLECTUAL PROPERTY

5.1 You retain ownership of your original content and intellectual property
5.2 You grant BetaMe a license to use your content for platform operations
5.3 You must respect the intellectual property rights of others
5.4 BetaMe reserves all rights to its platform, trademarks, and proprietary technology

6. PROHIBITED ACTIVITIES

6.1 You may not:
- Provide false or misleading information
- Engage in fraudulent or deceptive practices
- Violate any applicable laws or regulations
- Discriminate against customers based on protected characteristics
- Solicit customers to transact outside the platform
- Share customer contact information without consent
- Engage in price manipulation or anti-competitive practices
- Use the platform for illegal activities

7. QUALITY ASSURANCE AND REVIEWS

7.1 Customer reviews and ratings are important for platform integrity
7.2 You may not manipulate reviews or ratings
7.3 BetaMe reserves the right to investigate and remove fraudulent reviews
7.4 Consistently poor performance may result in account restrictions

8. DATA PROTECTION AND PRIVACY

8.1 You must comply with applicable data protection laws
8.2 Customer personal information must be handled securely and confidentially
8.3 You may only use customer data for service delivery purposes
8.4 Data breaches must be reported to BetaMe immediately

9. INSURANCE AND LIABILITY

9.1 You are encouraged to maintain appropriate insurance coverage
9.2 You are liable for damages caused by your services or negligence
9.3 BetaMe's liability is limited as outlined in our Terms of Use
9.4 You agree to indemnify BetaMe against claims arising from your services

10. ACCOUNT SUSPENSION AND TERMINATION

10.1 BetaMe may suspend or terminate accounts for:
- Violation of these Terms
- Fraudulent or illegal activities
- Consistently poor service quality
- Customer safety concerns
- Non-compliance with platform policies

10.2 You may terminate your account at any time with proper notice
10.3 Certain obligations survive account termination

11. DISPUTE RESOLUTION

11.1 We encourage direct resolution of disputes between parties
11.2 BetaMe provides mediation services for unresolved disputes
11.3 Serious disputes may be subject to arbitration
11.4 Legal proceedings are subject to the jurisdiction of Malaysian courts

12. PLATFORM MODIFICATIONS

12.1 BetaMe may modify platform features and policies with notice
12.2 Continued use constitutes acceptance of modifications
12.3 Material changes will be communicated with reasonable advance notice

13. FORCE MAJEURE

13.1 Neither party is liable for delays caused by circumstances beyond reasonable control
13.2 This includes natural disasters, government actions, and technical failures
13.3 Parties must make reasonable efforts to mitigate such circumstances

14. GOVERNING LAW

14.1 These Terms are governed by Malaysian law
14.2 Disputes are subject to the exclusive jurisdiction of Malaysian courts
14.3 If any provision is unenforceable, the remainder remains in effect

15. CONTACT INFORMATION

For questions about these Terms, contact us at:
Email: support@betame.com
Address: BetaMe Headquarters, Kuala Lumpur, Malaysia

BY ACCEPTING THESE TERMS, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY ALL PROVISIONS HEREIN.

Your acceptance constitutes a legally binding agreement between you and BetaMe.
`
};

export const generateToSPDF = (fullName: string, icNumber: string, acceptanceDate: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Service Provider Terms of Service - ${fullName}</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            margin: 40px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 16px;
            color: #666;
        }
        .acceptance-section {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            margin: 20px 0;
            border-radius: 5px;
        }
        .signature-section {
            margin-top: 40px;
            border-top: 1px solid #333;
            padding-top: 20px;
        }
        .signature-line {
            border-bottom: 1px solid #333;
            width: 300px;
            height: 20px;
            margin: 10px 0;
        }
        .content {
            white-space: pre-line;
            text-align: justify;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">SERVICE PROVIDER TERMS OF SERVICE</div>
        <div class="subtitle">BetaMe Platform Agreement</div>
        <div class="subtitle">Last Updated: January 2025</div>
    </div>
    
    <div class="acceptance-section">
        <h3>ACCEPTANCE CONFIRMATION</h3>
        <p><strong>Service Provider Name:</strong> ${fullName}</p>
        <p><strong>IC Number:</strong> ${icNumber}</p>
        <p><strong>Date of Acceptance:</strong> ${acceptanceDate}</p>
        <p><strong>Digital Acceptance:</strong> ✓ Confirmed via BetaMe eKYC Platform</p>
    </div>
    
    <div class="content">
        ${SERVICE_PROVIDER_TERMS_OF_SERVICE.content}
    </div>
    
    <div class="signature-section">
        <h3>DIGITAL ACCEPTANCE RECORD</h3>
        <p>This document serves as a record of digital acceptance of the Service Provider Terms of Service.</p>
        <p><strong>Accepted by:</strong> ${fullName}</p>
        <p><strong>IC Number:</strong> ${icNumber}</p>
        <p><strong>Date & Time:</strong> ${acceptanceDate}</p>
        <p><strong>Platform:</strong> BetaMe eKYC Verification System</p>
        <p><strong>IP Verification:</strong> Completed via secure authentication</p>
    </div>
    
    <div class="footer">
        <p>This document was generated electronically by the BetaMe platform.</p>
        <p>For verification purposes, please contact support@betame.com</p>
        <p>© 2025 BetaMe. All rights reserved.</p>
    </div>
</body>
</html>
`;
};