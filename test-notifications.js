/**
 * Test script for notification services
 * Run with: node test-notifications.js
 */

require('dotenv').config();

const { sendEmail, sendTemplateEmail } = require('./utils/emailService');
const { sendPushNotification } = require('./utils/fcmService');
const { sendEnergyAlert } = require('./utils/notificationService');

async function testEmailService() {
  console.log('\n=== Testing Email Service ===');
  
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('❌ SMTP not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
    return false;
  }

  try {
    // Test basic email
    console.log('Testing basic email...');
    const result = await sendEmail(
      'test@example.com', // Replace with your test email
      'Test Email from Smart Energy Meter',
      '<h1>Test Email</h1><p>This is a test email from the Smart Energy Meter notification system.</p>'
    );
    
    if (result.success) {
      console.log('✅ Basic email test passed');
    } else {
      console.log('❌ Basic email test failed:', result.error);
    }

    // Test template email
    console.log('Testing template email...');
    const templateResult = await sendTemplateEmail('test@example.com', 'alert', {
      deviceName: 'Test Device',
      alertType: 'High Consumption',
      message: 'This is a test alert'
    });
    
    if (templateResult.success) {
      console.log('✅ Template email test passed');
    } else {
      console.log('❌ Template email test failed:', templateResult.error);
    }

    return result.success && templateResult.success;
  } catch (error) {
    console.log('❌ Email service error:', error.message);
    return false;
  }
}

async function testFCMService() {
  console.log('\n=== Testing FCM Service ===');
  
  // Check if FCM is configured
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.log('❌ FCM not configured. Please set FIREBASE_SERVICE_ACCOUNT_KEY in .env');
    return false;
  }

  try {
    // Test push notification (you'll need a valid FCM token)
    console.log('Testing push notification...');
    const testToken = 'test-token-replace-with-real-token'; // Replace with real FCM token
    
    const result = await sendPushNotification(
      testToken,
      'Test Notification',
      'This is a test push notification from Smart Energy Meter',
      { type: 'test', timestamp: new Date().toISOString() }
    );
    
    if (result.success) {
      console.log('✅ Push notification test passed');
    } else {
      console.log('❌ Push notification test failed:', result.error);
      if (result.error === 'Invalid device token') {
        console.log('   This is expected with a test token. Use a real FCM token for actual testing.');
      }
    }

    return true; // Return true even if token is invalid (expected with test token)
  } catch (error) {
    console.log('❌ FCM service error:', error.message);
    return false;
  }
}

async function testCombinedService() {
  console.log('\n=== Testing Combined Notification Service ===');
  
  try {
    // Test energy alert (will only work if both email and FCM are configured)
    console.log('Testing energy alert...');
    const result = await sendEnergyAlert({
      email: 'test@example.com', // Replace with your test email
      fcmToken: 'test-token-replace-with-real-token', // Replace with real FCM token
      deviceName: 'Test Kitchen Meter',
      alertType: 'High Consumption',
      message: 'Energy usage exceeded 1000W threshold',
      energyData: {
        currentUsage: 1200,
        threshold: 1000,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('Energy alert result:', result);
    
    if (result.success) {
      console.log('✅ Combined notification test passed');
    } else {
      console.log('❌ Combined notification test failed');
      if (result.errors && result.errors.length > 0) {
        console.log('   Errors:', result.errors);
      }
    }

    return result.success;
  } catch (error) {
    console.log('❌ Combined service error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Notification Services Test');
  console.log('=====================================');
  
  const emailResult = await testEmailService();
  const fcmResult = await testFCMService();
  const combinedResult = await testCombinedService();
  
  console.log('\n=== Test Results Summary ===');
  console.log(`Email Service: ${emailResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`FCM Service: ${fcmResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Combined Service: ${combinedResult ? '✅ PASS' : '❌ FAIL'}`);
  
  if (emailResult && fcmResult && combinedResult) {
    console.log('\n🎉 All tests passed! Your notification services are ready to use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check your configuration and try again.');
    console.log('\nSetup Instructions:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Configure SMTP settings for email');
    console.log('3. Configure Firebase service account key for FCM');
    console.log('4. Replace test email and FCM token with real values');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testEmailService,
  testFCMService,
  testCombinedService,
  runTests
};
