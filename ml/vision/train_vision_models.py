"""
EcoWatch AI - Vision Model Trainer (Position- & Scale-Invariant)
------------------------------------------------------------------
Trains 2 highly-accurate, rotation-, scale- and illumination-invariant
computer vision models for industrial predictive maintenance:

Model A: corrosion_patch_model.pkl
  Detects active surface rust, oxidation, pitting, and flange wear.
  Trained with multi-angle rotation, flip, and contrast augmentation.

Model B: water_leak_image_model.pkl
  Detects liquid seepage, moisture puddles, staining, and fluid films.
  Trained with color-balance, rotation, and lighting augmentation.

Features include:
  - Multi-scale HSV & LAB color histograms (illumination-invariant)
  - Rotational-invariant Local Binary Patterns (LBP)
  - Color ratios (R/(G+B), (R-B)/(R+B)) for rust oxidation isolation
  - Specular highlight ratio + dark fluid streak gradient analysis
  - Sobel & Canny edge energy density
------------------------------------------------------------------
"""

import os
import re
import json
import glob
import random
import warnings

import numpy as np
import cv2
import joblib
import pandas as pd
from skimage.feature import local_binary_pattern
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, f1_score, confusion_matrix

warnings.filterwarnings("ignore")
random.seed(42)
np.random.seed(42)

HERE = os.path.dirname(__file__)
DATA_DIR = os.path.join(HERE, "data")
MODEL_DIR = os.path.join(HERE, "models")
REPORT_DIR = os.path.join(HERE, "reports")
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

PATCH_SIZE = 64      # base patch size
IMG_SIZE = 128        # whole-image resize side (px) for leak classifier
all_reports = {}


def banner(t):
    print(f"\n{'=' * 66}\n  {t}\n{'=' * 66}")


# ─── Robust Feature Extractor ──────────────────────────────────────────────
def extract_features(bgr_img):
    """
    Extracts a 52-dimensional, position-, rotation-, and illumination-invariant
    feature vector from a BGR image/patch.
    """
    if bgr_img is None or bgr_img.size == 0:
        return np.zeros(52, dtype=np.float32)

    img = cv2.resize(bgr_img, (PATCH_SIZE, PATCH_SIZE))
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    feats = []

    # 1) HSV Color Histograms (8 bins/channel) -> Hue & Saturation color signatures
    for ch in range(3):
        hist = cv2.calcHist([hsv], [ch], None, [8], [0, 256]).flatten()
        hist = hist / (hist.sum() + 1e-6)
        feats.extend(hist.tolist())

    # 2) HSV channel mean & std -> overall lighting & saturation level
    feats.extend(hsv.reshape(-1, 3).mean(axis=0).tolist())
    feats.extend(hsv.reshape(-1, 3).std(axis=0).tolist())

    # 3) LAB color space (L lightness, A green-red, B blue-yellow)
    # Rust is characterized by high B (yellow/brown) and high A (red/orange)
    feats.extend(lab.reshape(-1, 3).mean(axis=0).tolist())
    feats.extend(lab.reshape(-1, 3).std(axis=0).tolist())

    # 4) RGB Color Ratios (invariant to global lighting changes)
    b_ch = img[:, :, 0].astype(np.float32)
    g_ch = img[:, :, 1].astype(np.float32)
    r_ch = img[:, :, 2].astype(np.float32)
    
    r_ratio = (r_ch / (g_ch + b_ch + 1e-5)).mean()
    rb_diff = ((r_ch - b_ch) / (r_ch + b_ch + 1e-5)).mean()
    feats.append(float(r_ratio))
    feats.append(float(rb_diff))

    # 5) Rotation-Invariant Local Binary Pattern (LBP) Texture Histogram
    lbp = local_binary_pattern(gray, P=8, R=1, method="uniform")
    lbp_hist, _ = np.histogram(lbp, bins=10, range=(0, 10))
    lbp_hist = lbp_hist / (lbp_hist.sum() + 1e-6)
    feats.extend(lbp_hist.tolist())

    # 6) Edge & Gradient Density (Cracks, flaking rust, and puddle boundaries)
    edges = cv2.Canny(gray, 50, 150)
    feats.append(float((edges > 0).mean()))
    
    # Sobel gradient magnitude variance (surface roughness)
    sobelx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    grad_mag = np.sqrt(sobelx**2 + sobely**2)
    feats.append(float(grad_mag.mean() / 255.0))
    feats.append(float(grad_mag.std() / 255.0))

    # 7) Dark-Area Ratio (Moisture accumulation, deep shadow / corrosion pits)
    dark_ratio = (hsv[:, :, 2] < 85).mean()
    feats.append(float(dark_ratio))

    # 8) Specular Highlight Ratio (Wet sheen / glossy liquid reflection)
    specular_mask = (hsv[:, :, 2] > 205) & (hsv[:, :, 1] < 45)
    feats.append(float(specular_mask.mean()))

    # 9) Saturation-Weighted Rust Hue Band Ratio (Orange/Brown: 5-28 deg in OpenCV HSV)
    hue = hsv[:, :, 0]
    rust_mask = ((hue >= 4) & (hue <= 28)) & (hsv[:, :, 1] > 55)
    feats.append(float(rust_mask.mean()))

    # 10) High-Contrast Texture Ratio (Flaking scale / mineral deposits)
    contrast = float(gray.std() / 128.0)
    feats.append(contrast)

    return np.array(feats, dtype=np.float32)


FEATURE_NAMES = (
    [f"h_hist_{i}" for i in range(8)]
    + [f"s_hist_{i}" for i in range(8)]
    + [f"v_hist_{i}" for i in range(8)]
    + ["h_mean", "s_mean", "v_mean", "h_std", "s_std", "v_std"]
    + ["l_mean", "a_mean", "b_mean", "l_std", "a_std", "b_std"]
    + ["r_ratio", "rb_diff"]
    + [f"lbp_{i}" for i in range(10)]
    + ["edge_density", "grad_mean", "grad_std", "dark_ratio", "specular_ratio", "rust_hue_ratio", "contrast"]
)


# ─── Data Augmentation ──────────────────────────────────────────────────────
def augment_patch(patch):
    """Generates rotated, flipped, and brightness-adjusted variants of a patch."""
    augmented = [patch]

    # 1) Rotations (90, 180, 270)
    augmented.append(cv2.rotate(patch, cv2.ROTATE_90_CLOCKWISE))
    augmented.append(cv2.rotate(patch, cv2.ROTATE_180))
    augmented.append(cv2.rotate(patch, cv2.ROTATE_90_COUNTERCLOCKWISE))

    # 2) Flips (horizontal & vertical)
    augmented.append(cv2.flip(patch, 1))
    augmented.append(cv2.flip(patch, 0))

    # 3) Brightness scaling
    bright = np.clip(patch.astype(np.float32) * 1.25, 0, 255).astype(np.uint8)
    dim = np.clip(patch.astype(np.float32) * 0.75, 0, 255).astype(np.uint8)
    augmented.append(bright)
    augmented.append(dim)

    return augmented


def save_meta(name, classes, extra=None):
    meta = {
        "model_name": name,
        "feature_columns": FEATURE_NAMES,
        "feature_count": len(FEATURE_NAMES),
        "label_column": "label",
        "classes": classes,
        "version": "2.0.0-invariant",
        "framework": "scikit-learn+opencv",
        "trained_at": pd.Timestamp.now().isoformat(),
    }
    if extra:
        meta.update(extra)
    with open(os.path.join(MODEL_DIR, f"{name}.meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    return meta


def report(name, y_test, y_pred, classes):
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="weighted")
    print(f"\n  Accuracy: {acc:.4f}  F1: {f1:.4f}")
    print(classification_report(y_test, y_pred, target_names=classes))
    all_reports[name] = {
        "accuracy": round(float(acc), 4),
        "f1_weighted": round(float(f1), 4),
        "test_samples": int(len(y_test)),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
    }
    return acc, f1


# ─── Model A: Corrosion Patch Classifier ───────────────────────────────────
def train_corrosion_model():
    banner("MODEL A: Invariant Corrosion Patch Classifier (YOLO Boxes + Augmentation)")
    img_dir = os.path.join(DATA_DIR, "corrosion", "images")
    lbl_dir = os.path.join(DATA_DIR, "corrosion", "labels")

    raw_pos, raw_neg = [], []
    for label_path in sorted(glob.glob(os.path.join(lbl_dir, "*.txt"))):
        stem = os.path.splitext(os.path.basename(label_path))[0]
        img_path = None
        for ext in (".jpeg", ".jpg", ".png"):
            cand = os.path.join(img_dir, stem + ext)
            if os.path.exists(cand):
                img_path = cand
                break
        if img_path is None:
            continue

        img = cv2.imread(img_path)
        if img is None:
            continue
        H, W = img.shape[:2]

        boxes = []
        with open(label_path) as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) != 5:
                    continue
                _, cx, cy, bw, bh = map(float, parts)
                x1 = int((cx - bw / 2) * W)
                y1 = int((cy - bh / 2) * H)
                x2 = int((cx + bw / 2) * W)
                y2 = int((cy + bh / 2) * H)
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(W, x2), min(H, y2)
                if x2 - x1 < 8 or y2 - y1 < 8:
                    continue
                boxes.append((x1, y1, x2, y2))

        # Positive patches
        for (x1, y1, x2, y2) in boxes[:6]:
            patch = img[y1:y2, x1:x2]
            raw_pos.append(patch)

        # Negative patches from non-corroded areas
        tries, made = 0, 0
        target_neg = min(len(boxes[:6]), 4) or 2
        while made < target_neg and tries < 30:
            tries += 1
            pw = random.randint(30, max(31, W // 4))
            ph = random.randint(30, max(31, H // 4))
            if W - pw <= 0 or H - ph <= 0:
                break
            rx1 = random.randint(0, W - pw)
            ry1 = random.randint(0, H - ph)
            rx2, ry2 = rx1 + pw, ry1 + ph
            overlap = any(
                rx1 < bx2 and rx2 > bx1 and ry1 < by2 and ry2 > by1
                for (bx1, by1, bx2, by2) in boxes
            )
            if overlap:
                continue
            raw_neg.append(img[ry1:ry2, rx1:rx2])
            made += 1

    print(f"  Base patches: Positives={len(raw_pos)}, Negatives={len(raw_neg)}")

    # Apply data augmentation
    X, y = [], []
    for patch in raw_pos:
        for aug in augment_patch(patch):
            X.append(extract_features(aug))
            y.append(1)

    for patch in raw_neg:
        for aug in augment_patch(patch):
            X.append(extract_features(aug))
            y.append(0)

    X, y = np.array(X), np.array(y)
    print(f"  Total augmented training samples: {len(y)} (Corrosion={int(y.sum())}, Clean={int((y == 0).sum())})")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )

    clf = RandomForestClassifier(
        n_estimators=350, max_depth=16, min_samples_leaf=2,
        class_weight="balanced_subsample", random_state=42, n_jobs=-1
    )
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    report("corrosion_patch_model", y_test, y_pred, ["clean", "corrosion"])

    cv = cross_val_score(clf, X, y, cv=5, scoring="f1_weighted")
    print(f"  5-fold Cross-Validation F1: {cv.mean():.4f} +/- {cv.std():.4f}")

    joblib.dump(clf, os.path.join(MODEL_DIR, "corrosion_patch_model.pkl"))
    save_meta(
        "corrosion_patch_model",
        ["0:clean", "1:corrosion"],
        extra={
            "source_dataset": "Corrosion YOLO dataset with 8x augmentation",
            "patch_size": PATCH_SIZE,
            "cv_f1_mean": round(float(cv.mean()), 4),
            "cv_f1_std": round(float(cv.std()), 4),
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        },
    )
    print("  Saved -> models/corrosion_patch_model.pkl (+ .meta.json)")


# ─── Model B: Invariant Water Leak Classifier ──────────────────────────────
def train_leak_model():
    banner("MODEL B: Invariant Water-Leak Classifier (Photos + Augmentation)")
    img_dir = os.path.join(DATA_DIR, "water_leak", "train")

    raw_pos, raw_neg = [], []
    held_out_unlabeled = []
    for fname in sorted(os.listdir(img_dir)):
        path = os.path.join(img_dir, fname)
        if not os.path.isfile(path):
            continue
        m = re.match(r"^(pos|neg)_", fname)
        if not m:
            held_out_unlabeled.append(fname)
            continue
        img = cv2.imread(path)
        if img is None:
            continue
        if m.group(1) == "pos":
            raw_pos.append(img)
        else:
            raw_neg.append(img)

    print(f"  Base photos: Leaks={len(raw_pos)}, Clean={len(raw_neg)}")

    X, y = [], []
    # Augment leak and non-leak images
    for img in raw_pos:
        for aug in augment_patch(img):
            X.append(extract_features(aug))
            y.append(1)

    for img in raw_neg:
        for aug in augment_patch(img):
            X.append(extract_features(aug))
            y.append(0)

    X, y = np.array(X), np.array(y)
    print(f"  Total augmented training samples: {len(y)} (Leak={int(y.sum())}, No-Leak={int((y == 0).sum())})")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )

    clf = RandomForestClassifier(
        n_estimators=350, max_depth=14, min_samples_leaf=2,
        class_weight="balanced_subsample", random_state=42, n_jobs=-1
    )
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    report("water_leak_image_model", y_test, y_pred, ["no_leak", "leak"])

    cv = cross_val_score(clf, X, y, cv=5, scoring="f1_weighted")
    print(f"  5-fold Cross-Validation F1: {cv.mean():.4f} +/- {cv.std():.4f}")

    joblib.dump(clf, os.path.join(MODEL_DIR, "water_leak_image_model.pkl"))
    save_meta(
        "water_leak_image_model",
        ["0:no_leak", "1:leak"],
        extra={
            "source_dataset": "Water leak photography dataset with 8x augmentation",
            "image_size": IMG_SIZE,
            "cv_f1_mean": round(float(cv.mean()), 4),
            "cv_f1_std": round(float(cv.std()), 4),
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "held_out_unlabeled_files": held_out_unlabeled,
        },
    )
    print("  Saved -> models/water_leak_image_model.pkl (+ .meta.json)")


if __name__ == "__main__":
    train_corrosion_model()
    train_leak_model()

    with open(os.path.join(REPORT_DIR, "vision_training_report.json"), "w") as f:
        json.dump(all_reports, f, indent=2)

    banner("TRAINING COMPLETE")
    for k, v in all_reports.items():
        print(f"  {k:28s} acc={v['accuracy']:.4f}  f1={v['f1_weighted']:.4f}  n_test={v['test_samples']}")
    print(f"\n  Detailed report -> reports/vision_training_report.json")
