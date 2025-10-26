const axios = require("axios");
const tf = require("@tensorflow/tfjs");
const EnergyReading = require("../models/EnergyReading");
const Prediction = require("../models/Prediction");

// @desc    Get AI prediction for device
// @route   GET /api/ai/predict/:deviceId
// @access  Private
const getAIPrediction = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { hours = 24 } = req.query;

    // Get recent readings for the device
    const recentReadings = await EnergyReading.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(100); // Get last 100 readings

    if (recentReadings.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Insufficient data for prediction. Need at least 10 readings."
      });
    }

    // Prepare data for AI service
    const readingsData = recentReadings.map(reading => ({
      current: reading.current,
      voltage: reading.voltage,
      temperature: reading.temperature,
      power: reading.power,
      timestamp: reading.timestamp
    }));

    try {
      // Call Python AI service
      const aiResponse = await axios.post(process.env.AI_API_URL, {
        deviceId,
        readings: readingsData,
        predictionHours: parseInt(hours)
      });

      const predictionData = aiResponse.data;

      // Save prediction to database
      const prediction = await Prediction.create({
        deviceId,
        userId: req.user._id,
        predictedPower: predictionData.predictedPower,
        predictedCurrent: predictionData.predictedCurrent,
        predictedVoltage: predictionData.predictedVoltage,
        predictedTemperature: predictionData.predictedTemperature,
        confidence: predictionData.confidence,
        predictionDate: new Date(Date.now() + (parseInt(hours) * 60 * 60 * 1000)),
        modelVersion: predictionData.modelVersion || "1.0",
        inputData: {
          readingsCount: readingsData.length,
          lastReading: readingsData[0],
          predictionHours: parseInt(hours)
        },
        metadata: predictionData.metadata || {}
      });

      res.json({
        success: true,
        prediction,
        aiResponse: predictionData
      });
    } catch (aiError) {
      console.error("AI service error:", aiError.message);
      
      // Return mock prediction if AI service is unavailable
      const mockPrediction = await createMockPrediction(deviceId, req.user._id, readingsData, parseInt(hours));
      
      res.json({
        success: true,
        prediction: mockPrediction,
        message: "AI service unavailable, using mock prediction"
      });
    }
  } catch (error) {
    console.error("Get AI prediction error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// @desc    Get prediction history for device
// @route   GET /api/ai/predictions/:deviceId
// @access  Private
const getPredictionHistory = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const predictions = await Prediction.find({ deviceId })
      .sort({ predictionDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Prediction.countDocuments({ deviceId });

    res.json({
      success: true,
      count: predictions.length,
      total,
      predictions
    });
  } catch (error) {
    console.error("Get prediction history error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Helper function to create mock prediction when AI service is unavailable
const createMockPrediction = async (deviceId, userId, readingsData, hours) => {
  const lastReading = readingsData[0];
  const averagePower = readingsData.reduce((sum, r) => sum + r.power, 0) / readingsData.length;
  
  // Simple mock prediction based on recent trends
  const trendFactor = 1 + (Math.random() - 0.5) * 0.2; // 10% variation
  const predictedPower = averagePower * trendFactor;
  const predictedCurrent = (predictedPower / lastReading.voltage) * (1 + (Math.random() - 0.5) * 0.1);
  const predictedVoltage = lastReading.voltage * (1 + (Math.random() - 0.5) * 0.05);
  const predictedTemperature = lastReading.temperature + (Math.random() - 0.5) * 5;

  return await Prediction.create({
    deviceId,
    userId,
    predictedPower,
    predictedCurrent,
    predictedVoltage,
    predictedTemperature,
    confidence: 0.6 + Math.random() * 0.3, // 60-90% confidence
    predictionDate: new Date(Date.now() + (hours * 60 * 60 * 1000)),
    modelVersion: "mock-1.0",
    inputData: {
      readingsCount: readingsData.length,
      lastReading: lastReading,
      predictionHours: hours
    },
    metadata: {
      type: "mock_prediction",
      note: "Generated when AI service is unavailable"
    }
  });
};

// @desc    Predict next energy usage
// @route   POST /api/ai/predict-energy
// @access  Private
const predictEnergyUsage = async (req, res) => {
  try {
    const { 
      powerConsumption, 
      electricalParameters, 
      environmentalData, 
      deviceCharacteristics, 
      faultSimulationData, 
      timestamps 
    } = req.body;

    // Validate required data
    if (!powerConsumption || !electricalParameters || !timestamps) {
      return res.status(400).json({
        success: false,
        message: "Missing required data: powerConsumption, electricalParameters, and timestamps are required"
      });
    }

    // Prepare training data for linear regression
    const trainingData = prepareEnergyTrainingData(powerConsumption, electricalParameters, environmentalData, timestamps);
    
    // Create and train a simple linear regression model
    const model = createLinearRegressionModel();
    await trainEnergyModel(model, trainingData);

    // Make prediction for next time period
    const lastDataPoint = trainingData[trainingData.length - 1];
    const predictionInput = tf.tensor2d([[
      lastDataPoint.power,
      lastDataPoint.voltage,
      lastDataPoint.current,
      lastDataPoint.temperature || 25,
      lastDataPoint.humidity || 50,
      lastDataPoint.timestamp
    ]]);

    const prediction = model.predict(predictionInput);
    const predictedValue = await prediction.data();
    
    // Clean up tensors
    predictionInput.dispose();
    prediction.dispose();

    // Calculate confidence based on data quality
    const confidence = calculatePredictionConfidence(trainingData);

    res.json({
      success: true,
      prediction: {
        predictedEnergyUsage: predictedValue[0],
        confidence: confidence,
        timeHorizon: "next hour",
        modelType: "linear regression",
        inputDataPoints: trainingData.length,
        recommendations: generateEnergyRecommendations(predictedValue[0], electricalParameters, environmentalData)
      }
    });

  } catch (error) {
    console.error("Energy prediction error:", error.message);
    res.status(500).json({
      success: false,
      message: "Error predicting energy usage",
      error: error.message
    });
  }
};

// @desc    Predict potential device faults
// @route   POST /api/ai/predict-fault
// @access  Private
const predictDeviceFault = async (req, res) => {
  try {
    const { 
      powerConsumption, 
      electricalParameters, 
      environmentalData, 
      deviceCharacteristics, 
      faultSimulationData, 
      timestamps 
    } = req.body;

    // Validate required data
    if (!electricalParameters || !deviceCharacteristics) {
      return res.status(400).json({
        success: false,
        message: "Missing required data: electricalParameters and deviceCharacteristics are required"
      });
    }

    // Prepare features for fault classification
    const features = prepareFaultFeatures(electricalParameters, environmentalData, deviceCharacteristics, faultSimulationData);
    
    // Create and train a simple classification model
    const model = createFaultClassificationModel();
    await trainFaultModel(model, features);

    // Make fault prediction
    const inputFeatures = tf.tensor2d([features]);
    const prediction = model.predict(inputFeatures);
    const probabilities = await prediction.data();
    
    // Clean up tensors
    inputFeatures.dispose();
    prediction.dispose();

    // Determine fault type and probability
    const faultTypes = ['No Fault', 'Voltage Anomaly', 'Current Overload', 'Temperature Issue', 'Connection Problem'];
    const maxIndex = probabilities.indexOf(Math.max(...probabilities));
    const faultType = faultTypes[maxIndex];
    const faultProbability = probabilities[maxIndex];

    // Generate fault-specific recommendations
    const recommendations = generateFaultRecommendations(faultType, faultProbability, electricalParameters, deviceCharacteristics);

    res.json({
      success: true,
      prediction: {
        faultType: faultType,
        faultProbability: faultProbability,
        confidence: faultProbability,
        riskLevel: faultProbability > 0.7 ? 'High' : faultProbability > 0.4 ? 'Medium' : 'Low',
        modelType: "classification",
        recommendations: recommendations,
        preventiveActions: getPreventiveActions(faultType, faultProbability)
      }
    });

  } catch (error) {
    console.error("Fault prediction error:", error.message);
    res.status(500).json({
      success: false,
      message: "Error predicting device faults",
      error: error.message
    });
  }
};

// @desc    Generate cost-saving and efficiency recommendations
// @route   POST /api/ai/predict-recommendation
// @access  Private
const predictRecommendations = async (req, res) => {
  try {
    const { 
      powerConsumption, 
      electricalParameters, 
      environmentalData, 
      deviceCharacteristics, 
      faultSimulationData, 
      timestamps 
    } = req.body;

    // Validate required data
    if (!powerConsumption || !electricalParameters) {
      return res.status(400).json({
        success: false,
        message: "Missing required data: powerConsumption and electricalParameters are required"
      });
    }

    // Analyze current energy patterns
    const energyAnalysis = analyzeEnergyPatterns(powerConsumption, electricalParameters, environmentalData);
    
    // Generate recommendations using rule-based system
    const recommendations = generateEfficiencyRecommendations(energyAnalysis, deviceCharacteristics, environmentalData);
    
    // Calculate potential savings
    const savings = calculatePotentialSavings(recommendations, powerConsumption, electricalParameters);

    res.json({
      success: true,
      prediction: {
        recommendations: recommendations,
        potentialSavings: savings,
        efficiencyScore: calculateEfficiencyScore(energyAnalysis),
        priority: rankRecommendations(recommendations),
        implementationTime: estimateImplementationTime(recommendations),
        roi: calculateROI(recommendations, savings)
      }
    });

  } catch (error) {
    console.error("Recommendation prediction error:", error.message);
    res.status(500).json({
      success: false,
      message: "Error generating recommendations",
      error: error.message
    });
  }
};

// Helper functions for energy prediction
const prepareEnergyTrainingData = (powerConsumption, electricalParameters, environmentalData, timestamps) => {
  const data = [];
  const minLength = Math.min(
    powerConsumption.length,
    electricalParameters.voltage?.length || 0,
    electricalParameters.current?.length || 0,
    timestamps.length
  );

  for (let i = 0; i < minLength; i++) {
    data.push({
      power: powerConsumption[i] || 0,
      voltage: electricalParameters.voltage?.[i] || 220,
      current: electricalParameters.current?.[i] || 0,
      temperature: environmentalData?.temperature?.[i] || 25,
      humidity: environmentalData?.humidity?.[i] || 50,
      timestamp: new Date(timestamps[i]).getTime() / 1000 // Convert to seconds
    });
  }
  return data;
};

const createLinearRegressionModel = () => {
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [6], units: 10, activation: 'relu' }),
      tf.layers.dense({ units: 5, activation: 'relu' }),
      tf.layers.dense({ units: 1, activation: 'linear' })
    ]
  });

  model.compile({
    optimizer: 'adam',
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  return model;
};

const trainEnergyModel = async (model, trainingData) => {
  if (trainingData.length < 10) {
    // Use mock training if insufficient data
    const mockData = generateMockEnergyData();
    const xs = tf.tensor2d(mockData.map(d => [d.power, d.voltage, d.current, d.temperature, d.humidity, d.timestamp]));
    const ys = tf.tensor2d(mockData.map(d => [d.power * (1 + Math.random() * 0.1)]));
    
    await model.fit(xs, ys, { epochs: 10, verbose: 0 });
    
    xs.dispose();
    ys.dispose();
  } else {
    const xs = tf.tensor2d(trainingData.map(d => [d.power, d.voltage, d.current, d.temperature, d.humidity, d.timestamp]));
    const ys = tf.tensor2d(trainingData.map(d => [d.power]));
    
    await model.fit(xs, ys, { epochs: 20, verbose: 0 });
    
    xs.dispose();
    ys.dispose();
  }
};

// Helper functions for fault prediction
const prepareFaultFeatures = (electricalParameters, environmentalData, deviceCharacteristics, faultSimulationData) => {
  const avgVoltage = electricalParameters.voltage ? 
    electricalParameters.voltage.reduce((a, b) => a + b, 0) / electricalParameters.voltage.length : 220;
  const avgCurrent = electricalParameters.current ? 
    electricalParameters.current.reduce((a, b) => a + b, 0) / electricalParameters.current.length : 0;
  const avgTemperature = environmentalData?.temperature ? 
    environmentalData.temperature.reduce((a, b) => a + b, 0) / environmentalData.temperature.length : 25;
  const avgHumidity = environmentalData?.humidity ? 
    environmentalData.humidity.reduce((a, b) => a + b, 0) / environmentalData.humidity.length : 50;
  
  return [
    avgVoltage / 220, // Normalized voltage
    avgCurrent / 10,  // Normalized current
    avgTemperature / 50, // Normalized temperature
    avgHumidity / 100, // Normalized humidity
    deviceCharacteristics.age || 0,
    deviceCharacteristics.usageHours || 0,
    faultSimulationData?.faultCount || 0
  ];
};

const createFaultClassificationModel = () => {
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [7], units: 14, activation: 'relu' }),
      tf.layers.dense({ units: 7, activation: 'relu' }),
      tf.layers.dense({ units: 5, activation: 'softmax' })
    ]
  });

  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  return model;
};

const trainFaultModel = async (model, features) => {
  // Generate mock training data for fault classification
  const mockFeatures = [];
  const mockLabels = [];
  
  for (let i = 0; i < 100; i++) {
    const mockFeature = [
      Math.random() * 1.2, // voltage variation
      Math.random() * 2,   // current variation
      Math.random() * 1.5, // temperature variation
      Math.random(),       // humidity
      Math.random() * 20,  // age
      Math.random() * 1000, // usage hours
      Math.random() * 5    // fault count
    ];
    
    // Create labels based on feature patterns
    let label = [1, 0, 0, 0, 0]; // No fault by default
    
    if (mockFeature[0] > 1.1 || mockFeature[0] < 0.9) label = [0, 1, 0, 0, 0]; // Voltage anomaly
    else if (mockFeature[1] > 1.5) label = [0, 0, 1, 0, 0]; // Current overload
    else if (mockFeature[2] > 1.2) label = [0, 0, 0, 1, 0]; // Temperature issue
    else if (mockFeature[6] > 2) label = [0, 0, 0, 0, 1]; // Connection problem
    
    mockFeatures.push(mockFeature);
    mockLabels.push(label);
  }
  
  const xs = tf.tensor2d(mockFeatures);
  const ys = tf.tensor2d(mockLabels);
  
  await model.fit(xs, ys, { epochs: 50, verbose: 0 });
  
  xs.dispose();
  ys.dispose();
};

// Helper functions for recommendations
const analyzeEnergyPatterns = (powerConsumption, electricalParameters, environmentalData) => {
  const avgPower = powerConsumption.reduce((a, b) => a + b, 0) / powerConsumption.length;
  const maxPower = Math.max(...powerConsumption);
  const minPower = Math.min(...powerConsumption);
  const powerVariation = (maxPower - minPower) / avgPower;
  
  const avgVoltage = electricalParameters.voltage ? 
    electricalParameters.voltage.reduce((a, b) => a + b, 0) / electricalParameters.voltage.length : 220;
  const voltageStability = electricalParameters.voltage ? 
    calculateStability(electricalParameters.voltage) : 1;
  
  const avgTemperature = environmentalData?.temperature ? 
    environmentalData.temperature.reduce((a, b) => a + b, 0) / environmentalData.temperature.length : 25;
  
  return {
    avgPower,
    maxPower,
    minPower,
    powerVariation,
    avgVoltage,
    voltageStability,
    avgTemperature,
    efficiency: calculateEfficiency(avgPower, avgVoltage, electricalParameters.current)
  };
};

const generateEfficiencyRecommendations = (analysis, deviceCharacteristics, environmentalData) => {
  const recommendations = [];
  
  // Power optimization recommendations
  if (analysis.powerVariation > 0.3) {
    recommendations.push({
      type: 'power_optimization',
      title: 'Optimize Power Usage Patterns',
      description: 'High power variation detected. Consider load balancing and scheduling.',
      impact: 'medium',
      estimatedSavings: analysis.avgPower * 0.1
    });
  }
  
  // Voltage optimization
  if (analysis.voltageStability < 0.9) {
    recommendations.push({
      type: 'voltage_stabilization',
      title: 'Improve Voltage Stability',
      description: 'Voltage fluctuations detected. Consider voltage regulators or power conditioning.',
      impact: 'high',
      estimatedSavings: analysis.avgPower * 0.15
    });
  }
  
  // Temperature-based recommendations
  if (analysis.avgTemperature > 30) {
    recommendations.push({
      type: 'thermal_management',
      title: 'Improve Thermal Management',
      description: 'High operating temperature detected. Ensure proper ventilation and cooling.',
      impact: 'high',
      estimatedSavings: analysis.avgPower * 0.05
    });
  }
  
  // Device-specific recommendations
  if (deviceCharacteristics.age > 5) {
    recommendations.push({
      type: 'maintenance',
      title: 'Schedule Preventive Maintenance',
      description: 'Device age suggests maintenance may improve efficiency.',
      impact: 'medium',
      estimatedSavings: analysis.avgPower * 0.08
    });
  }
  
  return recommendations;
};

// Utility functions
const calculatePredictionConfidence = (trainingData) => {
  if (trainingData.length < 10) return 0.6;
  if (trainingData.length < 50) return 0.8;
  return 0.9;
};

const generateMockEnergyData = () => {
  const data = [];
  for (let i = 0; i < 50; i++) {
    data.push({
      power: 100 + Math.random() * 200,
      voltage: 220 + (Math.random() - 0.5) * 20,
      current: 0.5 + Math.random() * 2,
      temperature: 20 + Math.random() * 15,
      humidity: 30 + Math.random() * 40,
      timestamp: Date.now() / 1000 - (50 - i) * 3600
    });
  }
  return data;
};

const generateEnergyRecommendations = (predictedUsage, electricalParameters, environmentalData) => {
  const recommendations = [];
  
  if (predictedUsage > 200) {
    recommendations.push("Consider load scheduling to reduce peak demand");
  }
  
  if (electricalParameters.voltage && electricalParameters.voltage.some(v => v < 210 || v > 230)) {
    recommendations.push("Voltage regulation needed for optimal efficiency");
  }
  
  if (environmentalData?.temperature && environmentalData.temperature.some(t => t > 35)) {
    recommendations.push("Improve cooling to maintain optimal operating conditions");
  }
  
  return recommendations;
};

const generateFaultRecommendations = (faultType, probability, electricalParameters, deviceCharacteristics) => {
  const recommendations = [];
  
  switch (faultType) {
    case 'Voltage Anomaly':
      recommendations.push("Check voltage regulator and power supply connections");
      recommendations.push("Monitor voltage levels more frequently");
      break;
    case 'Current Overload':
      recommendations.push("Reduce connected load or upgrade capacity");
      recommendations.push("Check for short circuits or ground faults");
      break;
    case 'Temperature Issue':
      recommendations.push("Improve ventilation and cooling systems");
      recommendations.push("Check for blocked air vents or fans");
      break;
    case 'Connection Problem':
      recommendations.push("Inspect all electrical connections");
      recommendations.push("Tighten loose connections and replace damaged cables");
      break;
    default:
      recommendations.push("Continue regular monitoring");
      recommendations.push("Schedule routine maintenance");
  }
  
  return recommendations;
};

const getPreventiveActions = (faultType, probability) => {
  const actions = [];
  
  if (probability > 0.7) {
    actions.push("Immediate inspection required");
    actions.push("Consider temporary shutdown if safety risk");
  } else if (probability > 0.4) {
    actions.push("Schedule inspection within 24 hours");
    actions.push("Increase monitoring frequency");
  } else {
    actions.push("Continue normal operation");
    actions.push("Schedule routine maintenance");
  }
  
  return actions;
};

const calculateStability = (values) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return 1 - (stdDev / mean);
};

const calculateEfficiency = (power, voltage, current) => {
  if (!current || current.length === 0) return 0.85; // Default efficiency
  const avgCurrent = current.reduce((a, b) => a + b, 0) / current.length;
  const apparentPower = voltage * avgCurrent;
  return power / apparentPower;
};

const calculatePotentialSavings = (recommendations, powerConsumption, electricalParameters) => {
  const totalSavings = recommendations.reduce((sum, rec) => sum + (rec.estimatedSavings || 0), 0);
  const avgPower = powerConsumption.reduce((a, b) => a + b, 0) / powerConsumption.length;
  
  return {
    monthlySavings: totalSavings * 30,
    annualSavings: totalSavings * 365,
    percentageReduction: (totalSavings / avgPower) * 100
  };
};

const calculateEfficiencyScore = (analysis) => {
  let score = 100;
  
  if (analysis.powerVariation > 0.3) score -= 20;
  if (analysis.voltageStability < 0.9) score -= 25;
  if (analysis.avgTemperature > 30) score -= 15;
  if (analysis.efficiency < 0.8) score -= 20;
  
  return Math.max(0, score);
};

const rankRecommendations = (recommendations) => {
  return recommendations.sort((a, b) => {
    const impactWeight = { high: 3, medium: 2, low: 1 };
    return (impactWeight[b.impact] || 1) - (impactWeight[a.impact] || 1);
  });
};

const estimateImplementationTime = (recommendations) => {
  const timeMap = {
    power_optimization: '2-4 weeks',
    voltage_stabilization: '1-2 weeks',
    thermal_management: '1-3 days',
    maintenance: '1-2 days'
  };
  
  return recommendations.map(rec => ({
    ...rec,
    implementationTime: timeMap[rec.type] || '1-2 weeks'
  }));
};

const calculateROI = (recommendations, savings) => {
  const totalCost = recommendations.reduce((sum, rec) => {
    const costMap = {
      power_optimization: 500,
      voltage_stabilization: 1000,
      thermal_management: 200,
      maintenance: 100
    };
    return sum + (costMap[rec.type] || 300);
  }, 0);
  
  const annualSavings = savings.annualSavings;
  const roi = totalCost > 0 ? (annualSavings / totalCost) * 100 : 0;
  
  return {
    totalCost,
    annualSavings,
    roi: roi.toFixed(2) + '%',
    paybackPeriod: totalCost > 0 ? (totalCost / (annualSavings / 12)).toFixed(1) + ' months' : 'N/A'
  };
};

module.exports = {
  getAIPrediction,
  getPredictionHistory,
  predictEnergyUsage,
  predictDeviceFault,
  predictRecommendations
};
