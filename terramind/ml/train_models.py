"""
train_models.py

Trains two models from ml/data/training_data.csv:

  Model 1 — Yield Regression (XGBoost)
    Input:  ndvi, evi, savi, chlorophyll, moisture, ph, soc_pct,
            nitrogen, phosphorus, potassium, soil_texture_encoded,
            bulk_density, temperature, humidity, suit_score
    Target: yield_qtl_acre

  Model 2 — Crop Classification (XGBoost)
    Input:  same 15 features
    Target: best_crop (12 classes)

Both models are exported as ONNX for in-browser / edge inference.
Evaluation metrics and feature importances are printed and saved.

Run:
    py ml/train_models.py
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    mean_absolute_error, r2_score,
    accuracy_score, classification_report,
)
import xgboost as xgb
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

DATA_PATH   = 'ml/data/training_data.csv'
OUTPUT_DIR  = 'ml/models'
TEST_SIZE   = 0.15
RANDOM_SEED = 42

FEATURE_COLS = [
    'ndvi', 'evi', 'savi', 'chlorophyll',
    'moisture', 'ph', 'soc_pct',
    'nitrogen', 'phosphorus', 'potassium',
    'soil_texture_encoded', 'bulk_density',
    'temperature', 'humidity',
    'suit_score',
]

YIELD_TARGET = 'yield_qtl_acre'
CROP_TARGET  = 'best_crop'

# XGBoost hyperparameters (tuned for this dataset size)
XGB_COMMON = dict(
    n_estimators    = 400,
    max_depth       = 7,
    learning_rate   = 0.08,
    subsample       = 0.85,
    colsample_bytree= 0.85,
    min_child_weight= 3,
    gamma           = 0.05,
    reg_alpha       = 0.1,
    reg_lambda      = 1.0,
    random_state    = RANDOM_SEED,
    n_jobs          = -1,
)

# ─────────────────────────────────────────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────────────────────────────────────────

def load_data():
    print(f"\n[Data] Loading {DATA_PATH} ...")
    df = pd.read_csv(DATA_PATH)
    print(f"[Data] {len(df):,} rows x {len(df.columns)} cols")

    X = df[FEATURE_COLS].astype(np.float32)
    y_yield = df[YIELD_TARGET].astype(np.float32)

    le = LabelEncoder()
    y_crop_encoded = le.fit_transform(df[CROP_TARGET])
    crop_classes   = list(le.classes_)

    print(f"[Data] Yield range: {y_yield.min():.1f} – {y_yield.max():.1f} qtl/acre")
    print(f"[Data] Crop classes ({len(crop_classes)}): {crop_classes}")

    return X, y_yield, y_crop_encoded, crop_classes, le


# ─────────────────────────────────────────────────────────────────────────────
# MODEL 1 — YIELD REGRESSION
# ─────────────────────────────────────────────────────────────────────────────

def train_yield_model(X_train, X_test, y_train, y_test):
    print("\n" + "="*60)
    print("MODEL 1 — Yield Regression (XGBoost)")
    print("="*60)

    model = xgb.XGBRegressor(
        **XGB_COMMON,
        objective = 'reg:squarederror',
        eval_metric = 'rmse',
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    preds = model.predict(X_test)
    mae  = mean_absolute_error(y_test, preds)
    r2   = r2_score(y_test, preds)
    rmse = np.sqrt(np.mean((preds - y_test) ** 2))

    print(f"\n[Yield] MAE  : {mae:.3f} qtl/acre")
    print(f"[Yield] RMSE : {rmse:.3f} qtl/acre")
    print(f"[Yield] R2   : {r2:.4f}")

    # Feature importance
    imp = pd.Series(model.feature_importances_, index=FEATURE_COLS)
    imp = imp.sort_values(ascending=False)
    print("\n[Yield] Top feature importances:")
    for feat, score in imp.head(8).items():
        bar = "#" * int(score * 200)
        print(f"  {feat:<25} {score:.4f}  {bar}")

    return model, {'mae': float(mae), 'rmse': float(rmse), 'r2': float(r2)}


# ─────────────────────────────────────────────────────────────────────────────
# MODEL 2 — CROP CLASSIFICATION
# ─────────────────────────────────────────────────────────────────────────────

def train_crop_model(X_train, X_test, y_train, y_test, crop_classes):
    print("\n" + "="*60)
    print("MODEL 2 — Crop Recommendation (XGBoost Classifier)")
    print("="*60)

    model = xgb.XGBClassifier(
        **XGB_COMMON,
        objective  = 'multi:softprob',
        num_class  = len(crop_classes),
        eval_metric= 'mlogloss',
        use_label_encoder=False,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    preds    = model.predict(X_test)
    accuracy = accuracy_score(y_test, preds)
    print(f"\n[Crop] Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    print("\n[Crop] Classification report:")
    print(classification_report(y_test, preds, target_names=crop_classes))

    # Feature importance
    imp = pd.Series(model.feature_importances_, index=FEATURE_COLS)
    imp = imp.sort_values(ascending=False)
    print("[Crop] Top feature importances:")
    for feat, score in imp.head(8).items():
        bar = "#" * int(score * 200)
        print(f"  {feat:<25} {score:.4f}  {bar}")

    return model, {'accuracy': float(accuracy)}


# ─────────────────────────────────────────────────────────────────────────────
# EXPORT TO ONNX
# ─────────────────────────────────────────────────────────────────────────────

def export_model(model, model_name: str, n_features: int):
    """Save model in two formats: XGBoost native (.ubj) for Python inference,
    and a feature-map JSON so the app knows column order."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Rename internal feature names to f0..fN so XGBoost is happy
    model.get_booster().feature_names = [f'f{i}' for i in range(n_features)]

    # Native XGBoost binary (fast, lossless)
    ubj_path = os.path.join(OUTPUT_DIR, f'{model_name}.ubj')
    model.save_model(ubj_path)
    size_kb = os.path.getsize(ubj_path) / 1024
    print(f"[Export] {model_name}.ubj saved ({size_kb:.1f} KB)")

    # Also save as JSON (human-readable, useful for debugging)
    json_path = os.path.join(OUTPUT_DIR, f'{model_name}.json')
    model.save_model(json_path)
    print(f"[Export] {model_name}.json saved")

    return ubj_path


# ─────────────────────────────────────────────────────────────────────────────
# SAVE METADATA
# ─────────────────────────────────────────────────────────────────────────────

def save_metadata(crop_classes, yield_metrics, crop_metrics, label_encoder):
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    meta = {
        'feature_cols':  FEATURE_COLS,
        'n_features':    len(FEATURE_COLS),
        'yield_model': {
            'target':   YIELD_TARGET,
            'unit':     'qtl/acre',
            'metrics':  yield_metrics,
        },
        'crop_model': {
            'target':   CROP_TARGET,
            'classes':  crop_classes,
            'n_classes': len(crop_classes),
            'metrics':  crop_metrics,
        },
        'soil_texture_map': {
            '0': 'clay_loam',
            '1': 'clay',
            '2': 'loamy',
            '3': 'silty',
            '4': 'sandy',
        },
    }

    path = os.path.join(OUTPUT_DIR, 'metadata.json')
    with open(path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"[Export] metadata.json saved")

    # Save label encoder mapping for inference
    le_map = {int(i): cls for i, cls in enumerate(label_encoder.classes_)}
    le_path = os.path.join(OUTPUT_DIR, 'crop_label_map.json')
    with open(le_path, 'w') as f:
        json.dump(le_map, f, indent=2)
    print(f"[Export] crop_label_map.json saved")


# ─────────────────────────────────────────────────────────────────────────────
# QUICK INFERENCE TEST
# ─────────────────────────────────────────────────────────────────────────────

def test_inference(yield_model, crop_model, crop_classes, X_test, y_yield_test, y_crop_test):
    print("\n" + "="*60)
    print("INFERENCE TEST — 5 sample cells")
    print("="*60)

    sample_idx = [0, 1000, 10000, 50000, 100000]
    sample_idx = [i for i in sample_idx if i < len(X_test)]

    for i in sample_idx:
        row    = X_test.iloc[i]
        y_pred = float(yield_model.predict(row.values.reshape(1, -1))[0])
        c_pred = int(crop_model.predict(row.values.reshape(1, -1))[0])
        y_true = float(y_yield_test.iloc[i])
        c_true = int(y_crop_test[i])

        print(f"\n  Cell {i}:")
        print(f"    NDVI={row['ndvi']:.2f}  Moisture={row['moisture']:.2f}  N={row['nitrogen']}kg/ha  Temp={row['temperature']}C")
        print(f"    Yield  predicted={y_pred:.2f}  actual={y_true:.2f}  diff={abs(y_pred-y_true):.2f}")
        print(f"    Crop   predicted={crop_classes[c_pred]:<12}  actual={crop_classes[c_true]}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("\nTerraMind ML Training Pipeline")
    print("================================")

    X, y_yield, y_crop, crop_classes, le = load_data()

    X_train, X_test, \
    yY_train, yY_test, \
    yC_train, yC_test = train_test_split(
        X, y_yield, y_crop,
        test_size=TEST_SIZE,
        random_state=RANDOM_SEED,
        stratify=y_crop,
    )

    print(f"\n[Split] Train: {len(X_train):,}  Test: {len(X_test):,}")

    yield_model, yield_metrics = train_yield_model(X_train, X_test, yY_train, yY_test)
    crop_model,  crop_metrics  = train_crop_model(X_train, X_test, yC_train, yC_test, crop_classes)

    print("\n" + "="*60)
    print("EXPORTING MODELS")
    print("="*60)
    export_model(yield_model, 'yield_model', len(FEATURE_COLS))
    export_model(crop_model,  'crop_model',  len(FEATURE_COLS))
    save_metadata(crop_classes, yield_metrics, crop_metrics, le)

    test_inference(yield_model, crop_model, crop_classes, X_test, yY_test, yC_test)

    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"  Yield model  MAE={yield_metrics['mae']:.3f} qtl/acre  R2={yield_metrics['r2']:.4f}")
    print(f"  Crop model   Accuracy={crop_metrics['accuracy']*100:.2f}%")
    print(f"  Models saved to: {OUTPUT_DIR}/")
    print(f"    yield_model.ubj / yield_model.json")
    print(f"    crop_model.ubj  / crop_model.json")
    print(f"    metadata.json")
    print(f"    crop_label_map.json")


if __name__ == '__main__':
    main()
