"""
EcoWatch AI – Model Trainer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trains 5 scikit-learn models for EcoWatch sensor anomaly detection:

  Model 1: gas_co2_model.pkl        — MQ-135 gas / CO2 leak detector
  Model 2: energy_model.pkl         — SCT-013 electricity fault detector
  Model 3: temperature_model.pkl    — DHT22 thermal risk classifier
  Model 4: water_leakage_model.pkl  — Moisture sensor water leak detector
  Model 5: multisensor_model.pkl    — All-sensor risk level classifier

Algorithm choices:
  • Models 1–4: RandomForestClassifier (robust to sensor noise, interpretable)
  • Model 5:    GradientBoostingClassifier (best for multi-class risk fusion)
  • Anomaly path also trains IsolationForest for unsupervised backup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    IsolationForest,
)
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    f1_score,
)

warnings.filterwarnings("ignore")
np.random.seed(42)

DATA_DIR   = os.path.join(os.path.dirname(__file__), "..", "data")
MODEL_DIR  = os.path.join(os.path.dirname(__file__), "..", "models")
REPORT_DIR = os.path.join(os.path.dirname(__file__), "..", "reports")
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

all_reports = {}


def banner(title):
    print(f"\n{'='*62}")
    print(f"  {title}")
    print(f"{'='*62}")


def save_model_metadata(name, feature_cols, label_col, classes, scaler_name=None):
    """Save JSON metadata alongside the model for the prediction service."""
    meta = {
        "model_name": name,
        "feature_columns": feature_cols,
        "label_column": label_col,
        "classes": classes,
        "scaler": scaler_name,
        "version": "1.0.0",
        "framework": "scikit-learn",
        "trained_at": pd.Timestamp.now().isoformat(),
    }
    path = os.path.join(MODEL_DIR, f"{name}.meta.json")
    with open(path, "w") as f:
        json.dump(meta, f, indent=2)
    return meta


def evaluate_and_report(model_name, y_test, y_pred, class_names, label_enc=None):
    """Print metrics and store in all_reports dict."""
    if label_enc:
        y_test_names = label_enc.inverse_transform(y_test)
        y_pred_names = label_enc.inverse_transform(y_pred)
    else:
        y_test_names = y_test
        y_pred_names = y_pred

    acc = accuracy_score(y_test_names, y_pred_names)
    f1  = f1_score(y_test_names, y_pred_names, average="weighted")

    print(f"\n  Accuracy : {acc:.4f} ({acc*100:.1f}%)")
    print(f"  F1 Score : {f1:.4f}")
    print(f"\n  Classification Report:\n")
    print(classification_report(y_test_names, y_pred_names))

    all_reports[model_name] = {
        "accuracy": round(acc, 4),
        "f1_weighted": round(f1, 4),
        "test_samples": int(len(y_test)),
    }
    return acc, f1


# ─── Model 1: Gas / CO2 Leak Detector ────────────────────────────────────────

def train_gas_model():
    banner("Model 1 — Gas/CO2 Leak Detector (MQ-135)")

    df = pd.read_csv(os.path.join(DATA_DIR, "gas_co2_sensor_dataset.csv"))
    feature_cols = ["co2_ppm", "co_ppm", "nh3_ppm", "voc_ppm",
                    "temperature_c", "humidity_pct", "sensor_drift"]
    X = df[feature_cols].values
    y = df["label"].values   # 0=normal, 1=anomaly, 2=critical

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # RandomForest pipeline
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=150,
            max_depth=12,
            min_samples_leaf=3,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    print(f"  Training samples : {len(X_train)}")
    print(f"  Test samples     : {len(X_test)}")

    acc, f1 = evaluate_and_report("gas_co2_model", y_test, y_pred,
                                   ["normal", "anomaly", "critical"])

    # Also train IsolationForest for unsupervised anomaly backup
    iso = IsolationForest(n_estimators=100, contamination=0.2, random_state=42)
    iso.fit(X_train)

    # Feature importances
    importances = pipeline.named_steps["clf"].feature_importances_
    feat_imp = dict(zip(feature_cols, [round(float(v), 4) for v in importances]))
    print(f"\n  Feature importances: {feat_imp}")

    # Save
    model_path = os.path.join(MODEL_DIR, "gas_co2_model.pkl")
    iso_path   = os.path.join(MODEL_DIR, "gas_co2_isolation.pkl")
    joblib.dump(pipeline, model_path, compress=3)
    joblib.dump(iso, iso_path, compress=3)

    # Cross-validation score
    cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="accuracy")
    print(f"\n  5-Fold CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    all_reports["gas_co2_model"]["cv_accuracy"] = round(cv_scores.mean(), 4)
    all_reports["gas_co2_model"]["feature_importances"] = feat_imp

    save_model_metadata("gas_co2_model", feature_cols, "label",
                         ["0:normal", "1:anomaly", "2:critical"], "StandardScaler")
    print(f"\n  ✓ Saved → {model_path}")
    print(f"  ✓ Saved → {iso_path}")
    return acc


# ─── Model 2: Energy / Electricity Fault Detector ────────────────────────────

def train_energy_model():
    banner("Model 2 — Electricity Fault Detector (SCT-013 Current Sensor)")

    df = pd.read_csv(os.path.join(DATA_DIR, "energy_electricity_dataset.csv"))
    feature_cols = ["current_amps", "voltage_v", "power_kw", "power_factor",
                    "thd_pct", "consumption_kwh", "frequency_hz", "load_variance"]
    X = df[feature_cols].values
    y = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    print(f"  Training samples : {len(X_train)}")
    print(f"  Test samples     : {len(X_test)}")

    acc, f1 = evaluate_and_report("energy_model", y_test, y_pred,
                                   ["normal", "fault", "critical"])

    importances = pipeline.named_steps["clf"].feature_importances_
    feat_imp = dict(zip(feature_cols, [round(float(v), 4) for v in importances]))
    print(f"\n  Feature importances: {feat_imp}")

    iso = IsolationForest(n_estimators=100, contamination=0.2, random_state=42)
    iso.fit(X_train)

    model_path = os.path.join(MODEL_DIR, "energy_model.pkl")
    iso_path   = os.path.join(MODEL_DIR, "energy_isolation.pkl")
    joblib.dump(pipeline, model_path, compress=3)
    joblib.dump(iso, iso_path, compress=3)

    cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="accuracy")
    print(f"\n  5-Fold CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    all_reports["energy_model"]["cv_accuracy"] = round(cv_scores.mean(), 4)
    all_reports["energy_model"]["feature_importances"] = feat_imp

    save_model_metadata("energy_model", feature_cols, "label",
                         ["0:normal", "1:fault", "2:critical"], "StandardScaler")
    print(f"\n  ✓ Saved → {model_path}")
    return acc


# ─── Model 3: Temperature / Thermal Risk Classifier ──────────────────────────

def train_temperature_model():
    banner("Model 3 — Thermal Risk Classifier (DHT22 Temp/Humidity)")

    df = pd.read_csv(os.path.join(DATA_DIR, "temperature_thermal_dataset.csv"))
    feature_cols = ["temperature_c", "humidity_pct", "heat_index_c",
                    "temp_rate_change", "ambient_temp_c", "delta_temp_c",
                    "cycles_since_maint"]
    X = df[feature_cols].values
    y = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=150,
            max_depth=10,
            min_samples_leaf=3,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    print(f"  Training samples : {len(X_train)}")
    print(f"  Test samples     : {len(X_test)}")

    acc, f1 = evaluate_and_report("temperature_model", y_test, y_pred,
                                   ["normal", "high", "critical"])

    importances = pipeline.named_steps["clf"].feature_importances_
    feat_imp = dict(zip(feature_cols, [round(float(v), 4) for v in importances]))
    print(f"\n  Feature importances: {feat_imp}")

    iso = IsolationForest(n_estimators=100, contamination=0.2, random_state=42)
    iso.fit(X_train)

    model_path = os.path.join(MODEL_DIR, "temperature_model.pkl")
    iso_path   = os.path.join(MODEL_DIR, "temperature_isolation.pkl")
    joblib.dump(pipeline, model_path, compress=3)
    joblib.dump(iso, iso_path, compress=3)

    cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="accuracy")
    print(f"\n  5-Fold CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    all_reports["temperature_model"]["cv_accuracy"] = round(cv_scores.mean(), 4)
    all_reports["temperature_model"]["feature_importances"] = feat_imp

    save_model_metadata("temperature_model", feature_cols, "label",
                         ["0:normal", "1:high", "2:critical"], "StandardScaler")
    print(f"\n  ✓ Saved → {model_path}")
    return acc


# ─── Model 4: Water Leakage Detector ─────────────────────────────────────────

def train_water_leakage_model():
    banner("Model 4 — Water/Moisture Leak Detector (Moisture + DHT22)")

    df = pd.read_csv(os.path.join(DATA_DIR, "water_leakage_dataset.csv"))
    feature_cols = ["moisture_raw", "moisture_pct", "humidity_pct", "pressure_bar",
                    "flow_rate_lpm", "pressure_drop_bar", "vibration_hz", "sound_db"]
    X = df[feature_cols].values
    y = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    print(f"  Training samples : {len(X_train)}")
    print(f"  Test samples     : {len(X_test)}")

    acc, f1 = evaluate_and_report("water_leakage_model", y_test, y_pred,
                                   ["normal", "leak", "burst"])

    importances = pipeline.named_steps["clf"].feature_importances_
    feat_imp = dict(zip(feature_cols, [round(float(v), 4) for v in importances]))
    print(f"\n  Feature importances: {feat_imp}")

    iso = IsolationForest(n_estimators=100, contamination=0.2, random_state=42)
    iso.fit(X_train)

    model_path = os.path.join(MODEL_DIR, "water_leakage_model.pkl")
    iso_path   = os.path.join(MODEL_DIR, "water_isolation.pkl")
    joblib.dump(pipeline, model_path, compress=3)
    joblib.dump(iso, iso_path, compress=3)

    cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="accuracy")
    print(f"\n  5-Fold CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    all_reports["water_leakage_model"]["cv_accuracy"] = round(cv_scores.mean(), 4)
    all_reports["water_leakage_model"]["feature_importances"] = feat_imp

    save_model_metadata("water_leakage_model", feature_cols, "label",
                         ["0:normal", "1:leak", "2:burst"], "StandardScaler")
    print(f"\n  ✓ Saved → {model_path}")
    return acc


# ─── Model 5: Multi-Sensor Risk Classifier ───────────────────────────────────

def train_multisensor_model():
    banner("Model 5 — Multi-Sensor Risk Level Classifier (ALL Sensors)")

    df = pd.read_csv(os.path.join(DATA_DIR, "multisensor_risk_dataset.csv"))
    feature_cols = ["co2_ppm", "current_amps", "temperature_c", "humidity_pct",
                    "moisture_raw", "gas_ppm", "sound_db", "power_kw",
                    "vibration_rms", "uptime_hrs"]
    X = df[feature_cols].values

    le = LabelEncoder()
    y_enc = le.fit_transform(df["label"].values)   # LOW=0, MEDIUM=1, HIGH=2, CRITICAL=3
    print(f"  Classes: {list(le.classes_)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    # GradientBoosting for best multi-class accuracy
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", GradientBoostingClassifier(
            n_estimators=200,
            learning_rate=0.08,
            max_depth=5,
            min_samples_leaf=3,
            subsample=0.85,
            random_state=42,
        )),
    ])
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    print(f"  Training samples : {len(X_train)}")
    print(f"  Test samples     : {len(X_test)}")

    acc, f1 = evaluate_and_report("multisensor_model", y_test, y_pred,
                                   list(le.classes_), label_enc=le)

    importances = pipeline.named_steps["clf"].feature_importances_
    feat_imp = dict(zip(feature_cols, [round(float(v), 4) for v in importances]))
    print(f"\n  Feature importances: {feat_imp}")

    # Also save label encoder for the service
    le_path = os.path.join(MODEL_DIR, "multisensor_label_encoder.pkl")
    joblib.dump(le, le_path, compress=3)

    model_path = os.path.join(MODEL_DIR, "multisensor_model.pkl")
    joblib.dump(pipeline, model_path, compress=3)

    cv_scores = cross_val_score(pipeline, X, y_enc, cv=5, scoring="accuracy")
    print(f"\n  5-Fold CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    all_reports["multisensor_model"]["cv_accuracy"] = round(cv_scores.mean(), 4)
    all_reports["multisensor_model"]["feature_importances"] = feat_imp

    save_model_metadata("multisensor_model", feature_cols, "label",
                         list(le.classes_), "StandardScaler")
    print(f"\n  ✓ Saved → {model_path}")
    print(f"  ✓ Saved → {le_path}")
    return acc


# ─── Summary Report ───────────────────────────────────────────────────────────

def save_summary_report():
    banner("Training Summary")
    print(f"\n  {'Model':<28} {'Accuracy':>10} {'F1':>10} {'CV Acc':>10}")
    print(f"  {'-'*62}")
    for name, r in all_reports.items():
        cv = r.get("cv_accuracy", "N/A")
        cv_str = f"{cv:.4f}" if isinstance(cv, float) else cv
        print(f"  {name:<28} {r['accuracy']:>10.4f} {r['f1_weighted']:>10.4f} {cv_str:>10}")
    print()

    report_path = os.path.join(REPORT_DIR, "training_report.json")
    with open(report_path, "w") as f:
        json.dump(all_reports, f, indent=2)
    print(f"  ✓ Full report saved → {report_path}")


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    banner("EcoWatch AI — Model Training Pipeline")
    print("  Training 5 sensor anomaly detection models...")

    train_gas_model()
    train_energy_model()
    train_temperature_model()
    train_water_leakage_model()
    train_multisensor_model()
    save_summary_report()

    banner("All Models Trained & Saved")
    print(f"  Models directory : {MODEL_DIR}")
    print(f"  Reports directory: {REPORT_DIR}")
    print()
