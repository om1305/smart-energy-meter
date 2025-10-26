# Notification Services

This directory contains utilities for sending email notifications and push notifications in the Smart Energy Meter backend.

## Services

### 1. Email Service (`emailService.js`)

Handles email notifications using Nodemailer with SMTP configuration.

#### Functions:
- `sendEmail(to, subject, message, from)` - Send a basic email
- `sendTemplateEmail(to, type, data)` - Send templated emails (alert, welcome, reset)

#### Environment Variables Required:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Usage Example:
```javascript
const { sendEmail, sendTemplateEmail } = require('./utils/emailService');

// Send basic email
const result = await sendEmail(
  'user@example.com',
  'Test Subject',
  '<h1>Hello World!</h1><p>This is a test email.</p>'
);

// Send templated email
const result = await sendTemplateEmail('user@example.com', 'alert', {
  deviceName: 'Kitchen Meter',
  alertType: 'High Consumption',
  message: 'Energy usage exceeded threshold'
});
```

### 2. Firebase Cloud Messaging Service (`fcmService.js`)

Handles push notifications using Firebase Admin SDK.

#### Functions:
- `sendPushNotification(token, title, body, data, options)` - Send to single device
- `sendMulticastNotification(tokens, title, body, data, options)` - Send to multiple devices
- `sendTopicNotification(topic, title, body, data, options)` - Send to topic subscribers
- `subscribeToTopic(tokens, topic)` - Subscribe devices to topic
- `unsubscribeFromTopic(tokens, topic)` - Unsubscribe devices from topic

#### Environment Variables Required:
```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

#### Usage Example:
```javascript
const { sendPushNotification } = require('./utils/fcmService');

const result = await sendPushNotification(
  'device-fcm-token',
  'Energy Alert',
  'High consumption detected',
  { deviceId: '123', alertType: 'high_usage' }
);
```

### 3. Combined Notification Service (`notificationService.js`)

Combines email and push notifications for comprehensive user communication.

#### Functions:
- `sendNotification(options)` - Send both email and push notifications
- `sendEnergyAlert(options)` - Send energy-specific alerts
- `sendDeviceStatusNotification(options)` - Send device status updates
- `sendEnergyReport(options)` - Send energy consumption reports
- `sendWelcomeNotification(options)` - Send welcome messages

#### Usage Example:
```javascript
const { sendEnergyAlert } = require('./utils/notificationService');

const result = await sendEnergyAlert({
  email: 'user@example.com',
  fcmToken: 'device-token',
  deviceName: 'Kitchen Meter',
  alertType: 'High Consumption',
  message: 'Energy usage exceeded 1000W',
  energyData: { currentUsage: 1200, threshold: 1000 }
});
```

## API Endpoints

The notification system provides test endpoints at `/api/notifications`:

### Test Endpoints:
- `POST /api/notifications/test-email` - Test email sending
- `POST /api/notifications/test-push` - Test push notification
- `POST /api/notifications/test-combined` - Test combined notification
- `POST /api/notifications/test-energy-alert` - Test energy alert
- `GET /api/notifications/status` - Check service configuration status

### Example API Usage:

#### Test Email:
```bash
curl -X POST http://localhost:3000/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "message": "This is a test email from Smart Energy Meter"
  }'
```

#### Test Push Notification:
```bash
curl -X POST http://localhost:3000/api/notifications/test-push \
  -H "Content-Type: application/json" \
  -d '{
    "token": "device-fcm-token",
    "title": "Test Notification",
    "body": "This is a test push notification",
    "data": {"type": "test"}
  }'
```

## Setup Instructions

### 1. Email Setup (Gmail Example):

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Add to your `.env` file:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   ```

### 2. Firebase Setup:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Go to Project Settings → Service Accounts
4. Generate new private key (downloads JSON file)
5. Copy the entire JSON content to your `.env` file:
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
   FIREBASE_PROJECT_ID=your-project-id
   ```

### 3. Environment Variables:

Create a `.env` file in your project root with all required variables (see `.env.example`).

## Error Handling

All services return consistent result objects:

```javascript
{
  success: boolean,
  message: string,
  error?: string,
  messageId?: string, // For successful sends
  // Additional fields based on service type
}
```

## Best Practices

1. **Always check configuration** before sending notifications
2. **Handle errors gracefully** - notifications should not break your app
3. **Use appropriate notification types** for different scenarios
4. **Test with small batches** before sending to many users
5. **Monitor delivery rates** and handle failed tokens
6. **Respect user preferences** for notification types
7. **Use templates** for consistent messaging
8. **Include relevant data** in push notifications for deep linking

## Troubleshooting

### Email Issues:
- Check SMTP credentials and settings
- Verify app password (not regular password)
- Check firewall/network restrictions
- Test with different email providers

### FCM Issues:
- Verify service account key format (valid JSON)
- Check project ID matches Firebase project
- Ensure device tokens are valid and not expired
- Check Firebase project billing status

### Common Errors:
- `Invalid email address format` - Check email validation
- `SMTP credentials not configured` - Add required env variables
- `Invalid device token` - Token may be expired or invalid
- `Firebase not initialized` - Check service account key
