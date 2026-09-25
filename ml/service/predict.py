"""
EcoWatch AI – Sensor ML Prediction Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lightweight prediction service that EcoWatch Node.js backend calls via
child_process (stdin/stdout JSON protocol) or HTTP (with Flask, optional).

Protocol: JSON in → JSON out (one line per request)

Usage from Node.js:
  const { spawn } = require('child_process');
  const proc = spawn('python', ['ml/service/predict.py']);
  proc.stdin.write(JSON.stringify({ model: 'gas_co2', features: {...} }) + '\n');
  proc.stdout.on('data', (data) => { const result = JSON.parse(data); });

Alternatively, import the PredictionService class in Python directly.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import sys
import os
import json
import numpy as np
import joblib

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

# ─── Model Registry ───────────────────────────────────────────────────────────

MODEL_REGISTRY = {
    "gas_co2": {
        "model_file":     "gas_co2_model.pkl",
        "iso_file":       "gas_co2_isolation.pkl",
        "features":       ["co2_ppm", "co_ppm", "nh3_ppm", "voc_ppm",
                           "temperature_c", "humidity_pct", "sensor_drift"],
        "label_map":      {0: "NORMAL", 1: "ANOMALY", 2: "CRITICAL"},
        "risk_map":       {0: "LOW", 1: "HIGH", 2: "CRITICAL"},
        "description":    "MQ-135 Gas / CO2 Leak Detector",
    },
    "energy": {
        "model_file":     "energy_model.pkl",
        "iso_file":       "energy_isolation.pkl",
        "features":       ["current_amps", "voltage_v", "power_kw", "power_factor",
                           "thd_pct", "consumption_kwh", "frequency_hz", "load_variance"],
        "label_map":      {0: "NORMAL", 1: "FAULT", 2: "CRITICAL"},
        "risk_map":       {0: "LOW", 1: "HIGH", 2: "CRITICAL"},
        "description":    "SCT-013 Electricity / Energy Fault Detector",
    },
    "temperature": {
        "model_file":     "temperature_model.pkl",
        "iso_file":       "temperature_isolation.pkl",
        "features":       ["temperature_c", "humidity_pct", "heat_index_c",
                           "temp_rate_change", "ambient_temp_c", "delta_temp_c",
                           "cycles_since_maint"],
        "label_map":      {0: "NORMAL", 1: "HIGH_RISK", 2: "CRITICAL"},
        "risk_map":       {0: "LOW", 1: "HIGH", 2: "CRITICAL"},
        "description":    "DHT22 Thermal Risk Classifier",
    },
    "water_leakage": {
        "model_file":     "water_leakage_model.pkl",
        "iso_file":       "water_isolation.pkl",
        "features":       ["moisture_raw", "moisture_pct", "humidity_pct", "pressure_bar",
                           "flow_rate_lpm", "pressure_drop_bar", "vibration_hz", "sound_db"],
        "label_map":      {0: "NORMAL", 1: "LEAK_DETECTED", 2: "BURST_RISK"},
        "risk_map":       {0: "LOW", 1: "HIGH", 2: "CRITICAL"},
        "description":    "Moisture Sensor Water/Fluid Leak Detector",
    },
    "multisensor": {
        "model_file":     "multisensor_model.pkl",
        "iso_file":       None,
        "label_encoder":  "multisensor_label_encoder.pkl",
        "features":       ["co2_ppm", "current_amps", "temperature_c", "humidity_pct",
                           "moisture_raw", "gas_ppm", "sound_db", "power_kw",
                           "vibration_rms", "uptime_hrs"],
        "label_map":      None,  # uses LabelEncoder
        "risk_map":       None,
        "description":    "Multi-Sensor Combined Risk Level Classifier",
    },
}

# ─── Model Loader (lazy, cached) ─────────────────────────────────────────────

_model_cache = {}

def _load(model_name):
    if model_name in _model_cache:
        return _model_cache[model_name]

    config = MODEL_REGISTRY.get(model_name)
    if not config:
        raise ValueError(f"Unknown model: {model_name}. Available: {list(MODEL_REGISTRY.keys())}")

    model_path = os.path.join(MODEL_DIR, config["model_file"])
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model file not found: {model_path}. "
            f"Run: python ml/training/train_models.py"
        )

    entry = {"config": config, "model": joblib.load(model_path)}

    if config.get("iso_file"):
        iso_path = os.path.join(MODEL_DIR, config["iso_file"])
        if os.path.exists(iso_path):
            entry["iso"] = joblib.load(iso_path)

    if config.get("label_encoder"):
        le_path = os.path.join(MODEL_DIR, config["label_encoder"])
        if os.path.exists(le_path):
            entry["label_encoder"] = joblib.load(le_path)

    _model_cache[model_name] = entry
    return entry


# ─── Core Prediction Function ─────────────────────────────────────────────────

def predict(model_name: str, feature_values: dict) -> dict:
    """
    Run inference for a single reading.

    Args:
        model_name: one of 'gas_co2', 'energy', 'temperature', 'water_leakage', 'multisensor'
        feature_values: dict with feature names → float values

    Returns:
        {
          "model": str,
          "prediction_label": str,
          "risk_level": str,          # LOW | MEDIUM | HIGH | CRITICAL
          "confidence": float,        # 0.0 – 1.0
          "anomaly_score": float,     # IsolationForest score (lower = more anomalous)
          "probabilities": dict,      # class probabilities
          "is_anomalous": bool,
          "description": str,
          "missing_features": list,   # features that used defaults
        }
    """
    entry = _load(model_name)
    config = entry["config"]
    model  = entry["model"]

    # Build feature vector (handle missing with defaults)
    missing = []
    feat_vec = []
    for f in config["features"]:
        if f in feature_values and feature_values[f] is not None:
            feat_vec.append(float(feature_values[f]))
        else:
            missing.append(f)
            feat_vec.append(0.0)  # safe default

    X = np.array(feat_vec).reshape(1, -1)

    # Supervised prediction
    pred_class = int(model.predict(X)[0])
    proba = model.predict_proba(X)[0]
    confidence = float(np.max(proba))

    # Determine label and risk
    if model_name == "multisensor":
        le = entry.get("label_encoder")
        prediction_label = str(le.inverse_transform([pred_class])[0]) if le else str(pred_class)
        risk_level = prediction_label  # label IS the risk level for multisensor
        proba_dict = {str(le.inverse_transform([i])[0]): round(float(p), 4)
                      for i, p in enumerate(proba)} if le else {}
    else:
        prediction_label = config["label_map"].get(pred_class, str(pred_class))
        risk_level = config["risk_map"].get(pred_class, "MEDIUM")
        proba_dict = {
            config["label_map"].get(i, str(i)): round(float(p), 4)
            for i, p in enumerate(proba)
        }

    # IsolationForest anomaly score
    anomaly_score = None
    is_anomalous = pred_class != 0
    if "iso" in entry:
        raw_score = float(entry["iso"].score_samples(X)[0])
        anomaly_score = round(raw_score, 4)

    return {
        "model": model_name,
        "prediction_label": prediction_label,
        "risk_level": risk_level,
        "confidence": round(confidence, 4),
        "anomaly_score": anomaly_score,
        "probabilities": proba_dict,
        "is_anomalous": is_anomalous,
        "description": config["description"],
        "missing_features": missing,
    }


def predict_all(feature_values: dict) -> dict:
    """
    Run all applicable models and return combined assessment.
    The multisensor model is always used; individual models are used where data allows.
    """
    results = {}

    # Run each individual model if relevant features present
    individual_models = {
        "gas_co2":      ["co2_ppm", "co_ppm"],
        "energy":       ["current_amps", "voltage_v"],
        "temperature":  ["temperature_c", "humidity_pct"],
        "water_leakage":["moisture_raw", "moisture_pct"],
    }

    for model_name, required_keys in individual_models.items():
        if any(k in feature_values for k in required_keys):
            try:
                results[model_name] = predict(model_name, feature_values)
            except Exception as e:
                results[model_name] = {"error": str(e)}

    # Always run multisensor
    try:
        results["multisensor"] = predict("multisensor", feature_values)
    except Exception as e:
        results["multisensor"] = {"error": str(e)}

    # Aggregate: highest risk wins
    risk_order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
    overall_risk = "LOW"
    highest_confidence = 0.0
    anomalous_models = []

    for model_name, result in results.items():
        if "error" in result:
            continue
        r = result.get("risk_level", "LOW")
        if risk_order.get(r, 0) > risk_order.get(overall_risk, 0):
            overall_risk = r
            highest_confidence = result.get("confidence", 0.5)
        if result.get("is_anomalous"):
            anomalous_models.append(model_name)

    return {
        "overall_risk_level": overall_risk,
        "overall_confidence": round(highest_confidence, 4),
        "anomalous_sensors": anomalous_models,
        "individual_results": results,
    }


# ─── STDIN/STDOUT JSON service loop ─────────────────────────────────────────-

def run_service():
    """
    Reads JSON requests from stdin line by line, writes JSON responses to stdout.
    Called by EcoWatch Node.js backend via child_process.spawn.
    """
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            model_name = req.get("model", "multisensor")
            features   = req.get("features", {})

            if model_name == "all":
                result = predict_all(features)
            else:
                result = predict(model_name, features)

            print(json.dumps({"ok": True, "result": result}), flush=True)
        except Exception as e:
            print(json.dumps({"ok": False, "error": str(e)}), flush=True)


# ─── CLI quick-test ──────────────────────────────────────────────────────────

def cli_test():
    print("\n── Quick Prediction Tests ──\n")

    # Test 1: Normal gas reading
    r = predict("gas_co2", {
        "co2_ppm": 285, "co_ppm": 12, "nh3_ppm": 6,
        "voc_ppm": 10, "temperature_c": 24, "humidity_pct": 48, "sensor_drift": 0.01,
    })
    print(f"Gas (normal):   risk={r['risk_level']} confidence={r['confidence']} anomalous={r['is_anomalous']}")

    # Test 2: Gas leak
    r = predict("gas_co2", {
        "co2_ppm": 620, "co_ppm": 75, "nh3_ppm": 42,
        "voc_ppm": 55, "temperature_c": 32, "humidity_pct": 68, "sensor_drift": 0.08,
    })
    print(f"Gas (leak):     risk={r['risk_level']} confidence={r['confidence']} anomalous={r['is_anomalous']}")

    # Test 3: Water leak
    r = predict("water_leakage", {
        "moisture_raw": 620, "moisture_pct": 68, "humidity_pct": 78,
        "pressure_bar": 2.7, "flow_rate_lpm": 42, "pressure_drop_bar": 0.4,
        "vibration_hz": 72, "sound_db": 62,
    })
    print(f"Water (leak):   risk={r['risk_level']} confidence={r['confidence']} anomalous={r['is_anomalous']}")

    # Test 4: High energy fault
    r = predict("energy", {
        "current_amps": 32, "voltage_v": 203, "power_kw": 8.5,
        "power_factor": 0.68, "thd_pct": 18, "consumption_kwh": 11.2,
        "frequency_hz": 49.6, "load_variance": 0.3,
    })
    print(f"Energy (fault): risk={r['risk_level']} confidence={r['confidence']} anomalous={r['is_anomalous']}")

    # Test 5: Multi-sensor combined
    r = predict("multisensor", {
        "co2_ppm": 480, "current_amps": 30, "temperature_c": 75,
        "humidity_pct": 72, "moisture_raw": 550, "gas_ppm": 180,
        "sound_db": 62, "power_kw": 7.5, "vibration_rms": 1.8, "uptime_hrs": 480,
    })
    print(f"Multi-sensor:   risk={r['risk_level']} confidence={r['confidence']} anomalous={r['is_anomalous']}")
    print()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        cli_test()
    elif len(sys.argv) > 1 and sys.argv[1] == "service":
        run_service()
    else:
        cli_test()
