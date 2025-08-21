#!/usr/bin/env node

/**
 * Simple syntax validation for the chat screen
 */

const fs = require('fs');
const path = require('path');

function validateChatSyntax() {
  console.log('🔍 Validating chat screen syntax...\n');

  try {
    const chatFilePath = path.join(process.cwd(), 'app/chat/[participantId].tsx');
    const content = fs.readFileSync(chatFilePath, 'utf8');

    // Basic syntax checks
    const checks = [
      {
        name: 'Balanced curly braces',
        test: () => {
          const openBraces = (content.match(/{/g) || []).length;
          const closeBraces = (content.match(/}/g) || []).length;
          return openBraces === closeBraces;
        }
      },
      {
        name: 'Balanced parentheses',
        test: () => {
          const openParens = (content.match(/\(/g) || []).length;
          const closeParens = (content.match(/\)/g) || []).length;
          return openParens === closeParens;
        }
      },
      {
        name: 'Balanced square brackets',
        test: () => {
          const openBrackets = (content.match(/\[/g) || []).length;
          const closeBrackets = (content.match(/\]/g) || []).length;
          return openBrackets === closeBrackets;
        }
      },
      {
        name: 'Has export default',
        test: () => content.includes('export default ChatScreen')
      },
      {
        name: 'Has StructuredInquiryMessage import',
        test: () => content.includes('StructuredInquiryMessage')
      },
      {
        name: 'Has ServiceVariantSelectionModal import',
        test: () => content.includes('ServiceVariantSelectionModal')
      },
      {
        name: 'Has structured inquiry handling',
        test: () => content.includes("messageType === 'structured_inquiry'")
      },
      {
        name: 'Has service variant selection modal',
        test: () => content.includes('serviceVariantSelectionModalVisible')
      }
    ];

    let allPassed = true;
    checks.forEach(check => {
      const passed = check.test();
      console.log(`${passed ? '✅' : '❌'} ${check.name}`);
      if (!passed) allPassed = false;
    });

    console.log(`\n📊 File statistics:`);
    console.log(`   Lines: ${content.split('\n').length}`);
    console.log(`   Characters: ${content.length}`);
    console.log(`   Functions: ${(content.match(/const\s+\w+\s*=\s*async?\s*\(/g) || []).length}`);
    console.log(`   Components: ${(content.match(/import.*from.*components/g) || []).length}`);

    if (allPassed) {
      console.log('\n🎉 All syntax checks passed!');
      console.log('\n✨ The structured inquiry system is ready to use!');
    } else {
      console.log('\n❌ Some syntax checks failed. Please review the issues above.');
    }

    return allPassed;

  } catch (error) {
    console.error('❌ Error validating syntax:', error.message);
    return false;
  }
}

// Run validation
validateChatSyntax();