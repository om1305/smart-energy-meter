# Smart Energy Meter Backend

A comprehensive Node.js backend for Smart Energy Meter with Dashboard and AI Assistance, built with Express.js and MongoDB Atlas.

##  Features

- **User Management**: Registration, authentication, and profile management with JWT
- **Device Management**: Add, update, delete, and monitor IoT devices
- **Energy Data Collection**: Real-time data ingestion from ESP32 devices
- **AI/ML Integration**: Predictive analytics with Python FastAPI service
- **Alert System**: Automated alerts for power spikes and anomalies
- **Chatbot Assistant**: Natural language queries about energy usage

##  Architecture

```
 config/           # Database configuration
 models/           # Mongoose schemas
 controllers/      # Business logic
 routes/           # Express routes
 middleware/       # Auth and error handling
 server.js         # Main application
 package.json      # Dependencies
```

##  Technologies

- **Node.js** + **Express.js** - Backend framework
- **MongoDB Atlas** + **Mongoose** - Database and ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **axios** - HTTP client for AI service
- **express-validator** - Input validation
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing
- **morgan** - HTTP request logger

##  Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/smart-energy-meter?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
PORT=3000
AI_API_URL=http://localhost:5000/predict
NODE_ENV=development
```

### 3. MongoDB Atlas Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database user
4. Whitelist your IP address
5. Get your connection string and update `MONGO_URI` in `.env`

### 4. Run the Application

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

##  API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/:id` - Get user profile

### Device Management
- `POST /api/devices/add` - Add new device
- `GET /api/devices/:userId` - Get user devices
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device

### Energy Data (ESP32 Integration)
- `POST /api/energy/add` - Add energy reading from ESP32
- `GET /api/energy/:deviceId` - Get energy readings

### Alerts
- `GET /api/alerts/:userId` - Get user alerts
- `POST /api/alerts/create` - Create alert
- `PUT /api/alerts/:id/read` - Mark alert as read
- `PUT /api/alerts/:id/resolve` - Resolve alert

### AI/ML Integration
- `GET /api/ai/predict/:deviceId` - Get AI prediction
- `GET /api/ai/predictions/:deviceId` - Get prediction history

### Chatbot
- `POST /api/chatbot/query` - Handle chatbot queries

##  ESP32 Integration

### HTTP POST to Add Energy Reading

Send JSON data to `POST /api/energy/add`:

```json
{
  "deviceId": "esp32_001",
  "current": 2.3,
  "voltage": 230.5,
  "temperature": 32.5
}
```

**ESP32 Arduino Code Example:**

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverURL = "http://your-server.com/api/energy/add";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    sendEnergyData();
  }
  delay(30000); // Send data every 30 seconds
}

void sendEnergyData() {
  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  
  // Read sensor values
  float current = analogRead(A0) * 0.1; // Example calculation
  float voltage = analogRead(A1) * 0.5;  // Example calculation
  float temperature = analogRead(A2) * 0.1; // Example calculation
  
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = "esp32_001";
  doc["current"] = current;
  doc["voltage"] = voltage;
  doc["temperature"] = temperature;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Data sent successfully: " + response);
  } else {
    Serial.println("Error sending data: " + String(httpResponseCode));
  }
  
  http.end();
}
```

##  AI/ML Integration

### Python FastAPI Service

The backend integrates with a Python FastAPI service for AI predictions:

**Expected Python API Endpoint:**
```
POST http://localhost:5000/predict
```

**Request Format:**
```json
{
  "deviceId": "esp32_001",
  "readings": [
    {
      "current": 2.3,
      "voltage": 230.5,
      "temperature": 32.5,
      "power": 529.15,
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ],
  "predictionHours": 24
}
```

**Response Format:**
```json
{
  "predictedPower": 550.2,
  "predictedCurrent": 2.4,
  "predictedVoltage": 229.3,
  "predictedTemperature": 33.1,
  "confidence": 0.85,
  "modelVersion": "1.0",
  "metadata": {}
}
```

##  Chatbot Queries

The chatbot supports natural language queries:

- "What's my power consumption today?"
- "Which device consumed most power?"
- "Show me temperature readings"
- "Do I have any alerts?"
- "Help me understand my energy usage"

##  Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS configuration
- Security headers with Helmet
- Error handling without sensitive data exposure

##  Database Schemas

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (user/admin)
}
```

### Device
```javascript
{
  userId: ObjectId,
  deviceName: String,
  deviceType: String,
  powerRating: Number,
  status: String,
  deviceId: String (unique),
  location: String,
  description: String
}
```

### EnergyReading
```javascript
{
  deviceId: String,
  current: Number,
  voltage: Number,
  temperature: Number,
  power: Number,
  timestamp: Date,
  userId: ObjectId
}
```

### Alert
```javascript
{
  userId: ObjectId,
  deviceId: String,
  message: String,
  alertType: String,
  severity: String,
  isRead: Boolean,
  isResolved: Boolean,
  metadata: Object
}
```

### Prediction
```javascript
{
  deviceId: String,
  userId: ObjectId,
  predictedPower: Number,
  predictedCurrent: Number,
  predictedVoltage: Number,
  predictedTemperature: Number,
  confidence: Number,
  predictionDate: Date,
  modelVersion: String,
  inputData: Object,
  metadata: Object
}
```

##  Deployment

### Environment Variables for Production

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/smart-energy-meter?retryWrites=true&w=majority
JWT_SECRET=your-production-secret-key-here
PORT=3000
AI_API_URL=https://your-ai-service.com/predict
NODE_ENV=production
```

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

##  Testing

Test the API endpoints using tools like Postman or curl:

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

##  License

MIT License - see LICENSE file for details.

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

##  Support

For support and questions, please open an issue in the repository.
#   - s m a r t - m e t e r - b a c k e n d  
 