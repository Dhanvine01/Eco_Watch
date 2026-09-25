"""
EcoWatch AI – Dataset Generator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generates realistic industrial IoT sensor datasets for 5 EcoWatch models.

Mirrors data distributions from these Kaggle dataset categories:
  • Gas/CO2:       Industrial air quality & gas sensor datasets
                   (e.g. UCI Gas Sensor Array, AirQuality datasets)
  • Energy:        Smart meter / energy consumption anomaly datasets
                   (e.g. AMPDS2, UK-DALE, Smart Home Energy datasets)
  • Temperature:   Industrial equipment temperature monitoring datasets
                   (e.g. CMAPSS turbofan engine degradation, PHM datasets)
  • Water leakage: Water distribution pipe leak detection datasets
                   (e.g. BattLeDIM, BWSN leak detection datasets)
  • Multi-sensor:  Combined industrial IoT anomaly detection datasets
                   (e.g. SKAB, MSL/SMAP NASA anomaly detection datasets)

Each dataset: 400 normal + 100 anomaly samples = 500 total per model.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ─── 1. Gas / CO2 Dataset ─────────────────────────────────────────────────────
# Mirrors: UCI Gas Sensor Array Drift Dataset, AirQuality UCI
# MQ-135 sensor on ESP32 reads gas concentration in ppm
# EcoWatch alert threshold: 400 ppm CO2, 200 ppm CO, 50 ppm NH3
def generate_gas_dataset():
    n_normal, n_anomaly = 400, 100
    rng = np.random.default_rng(42)

    # Normal operating range: CO2 200-380 ppm, CO 0-30 ppm, NH3 0-20 ppm
    normal = pd.DataFrame({
        "co2_ppm":         rng.normal(280, 40, n_normal).clip(150, 380),
        "co_ppm":          rng.normal(15, 8, n_normal).clip(0, 30),
        "nh3_ppm":         rng.normal(8, 4, n_normal).clip(0, 20),
        "voc_ppm":         rng.normal(12, 5, n_normal).clip(0, 25),
        "temperature_c":   rng.normal(22, 3, n_normal).clip(10, 35),
        "humidity_pct":    rng.normal(50, 10, n_normal).clip(20, 75),
        "sensor_drift":    rng.normal(0, 0.02, n_normal).clip(-0.1, 0.1),
        "label":           0,  # 0 = normal
        "risk_level":      "LOW",
    })

    # Anomaly: CO2 leak (400-900 ppm), CO spike, NH3 elevation
    # Simulates: chemical storage room leakage, industrial exhaust failure
    anomaly_co2 = pd.DataFrame({
        "co2_ppm":         rng.choice([
                               rng.normal(550, 80, 50).clip(400, 700),
                               rng.normal(750, 100, 50).clip(600, 900),
                           ], replace=False).flatten()[:n_anomaly // 2],
        "co_ppm":          rng.normal(50, 20, n_anomaly // 2).clip(30, 120),
        "nh3_ppm":         rng.normal(35, 10, n_anomaly // 2).clip(20, 80),
        "voc_ppm":         rng.normal(40, 15, n_anomaly // 2).clip(25, 100),
        "temperature_c":   rng.normal(28, 5, n_anomaly // 2).clip(20, 55),
        "humidity_pct":    rng.normal(65, 12, n_anomaly // 2).clip(40, 90),
        "sensor_drift":    rng.normal(0.05, 0.03, n_anomaly // 2).clip(-0.05, 0.2),
        "label":           1,  # 1 = gas leak anomaly
        "risk_level":      "HIGH",
    })

    # Anomaly: severe CO2 + CO spike (CRITICAL)
    anomaly_crit = pd.DataFrame({
        "co2_ppm":         rng.normal(850, 50, n_anomaly // 2).clip(700, 1000),
        "co_ppm":          rng.normal(100, 30, n_anomaly // 2).clip(80, 200),
        "nh3_ppm":         rng.normal(60, 15, n_anomaly // 2).clip(50, 150),
        "voc_ppm":         rng.normal(80, 20, n_anomaly // 2).clip(60, 150),
        "temperature_c":   rng.normal(35, 8, n_anomaly // 2).clip(25, 70),
        "humidity_pct":    rng.normal(75, 10, n_anomaly // 2).clip(55, 95),
        "sensor_drift":    rng.normal(0.1, 0.05, n_anomaly // 2).clip(0, 0.3),
        "label":           2,  # 2 = critical gas leak
        "risk_level":      "CRITICAL",
    })

    df = pd.concat([normal, anomaly_co2, anomaly_crit], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)  # shuffle
    path = os.path.join(OUTPUT_DIR, "gas_co2_sensor_dataset.csv")
    df.to_csv(path, index=False)
    print(f"[GAS]   Saved {len(df)} samples → {path}")
    print(f"         Normal: {(df.label==0).sum()}, Anomaly: {(df.label==1).sum()}, Critical: {(df.label==2).sum()}")
    return df


# ─── 2. Energy / Electricity Dataset ─────────────────────────────────────────
# Mirrors: AMPDS2 Smart Meter, UK-DALE, Smart Home Energy datasets
# SCT-013 non-invasive current sensor on ESP32 measuring kWh
# EcoWatch tracks energy degradation trend
def generate_energy_dataset():
    n_normal, n_anomaly = 400, 100
    rng = np.random.default_rng(43)

    # Normal: industrial equipment 1.5–8 kWh range, PF 0.85–0.99
    normal = pd.DataFrame({
        "current_amps":       rng.normal(12, 3, n_normal).clip(5, 20),
        "voltage_v":          rng.normal(220, 5, n_normal).clip(205, 240),
        "power_kw":           rng.normal(3.5, 0.8, n_normal).clip(1.5, 6),
        "power_factor":       rng.normal(0.93, 0.04, n_normal).clip(0.85, 0.99),
        "thd_pct":            rng.normal(3, 1, n_normal).clip(0.5, 6),       # total harmonic distortion
        "consumption_kwh":    rng.normal(4.2, 0.9, n_normal).clip(1.5, 8),
        "frequency_hz":       rng.normal(50, 0.1, n_normal).clip(49.5, 50.5),
        "load_variance":      rng.normal(0.05, 0.02, n_normal).clip(0, 0.15),
        "label":              0,
        "risk_level":         "LOW",
    })

    # Anomaly: electricity fault — overcurrent, voltage sag, high THD
    # Simulates: motor winding fault, transformer degradation, wiring fault
    anomaly_fault = pd.DataFrame({
        "current_amps":       rng.normal(28, 5, n_anomaly // 2).clip(20, 45),
        "voltage_v":          rng.normal(205, 8, n_anomaly // 2).clip(185, 215),
        "power_kw":           rng.normal(7.5, 1.5, n_anomaly // 2).clip(6, 12),
        "power_factor":       rng.normal(0.72, 0.06, n_anomaly // 2).clip(0.55, 0.82),
        "thd_pct":            rng.normal(15, 5, n_anomaly // 2).clip(8, 30),
        "consumption_kwh":    rng.normal(9.5, 1.5, n_anomaly // 2).clip(7, 14),
        "frequency_hz":       rng.normal(49.7, 0.2, n_anomaly // 2).clip(49.0, 50.0),
        "load_variance":      rng.normal(0.25, 0.08, n_anomaly // 2).clip(0.15, 0.5),
        "label":              1,
        "risk_level":         "HIGH",
    })

    # Critical: severe overcurrent / short circuit indicators
    anomaly_crit = pd.DataFrame({
        "current_amps":       rng.normal(45, 8, n_anomaly // 2).clip(35, 70),
        "voltage_v":          rng.normal(195, 10, n_anomaly // 2).clip(170, 210),
        "power_kw":           rng.normal(12, 2, n_anomaly // 2).clip(10, 18),
        "power_factor":       rng.normal(0.55, 0.08, n_anomaly // 2).clip(0.35, 0.65),
        "thd_pct":            rng.normal(28, 8, n_anomaly // 2).clip(18, 55),
        "consumption_kwh":    rng.normal(16, 2, n_anomaly // 2).clip(12, 22),
        "frequency_hz":       rng.normal(49.3, 0.3, n_anomaly // 2).clip(48.5, 49.7),
        "load_variance":      rng.normal(0.5, 0.12, n_anomaly // 2).clip(0.3, 0.9),
        "label":              2,
        "risk_level":         "CRITICAL",
    })

    df = pd.concat([normal, anomaly_fault, anomaly_crit], ignore_index=True)
    df = df.sample(frac=1, random_state=43).reset_index(drop=True)
    path = os.path.join(OUTPUT_DIR, "energy_electricity_dataset.csv")
    df.to_csv(path, index=False)
    print(f"[ENERGY] Saved {len(df)} samples → {path}")
    print(f"          Normal: {(df.label==0).sum()}, Fault: {(df.label==1).sum()}, Critical: {(df.label==2).sum()}")
    return df


# ─── 3. Temperature / Thermal Risk Dataset ───────────────────────────────────
# Mirrors: CMAPSS Turbofan Engine Degradation, PHM Data Challenge
# DHT22 sensor on ESP32 measures temperature + humidity
# EcoWatch alert: temp > 65°C equipment, humidity > 85% moisture risk
def generate_temperature_dataset():
    n_normal, n_anomaly = 400, 100
    rng = np.random.default_rng(44)

    # Normal: industrial equipment 20–55°C operating range
    normal = pd.DataFrame({
        "temperature_c":     rng.normal(35, 8, n_normal).clip(15, 55),
        "humidity_pct":      rng.normal(45, 10, n_normal).clip(20, 70),
        "heat_index_c":      rng.normal(38, 9, n_normal).clip(18, 58),
        "temp_rate_change":  rng.normal(0.1, 0.05, n_normal).clip(-0.5, 0.8),  # °C/min
        "ambient_temp_c":    rng.normal(25, 4, n_normal).clip(15, 38),
        "delta_temp_c":      rng.normal(10, 4, n_normal).clip(0, 25),   # equipment vs ambient
        "cycles_since_maint": rng.integers(0, 500, n_normal),
        "label":             0,
        "risk_level":        "LOW",
    })

    # Anomaly: thermal runaway precursor
    anomaly_thermal = pd.DataFrame({
        "temperature_c":     rng.normal(72, 8, n_anomaly // 2).clip(60, 95),
        "humidity_pct":      rng.normal(75, 10, n_anomaly // 2).clip(60, 92),
        "heat_index_c":      rng.normal(78, 10, n_anomaly // 2).clip(65, 105),
        "temp_rate_change":  rng.normal(1.5, 0.5, n_anomaly // 2).clip(0.8, 3.5),
        "ambient_temp_c":    rng.normal(30, 5, n_anomaly // 2).clip(22, 45),
        "delta_temp_c":      rng.normal(40, 8, n_anomaly // 2).clip(28, 65),
        "cycles_since_maint": rng.integers(400, 1200, n_anomaly // 2),
        "label":             1,
        "risk_level":        "HIGH",
    })

    # Critical: overheating / fire risk
    anomaly_crit = pd.DataFrame({
        "temperature_c":     rng.normal(95, 10, n_anomaly // 2).clip(85, 130),
        "humidity_pct":      rng.normal(85, 8, n_anomaly // 2).clip(75, 98),
        "heat_index_c":      rng.normal(105, 12, n_anomaly // 2).clip(90, 140),
        "temp_rate_change":  rng.normal(3.5, 0.8, n_anomaly // 2).clip(2.5, 6.0),
        "ambient_temp_c":    rng.normal(38, 6, n_anomaly // 2).clip(28, 55),
        "delta_temp_c":      rng.normal(65, 10, n_anomaly // 2).clip(50, 90),
        "cycles_since_maint": rng.integers(800, 2000, n_anomaly // 2),
        "label":             2,
        "risk_level":        "CRITICAL",
    })

    df = pd.concat([normal, anomaly_thermal, anomaly_crit], ignore_index=True)
    df = df.sample(frac=1, random_state=44).reset_index(drop=True)
    path = os.path.join(OUTPUT_DIR, "temperature_thermal_dataset.csv")
    df.to_csv(path, index=False)
    print(f"[TEMP]   Saved {len(df)} samples → {path}")
    print(f"          Normal: {(df.label==0).sum()}, High: {(df.label==1).sum()}, Critical: {(df.label==2).sum()}")
    return df


# ─── 4. Water / Moisture Leakage Dataset ─────────────────────────────────────
# Mirrors: BattLeDIM (Battle of Leakage Detection), BWSN datasets
# Moisture sensor + DHT22 humidity on ESP32
# EcoWatch detects water pipe leaks + moisture accumulation
def generate_water_leakage_dataset():
    n_normal, n_anomaly = 400, 100
    rng = np.random.default_rng(45)

    # Normal: dry industrial environment
    normal = pd.DataFrame({
        "moisture_raw":      rng.normal(180, 30, n_normal).clip(100, 280),   # ADC 0-1023
        "moisture_pct":      rng.normal(18, 5, n_normal).clip(5, 35),
        "humidity_pct":      rng.normal(42, 10, n_normal).clip(20, 65),
        "pressure_bar":      rng.normal(3.5, 0.3, n_normal).clip(2.8, 4.5),  # pipe pressure
        "flow_rate_lpm":     rng.normal(25, 4, n_normal).clip(15, 35),
        "pressure_drop_bar": rng.normal(0.05, 0.02, n_normal).clip(0, 0.15),
        "vibration_hz":      rng.normal(45, 8, n_normal).clip(20, 70),       # pipe vibration
        "sound_db":          rng.normal(42, 5, n_normal).clip(30, 55),       # KY-038 ambient
        "label":             0,
        "risk_level":        "LOW",
    })

    # Anomaly: early leak — moisture spike, pressure drop
    anomaly_leak = pd.DataFrame({
        "moisture_raw":      rng.normal(550, 80, n_anomaly // 2).clip(400, 750),
        "moisture_pct":      rng.normal(62, 10, n_anomaly // 2).clip(45, 85),
        "humidity_pct":      rng.normal(75, 8, n_anomaly // 2).clip(60, 90),
        "pressure_bar":      rng.normal(2.8, 0.3, n_anomaly // 2).clip(2.0, 3.2),
        "flow_rate_lpm":     rng.normal(38, 6, n_anomaly // 2).clip(28, 55),  # flow increasing
        "pressure_drop_bar": rng.normal(0.35, 0.1, n_anomaly // 2).clip(0.2, 0.6),
        "vibration_hz":      rng.normal(65, 10, n_anomaly // 2).clip(50, 90),
        "sound_db":          rng.normal(58, 6, n_anomaly // 2).clip(48, 75),
        "label":             1,
        "risk_level":        "HIGH",
    })

    # Critical: burst / major leak
    anomaly_burst = pd.DataFrame({
        "moisture_raw":      rng.normal(850, 80, n_anomaly // 2).clip(700, 1023),
        "moisture_pct":      rng.normal(90, 5, n_anomaly // 2).clip(80, 100),
        "humidity_pct":      rng.normal(90, 5, n_anomaly // 2).clip(82, 98),
        "pressure_bar":      rng.normal(1.5, 0.4, n_anomaly // 2).clip(0.5, 2.2),
        "flow_rate_lpm":     rng.normal(65, 10, n_anomaly // 2).clip(50, 90),
        "pressure_drop_bar": rng.normal(0.8, 0.15, n_anomaly // 2).clip(0.5, 1.2),
        "vibration_hz":      rng.normal(90, 12, n_anomaly // 2).clip(70, 120),
        "sound_db":          rng.normal(75, 8, n_anomaly // 2).clip(60, 95),
        "label":             2,
        "risk_level":        "CRITICAL",
    })

    df = pd.concat([normal, anomaly_leak, anomaly_burst], ignore_index=True)
    df = df.sample(frac=1, random_state=45).reset_index(drop=True)
    path = os.path.join(OUTPUT_DIR, "water_leakage_dataset.csv")
    df.to_csv(path, index=False)
    print(f"[WATER]  Saved {len(df)} samples → {path}")
    print(f"          Normal: {(df.label==0).sum()}, Leak: {(df.label==1).sum()}, Burst: {(df.label==2).sum()}")
    return df


# ─── 5. Multi-Sensor Risk Dataset ────────────────────────────────────────────
# Mirrors: SKAB (Skoltech Anomaly Benchmark), NASA MSL/SMAP datasets
# All EcoWatch sensors combined → risk level classification
def generate_multisensor_dataset():
    n_per_class = 125  # 125 × 4 classes = 500 samples
    rng = np.random.default_rng(46)

    def make_class(n, co2_range, curr_range, temp_range, moist_range,
                   gas_range, sound_range, risk):
        return pd.DataFrame({
            "co2_ppm":        rng.uniform(*co2_range, n),
            "current_amps":   rng.uniform(*curr_range, n),
            "temperature_c":  rng.uniform(*temp_range, n),
            "humidity_pct":   rng.uniform(20, 85, n),
            "moisture_raw":   rng.uniform(*moist_range, n),
            "gas_ppm":        rng.uniform(*gas_range, n),
            "sound_db":       rng.uniform(*sound_range, n),
            "power_kw":       rng.uniform(curr_range[0]*0.22, curr_range[1]*0.22, n),
            "vibration_rms":  rng.uniform(0.05, 2.5, n),
            "uptime_hrs":     rng.uniform(0, 720, n),
            "label":          risk,
        })

    low  = make_class(n_per_class, (180,360), (5,18),  (15,50),  (50,200),  (5,40),  (30,50), "LOW")
    med  = make_class(n_per_class, (360,450), (18,28), (50,68),  (200,450), (40,120),(50,65), "MEDIUM")
    high = make_class(n_per_class, (450,650), (28,42), (68,90),  (450,700), (120,300),(65,80),"HIGH")
    crit = make_class(n_per_class, (650,1000),(42,70), (90,140), (700,1023),(300,600),(80,100),"CRITICAL")

    df = pd.concat([low, med, high, crit], ignore_index=True)
    df = df.sample(frac=1, random_state=46).reset_index(drop=True)
    path = os.path.join(OUTPUT_DIR, "multisensor_risk_dataset.csv")
    df.to_csv(path, index=False)
    print(f"[MULTI]  Saved {len(df)} samples → {path}")
    print(f"          LOW: {(df.label=='LOW').sum()}, MED: {(df.label=='MEDIUM').sum()}, "
          f"HIGH: {(df.label=='HIGH').sum()}, CRIT: {(df.label=='CRITICAL').sum()}")
    return df


if __name__ == "__main__":
    print("=" * 60)
    print("EcoWatch AI — Generating Training Datasets")
    print("=" * 60)
    generate_gas_dataset()
    generate_energy_dataset()
    generate_temperature_dataset()
    generate_water_leakage_dataset()
    generate_multisensor_dataset()
    print("=" * 60)
    print("All datasets generated successfully.")
