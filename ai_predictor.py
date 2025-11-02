"""
AI Predictor for Smart Energy Monitoring System
------------------------------------------------
Fetches data directly from MongoDB if no JSON input provided.
Performs:
1. Energy Forecasting (Prophet)
2. Fault Detection (Isolation Forest)
3. Energy Efficiency Recommendations (Random Forest)
"""

import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from prophet import Prophet
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from pymongo import MongoClient

# -----------------------------
# CONFIGURATION
# -----------------------------
MONGO_URI = MONGO_URI = "mongodb+srv://ayshagupta8790_db_user:Energy1234@smartelectricity.srnuily.mongodb.net/smart_energy"
DB_NAME = "smart_energy"
COLLECTION = "energyreadings"

# -----------------------------
# HELPER FUNCTIONS
# -----------------------------
def success(msg, data=None):
    return json.dumps({"success": True, "message": msg, "data": data})

def error(msg):
    return json.dumps({"success": False, "message": msg})

def fetch_from_mongo(limit=100):
    """Fetch latest energy readings"""
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    readings = list(db[COLLECTION].find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
    client.close()
    return readings

# -----------------------------
# LOAD INPUT (JSON or Mongo)
# -----------------------------
try:
    raw = sys.stdin.read().strip()
    if raw:
        payload = json.loads(raw)
        task = payload.get("task", "predict-energy")
    else:
        # fallback: use MongoDB data
        readings = fetch_from_mongo(200)
        if not readings:
            print(error("No data found in MongoDB. Please insert readings first."))
            sys.exit(0)
        payload = {
            "task": "predict-energy",
            "powerConsumption": [r.get("power", 0) for r in readings],
            "electricalParameters": {
                "voltage": [r.get("voltage", 0) for r in readings],
                "current": [r.get("current", 0) for r in readings]
            },
            "environmentalData": {
                "temperature": [r.get("temperature", 0) for r in readings],
                "humidity": [r.get("humidity", 0) for r in readings]
            }
        }
        task = payload["task"]
except Exception as e:
    print(error(f"Invalid input: {e}"))
    sys.exit(1)

# -----------------------------
# 1️⃣ ENERGY FORECAST (Prophet)
# -----------------------------
def predict_energy():
    try:
        power = np.array(payload["powerConsumption"])
        now = datetime.now()
        timestamps = [now - timedelta(minutes=10 * i) for i in range(len(power))]
        df = pd.DataFrame({"ds": timestamps[::-1], "y": power})

        model = Prophet(daily_seasonality=True)
        model.fit(df)
        future = model.make_future_dataframe(periods=6, freq="10min")
        forecast = model.predict(future)
        next_pred = round(forecast["yhat"].iloc[-1], 2)

        return success("Energy forecast generated", {"predictedUsage": next_pred})
    except Exception as e:
        return error(f"Energy prediction failed: {e}")

# -----------------------------
# 2️⃣ FAULT DETECTION (Isolation Forest)
# -----------------------------
def predict_fault():
    try:
        voltage = np.array(payload["electricalParameters"]["voltage"])
        current = np.array(payload["electricalParameters"]["current"])
        temperature = np.array(payload["environmentalData"]["temperature"])

        df = pd.DataFrame({"voltage": voltage, "current": current, "temperature": temperature})
        model = IsolationForest(contamination=0.1, random_state=42)
        df["anomaly"] = model.fit_predict(df)

        anomalies = df[df["anomaly"] == -1]
        fault_detected = len(anomalies) > 0
        return success("Fault detection complete", {
            "faultDetected": fault_detected,
            "faultType": "Abnormal readings" if fault_detected else "No fault detected",
            "anomalyCount": int(len(anomalies))
        })
    except Exception as e:
        return error(f"Fault detection failed: {e}")

# -----------------------------
# 3️⃣ RECOMMENDATIONS (Random Forest)
# -----------------------------
def predict_recommendation():
    try:
        df = pd.DataFrame({
            "power": payload["powerConsumption"],
            "voltage": payload["electricalParameters"]["voltage"],
            "current": payload["electricalParameters"]["current"],
            "temperature": payload["environmentalData"]["temperature"],
            "humidity": payload["environmentalData"]["humidity"]
        }).fillna(0)

        df["efficiency"] = df["power"] / (df["voltage"] * df["current"] + 1e-6)
        df["cost"] = df["power"] * 0.005

        X = df[["voltage", "current", "temperature", "humidity"]]
        y = df["cost"]

        model = RandomForestRegressor(n_estimators=50, random_state=42)
        model.fit(X, y)
        feature_importance = model.feature_importances_

        insights = {
            "highImpactFactors": {
                "voltage": round(feature_importance[0], 2),
                "current": round(feature_importance[1], 2),
                "temperature": round(feature_importance[2], 2),
                "humidity": round(feature_importance[3], 2)
            },
            "recommendations": [
                "Shift heavy load devices to off-peak hours.",
                "Inspect high-consumption appliances for inefficiency.",
                "Maintain ambient temperature below 28°C."
            ],
            "energyEfficiencyScore": round(10 - df["efficiency"].mean() * 5, 2),
            "estimatedCostSaving": "10–15%"
        }
        return success("Optimization recommendations generated", insights)
    except Exception as e:
        return error(f"Recommendation failed: {e}")

# -----------------------------
# -----------------------------
# EXECUTION SWITCH
# -----------------------------
if task == "predict-energy":
    print(predict_energy(), flush=True)
elif task == "predict-fault":
    print(predict_fault(), flush=True)
elif task == "predict-recommendation":
    print(predict_recommendation(), flush=True)
else:
    print(error("Invalid task type"), flush=True)

