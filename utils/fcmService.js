const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let firebaseApp = null;

const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (firebaseApp) {
      return firebaseApp;
    }

    // Check if service account key is provided
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
    }

    // Parse the service account key
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (error) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
    }

    // Initialize Firebase Admin SDK
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Optional: Add your Firebase project ID
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
    });

    console.log('Firebase Admin SDK initialized successfully');
    return firebaseApp;

  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    throw error;
  }
};

/**
 * Send push notification to a specific device token
 * @param {string} token - FCM device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload (optional)
 * @param {Object} options - Additional notification options (optional)
 * @returns {Promise<Object>} - Result object with success status and message
 */
const sendPushNotification = async (token, title, body, data = {}, options = {}) => {
  try {
    // Validate required parameters
    if (!token || !title || !body) {
      throw new Error('Missing required parameters: token, title, and body are required');
    }

    // Initialize Firebase if not already done
    if (!firebaseApp) {
      initializeFirebase();
    }

    // Prepare the message
    const message = {
      token: token,
      notification: {
        title: title,
        body: body
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        type: data.type || 'general'
      },
      // Default options
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
          ...options.android
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            ...options.apns
          }
        }
      },
      // Web push options
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          ...options.webpush
        }
      }
    };

    // Send the message
    const response = await admin.messaging().send(message);
    
    console.log('Push notification sent successfully:', response);
    
    return {
      success: true,
      messageId: response,
      message: 'Push notification sent successfully'
    };

  } catch (error) {
    console.error('Error sending push notification:', error.message);
    
    // Handle specific Firebase errors
    if (error.code === 'messaging/invalid-registration-token') {
      return {
        success: false,
        error: 'Invalid device token',
        message: 'The provided device token is invalid or expired'
      };
    } else if (error.code === 'messaging/registration-token-not-registered') {
      return {
        success: false,
        error: 'Token not registered',
        message: 'The device token is not registered with FCM'
      };
    }
    
    return {
      success: false,
      error: error.message,
      message: 'Failed to send push notification'
    };
  }
};

/**
 * Send push notification to multiple device tokens
 * @param {Array<string>} tokens - Array of FCM device tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload (optional)
 * @param {Object} options - Additional notification options (optional)
 * @returns {Promise<Object>} - Result object with success status and message
 */
const sendMulticastNotification = async (tokens, title, body, data = {}, options = {}) => {
  try {
    // Validate required parameters
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      throw new Error('tokens must be a non-empty array');
    }

    if (!title || !body) {
      throw new Error('title and body are required');
    }

    // Initialize Firebase if not already done
    if (!firebaseApp) {
      initializeFirebase();
    }

    // Prepare the message
    const message = {
      tokens: tokens,
      notification: {
        title: title,
        body: body
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        type: data.type || 'general'
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
          ...options.android
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            ...options.apns
          }
        }
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          ...options.webpush
        }
      }
    };

    // Send the message
    const response = await admin.messaging().sendMulticast(message);
    
    console.log('Multicast notification sent:', {
      successCount: response.successCount,
      failureCount: response.failureCount
    });
    
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
      message: `Sent to ${response.successCount} devices, ${response.failureCount} failed`
    };

  } catch (error) {
    console.error('Error sending multicast notification:', error.message);
    
    return {
      success: false,
      error: error.message,
      message: 'Failed to send multicast notification'
    };
  }
};

/**
 * Send push notification to a topic
 * @param {string} topic - FCM topic name
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload (optional)
 * @param {Object} options - Additional notification options (optional)
 * @returns {Promise<Object>} - Result object with success status and message
 */
const sendTopicNotification = async (topic, title, body, data = {}, options = {}) => {
  try {
    // Validate required parameters
    if (!topic || !title || !body) {
      throw new Error('Missing required parameters: topic, title, and body are required');
    }

    // Initialize Firebase if not already done
    if (!firebaseApp) {
      initializeFirebase();
    }

    // Prepare the message
    const message = {
      topic: topic,
      notification: {
        title: title,
        body: body
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        type: data.type || 'general'
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
          ...options.android
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            ...options.apns
          }
        }
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          ...options.webpush
        }
      }
    };

    // Send the message
    const response = await admin.messaging().send(message);
    
    console.log('Topic notification sent successfully:', response);
    
    return {
      success: true,
      messageId: response,
      message: 'Topic notification sent successfully'
    };

  } catch (error) {
    console.error('Error sending topic notification:', error.message);
    
    return {
      success: false,
      error: error.message,
      message: 'Failed to send topic notification'
    };
  }
};

/**
 * Subscribe device tokens to a topic
 * @param {Array<string>} tokens - Array of FCM device tokens
 * @param {string} topic - Topic name to subscribe to
 * @returns {Promise<Object>} - Result object with success status and message
 */
const subscribeToTopic = async (tokens, topic) => {
  try {
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      throw new Error('tokens must be a non-empty array');
    }

    if (!topic) {
      throw new Error('topic is required');
    }

    // Initialize Firebase if not already done
    if (!firebaseApp) {
      initializeFirebase();
    }

    const response = await admin.messaging().subscribeToTopic(tokens, topic);
    
    console.log('Successfully subscribed to topic:', response);
    
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      message: `Subscribed ${response.successCount} tokens to topic '${topic}'`
    };

  } catch (error) {
    console.error('Error subscribing to topic:', error.message);
    
    return {
      success: false,
      error: error.message,
      message: 'Failed to subscribe to topic'
    };
  }
};

/**
 * Unsubscribe device tokens from a topic
 * @param {Array<string>} tokens - Array of FCM device tokens
 * @param {string} topic - Topic name to unsubscribe from
 * @returns {Promise<Object>} - Result object with success status and message
 */
const unsubscribeFromTopic = async (tokens, topic) => {
  try {
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      throw new Error('tokens must be a non-empty array');
    }

    if (!topic) {
      throw new Error('topic is required');
    }

    // Initialize Firebase if not already done
    if (!firebaseApp) {
      initializeFirebase();
    }

    const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
    
    console.log('Successfully unsubscribed from topic:', response);
    
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      message: `Unsubscribed ${response.successCount} tokens from topic '${topic}'`
    };

  } catch (error) {
    console.error('Error unsubscribing from topic:', error.message);
    
    return {
      success: false,
      error: error.message,
      message: 'Failed to unsubscribe from topic'
    };
  }
};

module.exports = {
  sendPushNotification,
  sendMulticastNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
  initializeFirebase
};
