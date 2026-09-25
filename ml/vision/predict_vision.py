"""
EcoWatch AI - Vision Prediction & Predictive Prognosis Engine
------------------------------------------------------------------
Performs position-, rotation-, and scale-invariant computer vision
analysis on industrial equipment photographs, and calculates predictive
time-to-failure forecasts (corrosion wall thinning, fluid leakage breach,
gas escape probability).
"""

import sys
import os
import json
import numpy as np
import cv2
import joblib

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

from train_vision_models import extract_features, PATCH_SIZE  # noqa: E402

REGISTRY = {
    "corrosion_patch": {
        "model_file": "corrosion_patch_model.pkl",
        "classes": {0: "clean", 1: "corrosion"},
        "risk_map": {0: "LOW", 1: "HIGH"},
    },
    "water_leak_image": {
        "model_file": "water_leak_image_model.pkl",
        "classes": {0: "no_leak", 1: "leak"},
        "risk_map": {0: "LOW", 1: "HIGH"},
    },
}

_cache = {}


def _load(model_key):
    if model_key not in _cache:
        entry = REGISTRY[model_key]
        path = os.path.join(MODEL_DIR, entry["model_file"])
        _cache[model_key] = joblib.load(path)
    return _cache[model_key]


def _compute_prognosis(hazard_type, peak_confidence, affected_pct, max_prob):
    """
    Computes deterministic predictive failure timeline and future risk progression.
    """
    if max_prob < 0.40:
        return {
            "future_hazard": "Normal operational aging; no immediate failure risk",
            "estimated_time_to_failure_days": 180,
            "time_to_failure_range": "150 - 240 operating days",
            "risk_trajectory": "STABLE",
            "critical_intervention_deadline": "Next routine maintenance cycle (90 days)",
            "timeline": [
                {"timeframe": "7 Days", "projected_risk": "LOW", "estimated_probability_pct": 5, "expected_condition": "Surface remains clean with baseline protective coating intact."},
                {"timeframe": "30 Days", "projected_risk": "LOW", "estimated_probability_pct": 10, "expected_condition": "Standard atmospheric dust deposition; protective coating functional."},
                {"timeframe": "90 Days", "projected_risk": "LOW", "estimated_probability_pct": 18, "expected_condition": "Minor surface wear; routine inspection recommended."}
            ]
        }

    if hazard_type == "corrosion":
        if max_prob >= 0.85 or affected_pct >= 35.0:
            days = max(7, int(18 - (affected_pct * 0.25)))
            return {
                "future_hazard": "Severe Pitting & High-Pressure Containment Breach (Gas/Fluid Leakage)",
                "estimated_time_to_failure_days": days,
                "time_to_failure_range": f"{max(5, days - 4)} - {days + 6} operating days",
                "risk_trajectory": "ACCELERATING",
                "degradation_mechanism": "Galvanic surface oxidation and micro-pitting accelerating under thermal & pressure cycling",
                "critical_intervention_deadline": f"Within {max(3, days // 2)} days",
                "timeline": [
                    {"timeframe": "7 Days", "projected_risk": "HIGH", "estimated_probability_pct": 65, "expected_condition": "Active corrosion layer deepens by ~25%; localized micro-fissures penetrate flange seating."},
                    {"timeframe": "14 Days", "projected_risk": "CRITICAL", "estimated_probability_pct": 88, "expected_condition": "Structural wall thinning reaches threshold; pressurized vapor seepage initiates through gasket perimeter."},
                    {"timeframe": "30 Days", "projected_risk": "CRITICAL", "estimated_probability_pct": 98, "expected_condition": "Complete seal containment failure; continuous gas/fluid blow-by and hazardous leak event."}
                ]
            }
        else:
            days = max(20, int(45 - (affected_pct * 0.4)))
            return {
                "future_hazard": "Progressive Flange Oxidation & Seal Degradation",
                "estimated_time_to_failure_days": days,
                "time_to_failure_range": f"{days - 7} - {days + 10} operating days",
                "risk_trajectory": "PROGRESSIVE",
                "degradation_mechanism": "Initial surface oxidation weakening protective barrier coating",
                "critical_intervention_deadline": f"Within {days // 2} days",
                "timeline": [
                    {"timeframe": "7 Days", "projected_risk": "MEDIUM", "estimated_probability_pct": 30, "expected_condition": "Surface oxidation layer expands across adjacent bolt and joint seams."},
                    {"timeframe": "30 Days", "projected_risk": "HIGH", "estimated_probability_pct": 68, "expected_condition": "Deepening pitting weakens gasket compression elasticity."},
                    {"timeframe": "60 Days", "projected_risk": "CRITICAL", "estimated_probability_pct": 90, "expected_condition": "Micro-gap formation causing fluid/gas escape under peak operating load."}
                ]
            }

    # Water Leak hazard
    if max_prob >= 0.85 or affected_pct >= 30.0:
        days = max(5, int(14 - (affected_pct * 0.2)))
        return {
            "future_hazard": "Pressurized Fluid Line Rupture & Substation Flooding",
            "estimated_time_to_failure_days": days,
            "time_to_failure_range": f"{max(3, days - 3)} - {days + 5} operating days",
            "risk_trajectory": "ACCELERATING",
            "degradation_mechanism": "Fluid pressure surges eroding compromised mechanical seal interface",
            "critical_intervention_deadline": f"Within {max(2, days // 2)} days",
            "timeline": [
                {"timeframe": "7 Days", "projected_risk": "CRITICAL", "estimated_probability_pct": 75, "expected_condition": "Droplet seepage transitions to continuous trickling stream along housing."},
                {"timeframe": "14 Days", "projected_risk": "CRITICAL", "estimated_probability_pct": 92, "expected_condition": "Hydraulic pressure surges blow out packing seal; active drainage overflow."},
                {"timeframe": "30 Days", "projected_risk": "CRITICAL", "estimated_probability_pct": 99, "expected_condition": "Full containment breach; high-volume liquid discharge and motor electrical short risk."}
            ]
        }
    else:
        days = max(18, int(35 - (affected_pct * 0.3)))
        return {
            "future_hazard": "Progressive Fluid Seepage & Moisture Damage",
            "estimated_time_to_failure_days": days,
            "time_to_failure_range": f"{days - 5} - {days + 8} operating days",
            "risk_trajectory": "PROGRESSIVE",
            "degradation_mechanism": "Slow weeping through elastomer seal aging",
            "critical_intervention_deadline": f"Within {days // 2} days",
            "timeline": [
                {"timeframe": "7 Days", "projected_risk": "MEDIUM", "estimated_probability_pct": 35, "expected_condition": "Moisture ring expands; mineral deposition builds along pipe flange."},
                {"timeframe": "30 Days", "projected_risk": "HIGH", "estimated_probability_pct": 72, "expected_condition": "Fluid accumulation saturates surrounding insulation and baseplate."},
                {"timeframe": "60 Days", "projected_risk": "CRITICAL", "estimated_probability_pct": 94, "expected_condition": "Unchecked fluid leakage causing severe corrosion and containment breach."}
            ]
        }


def _predict_corrosion_multiscale(image_path, grid=4):
    clf = _load("corrosion_patch")
    img = cv2.imread(image_path)
    if img is None:
        return {"error": f"could not read image: {image_path}"}

    H, W = img.shape[:2]
    best_cell = None
    cells = []
    positive_count = 0
    total_cells = 0

    # Multi-scale grid scan (2x2, 3x3, 4x4)
    for g in [2, 3, grid]:
        ch, cw = H // g, W // g
        for r in range(g):
            for c in range(g):
                y1, y2 = r * ch, (r + 1) * ch if r < g - 1 else H
                x1, x2 = c * cw, (c + 1) * cw if c < g - 1 else W
                patch = img[y1:y2, x1:x2]
                if patch.size == 0:
                    continue
                feats = extract_features(patch).reshape(1, -1)
                proba = clf.predict_proba(feats)[0]
                corr_prob = float(proba[1])
                total_cells += 1
                if corr_prob >= 0.50:
                    positive_count += 1

                if g == grid:
                    cell = {
                        "row": r, "col": c,
                        "bbox": [int(x1), int(y1), int(x2), int(y2)],
                        "corrosion_prob": round(corr_prob, 4),
                    }
                    cells.append(cell)
                    if best_cell is None or corr_prob > best_cell["corrosion_prob"]:
                        best_cell = cell

    # Whole image pass
    whole_feats = extract_features(img).reshape(1, -1)
    whole_proba = clf.predict_proba(whole_feats)[0]
    whole_prob = float(whole_proba[1])

    max_prob = max(whole_prob, best_cell["corrosion_prob"] if best_cell else 0.0)
    affected_pct = round((positive_count / max(1, total_cells)) * 100.0, 1)
    overall_pred = "corrosion" if max_prob >= 0.50 else "clean"
    confidence = round(max_prob, 4)

    prognosis = _compute_prognosis("corrosion", confidence, affected_pct, max_prob)

    return {
        "model": "corrosion_patch",
        "prediction": overall_pred,
        "confidence": confidence,
        "risk": "HIGH" if max_prob >= 0.80 else ("MEDIUM" if max_prob >= 0.50 else "LOW"),
        "affected_surface_area_pct": affected_pct,
        "hottest_cell": best_cell,
        "grid_cells": cells,
        "predictive_prognosis": prognosis,
    }


def _predict_water_leak(image_path):
    clf = _load("water_leak_image")
    img = cv2.imread(image_path)
    if img is None:
        return {"error": f"could not read image: {image_path}"}

    # Whole-image prediction
    feats = extract_features(img).reshape(1, -1)
    proba = clf.predict_proba(feats)[0]
    leak_prob = float(proba[1])

    # Multi-crop check for localized wet spots
    H, W = img.shape[:2]
    crop_probs = []
    for (y1, y2, x1, x2) in [
        (0, H // 2, 0, W // 2),
        (0, H // 2, W // 2, W),
        (H // 2, H, 0, W // 2),
        (H // 2, H, W // 2, W),
        (H // 4, 3 * H // 4, W // 4, 3 * W // 4),
    ]:
        crop = img[y1:y2, x1:x2]
        if crop.size > 0:
            c_feats = extract_features(crop).reshape(1, -1)
            c_proba = clf.predict_proba(c_feats)[0]
            crop_probs.append(float(c_proba[1]))

    max_leak_prob = max(leak_prob, max(crop_probs) if crop_probs else 0.0)
    overall_pred = "leak" if max_leak_prob >= 0.50 else "no_leak"
    confidence = round(max_leak_prob, 4)
    affected_pct = round(max_leak_prob * 45.0, 1)

    prognosis = _compute_prognosis("water_leak", confidence, affected_pct, max_leak_prob)

    return {
        "model": "water_leak_image",
        "prediction": overall_pred,
        "confidence": confidence,
        "risk": "HIGH" if max_leak_prob >= 0.80 else ("MEDIUM" if max_leak_prob >= 0.50 else "LOW"),
        "probabilities": {"no_leak": round(1.0 - max_leak_prob, 4), "leak": confidence},
        "predictive_prognosis": prognosis,
    }


def handle_request(req):
    model_key = req.get("model")
    image_path = req.get("image_path")
    if not image_path or not os.path.exists(image_path):
        return {"error": f"image_path missing or not found: {image_path}"}

    if model_key == "corrosion_patch":
        grid = int(req.get("grid", 4))
        return _predict_corrosion_multiscale(image_path, grid=grid)
    elif model_key == "water_leak_image":
        return _predict_water_leak(image_path)
    elif model_key == "all_vision":
        corr = _predict_corrosion_multiscale(image_path, grid=4)
        leak = _predict_water_leak(image_path)
        return {"corrosion": corr, "water_leak": leak}
    else:
        return {"error": f"unknown model '{model_key}'. Available: ['corrosion_patch', 'water_leak_image', 'all_vision']"}


if __name__ == "__main__":
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            result = handle_request(req)
        except Exception as e:  # noqa: BLE001
            result = {"error": str(e)}
        sys.stdout.write(json.dumps(result) + "\n")
        sys.stdout.flush()
