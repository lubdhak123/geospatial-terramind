"""
generate_training_data.py

Generates a large synthetic training dataset by sweeping the parameter space
of the TerraMind field data engine. This mirrors the exact logic used in the
web app's deterministic data engine (lib/fieldDataEngine.ts), ensuring the ML
model learns the same relationships before being refined with real data.

Output: ml/data/training_data.csv
"""

import csv
import math
import os
import itertools
import random

random.seed(42)

# ────────────────────────────────────────────────────────────────────────────────
# HELPERS (mirror TypeScript fieldDataEngine.ts exactly)
# ────────────────────────────────────────────────────────────────────────────────

def sn(a: float, b: float, salt: float) -> float:
    """Seeded noise — deterministic pseudo-random, matches JS version."""
    s = math.sin(a * 127.1 + b * 311.7 + salt * 74.3) * 43758.5453
    return s - math.floor(s)

def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))

def round2(v: float) -> float:
    return round(v * 100) / 100

TEXTURE_VARIANTS = ['clay_loam', 'clay', 'loamy', 'silty', 'sandy']
TEXTURE_TO_INT = {t: i for i, t in enumerate(TEXTURE_VARIANTS)}

DISEASE_TYPES = [
    {'name': 'Blast Fungus', 'ndviThresh': 0.38, 'humThresh': 72},
    {'name': 'Brown Spot',   'ndviThresh': 0.42, 'humThresh': 68},
    {'name': 'Sheath Blight','ndviThresh': 0.45, 'humThresh': 75},
    {'name': 'Bacterial LB', 'ndviThresh': 0.40, 'humThresh': 80},
]

# Crop database (mirrors cropRecommendation.ts)
CROPS = [
    {'name': 'Rice',      'soil': ['clay','loamy','clay_loam'], 'water': 'high',   'nitrogen': 'medium', 'tempRange': [20,35], 'avoidAfter': ['rice']},
    {'name': 'Wheat',     'soil': ['loamy','clay_loam','silty'],'water': 'medium', 'nitrogen': 'high',   'tempRange': [10,25], 'avoidAfter': ['wheat']},
    {'name': 'Maize',     'soil': ['loamy','sandy','clay_loam'],'water': 'medium', 'nitrogen': 'high',   'tempRange': [18,35], 'avoidAfter': []},
    {'name': 'Millet',    'soil': ['sandy','loamy'],            'water': 'low',    'nitrogen': 'low',    'tempRange': [25,42], 'avoidAfter': []},
    {'name': 'Sorghum',   'soil': ['loamy','clay','sandy'],     'water': 'low',    'nitrogen': 'low',    'tempRange': [25,40], 'avoidAfter': []},
    {'name': 'Chickpea',  'soil': ['loamy','sandy','clay_loam'],'water': 'low',    'nitrogen': 'low',    'tempRange': [15,30], 'avoidAfter': ['chickpea']},
    {'name': 'Lentils',   'soil': ['loamy','silty','clay_loam'],'water': 'low',    'nitrogen': 'low',    'tempRange': [15,28], 'avoidAfter': ['lentils']},
    {'name': 'Groundnut', 'soil': ['sandy','loamy'],            'water': 'medium', 'nitrogen': 'low',    'tempRange': [25,38], 'avoidAfter': ['groundnut']},
    {'name': 'Soybean',   'soil': ['loamy','clay_loam','silty'],'water': 'medium', 'nitrogen': 'low',    'tempRange': [20,35], 'avoidAfter': ['soybean']},
    {'name': 'Cotton',    'soil': ['clay','clay_loam','loamy'], 'water': 'medium', 'nitrogen': 'medium', 'tempRange': [25,40], 'avoidAfter': []},
    {'name': 'Sugarcane', 'soil': ['loamy','clay_loam','clay'], 'water': 'high',   'nitrogen': 'high',   'tempRange': [20,38], 'avoidAfter': []},
    {'name': 'Sunflower', 'soil': ['loamy','sandy','silty'],    'water': 'low',    'nitrogen': 'medium', 'tempRange': [20,35], 'avoidAfter': ['sunflower']},
]

CROP_NAMES = [c['name'] for c in CROPS]

# ────────────────────────────────────────────────────────────────────────────────
# HOTSPOT INFLUENCE (mirrors TypeScript)
# ────────────────────────────────────────────────────────────────────────────────

HOTSPOTS = {
    'drought':  {'r': 1.5, 'c': 8.0},
    'disease':  {'r': 7.5, 'c': 1.5},
    'healthy':  {'r': 7.5, 'c': 8.0},
    'nitrogen': {'r': 5.0, 'c': 5.0},
}

def spatial_influence(row: float, col: float, center: dict, radius: float = 4.0) -> float:
    return max(0, 1 - math.hypot(row - center['r'], col - center['c']) / radius)


# ────────────────────────────────────────────────────────────────────────────────
# CELL GENERATION (mirrors generateGridData in TypeScript)
# ────────────────────────────────────────────────────────────────────────────────

def generate_cell(r: int, c: int, base: dict) -> dict:
    n = [sn(r, c, i + 1) for i in range(12)]

    iDrought  = spatial_influence(r, c, HOTSPOTS['drought'])
    iDisease  = spatial_influence(r, c, HOTSPOTS['disease'])
    iHealthy  = spatial_influence(r, c, HOTSPOTS['healthy'])
    iNitrogen = spatial_influence(r, c, HOTSPOTS['nitrogen'], 3)

    ndvi = round2(clamp(
        base['ndvi_mean'] - iDrought*0.25 - iDisease*0.30 + iHealthy*0.18 + (n[0]-0.5)*0.12,
        0.05, 0.95))

    evi = round2(clamp(base['evi_mean'] * (0.88 + ndvi*0.22) + (n[1]-0.5)*0.08, 0.02, 0.9))
    savi = round2(clamp(ndvi * 0.92 + (n[2]-0.5)*0.06, 0.02, 0.9))
    chlorophyll = round2(clamp(
        base['chlorophyll_index'] - iNitrogen*0.25 - iDisease*0.20 + (n[3]-0.5)*0.10,
        0.1, 0.95))

    moisture = round2(clamp(
        base['moisture_mean'] - iDrought*0.32 + iDisease*0.22 + iHealthy*0.10 + (n[4]-0.5)*0.15,
        0.08, 0.92))

    ph = round2(clamp(base['ph_mean'] + iDisease*0.6 + (n[5]-0.5)*0.6, 4.2, 8.2))
    soc = round2(clamp(base['soc_pct'] - iNitrogen*0.4 + (n[6]-0.5)*0.3, 0.4, 3.0))
    nitrogen = round(clamp(
        base['nitrogen_kg_ha'] - iNitrogen*55 - iDisease*30 + iHealthy*25 + (n[7]-0.5)*30,
        60, 250))
    phosphorus = round(clamp(base['phosphorus_kg_ha'] + (n[8]-0.5)*12, 8, 45))
    potassium = round(clamp(base['potassium_kg_ha'] - iNitrogen*20 + (n[9]-0.5)*30, 70, 200))

    texture_idx = int(n[10] * len(TEXTURE_VARIANTS)) % len(TEXTURE_VARIANTS)
    soil_texture = TEXTURE_VARIANTS[texture_idx]

    bulk_density = round2(clamp(base['bulk_density'] + (n[11]-0.5)*0.18, 1.0, 1.7))
    temperature = round2(clamp(base['temperature_c'] + iDisease*1.8 + (n[0]-0.5)*2.5, 20, 36))
    humidity = round(clamp(base['humidity_pct'] + iDisease*18 - iDrought*20 + (n[1]-0.5)*12, 25, 98))

    return {
        'ndvi': ndvi, 'evi': evi, 'savi': savi, 'chlorophyll': chlorophyll,
        'moisture': moisture, 'ph': ph, 'soc_pct': soc,
        'nitrogen': nitrogen, 'phosphorus': phosphorus, 'potassium': potassium,
        'soil_texture': soil_texture, 'soil_texture_encoded': TEXTURE_TO_INT[soil_texture],
        'bulk_density': bulk_density, 'temperature': temperature, 'humidity': humidity,
    }


# ────────────────────────────────────────────────────────────────────────────────
# ANALYSIS ENGINE (mirrors analyzeCell in TypeScript)
# ────────────────────────────────────────────────────────────────────────────────

def nutrient_level(val, low, mid, high):
    if val < low * 0.6: return 'deficient'
    if val < low:       return 'low'
    if val < mid:       return 'medium'
    if val <= high:     return 'high'
    return 'excess'

def analyze_cell(cell: dict) -> dict:
    """Compute yield + crop recommendation exactly like the TypeScript engine."""

    # Crop suitability score
    limiting = 0
    if cell['soil_texture'] == 'sandy': limiting += 25
    if cell['ph'] < 5.5 or cell['ph'] > 7.5: limiting += 20
    if cell['bulk_density'] > 1.55: limiting += 20
    if cell['moisture'] < 0.25: limiting += 25
    if cell['temperature'] > 33: limiting += 15
    suit_score = 100 - limiting

    # Yield (matches TypeScript exactly)
    MAX_YIELD = 55
    yield_factor = (
        cell['ndvi'] * 0.35 +
        cell['moisture'] * 0.25 +
        (cell['nitrogen'] / 200) * 0.20 +
        (cell['soc_pct'] / 2.5) * 0.10 +
        (suit_score / 100) * 0.10
    )
    yield_qtl = round2(clamp(yield_factor * MAX_YIELD, 8, 52))

    # Disease score (for degradation feature)
    disease_score = 0
    for d in DISEASE_TYPES:
        if cell['ndvi'] < d['ndviThresh'] and cell['humidity'] > d['humThresh']:
            disease_score += 35
    if cell['temperature'] > 30 and cell['humidity'] > 75:
        disease_score += 20
    if cell['ph'] < 5.8:
        disease_score += 10
    disease_score = min(100, disease_score)

    # Degradation
    degrad_score = 0
    if cell['soc_pct'] < 1.0: degrad_score += 30
    if cell['bulk_density'] > 1.5: degrad_score += 25
    if cell['ph'] < 5.5 or cell['ph'] > 7.8: degrad_score += 20
    if cell['ndvi'] < 0.25: degrad_score += 30

    # Crop recommendation (score-based, same as TS)
    degradation = 'critical' if degrad_score >= 80 else 'high' if degrad_score >= 60 else 'medium' if degrad_score >= 40 else 'low' if degrad_score >= 20 else 'none'

    best_crop = score_best_crop(cell, degradation)

    return {
        'yield_qtl_acre': yield_qtl,
        'suit_score': suit_score,
        'disease_score': disease_score,
        'degradation_score': degrad_score,
        'degradation': degradation,
        'best_crop': best_crop,
    }


def score_best_crop(cell: dict, degradation: str) -> str:
    """Mirrors scoreCrop() from cropRecommendation.ts."""
    best_name = 'Rice'
    best_score = -999

    for crop in CROPS:
        score = 0

        # Soil match
        if cell['soil_texture'] in crop['soil']:
            score += 20

        # Moisture match
        m = cell['moisture']
        if crop['water'] == 'high'   and m >= 0.55: score += 20
        if crop['water'] == 'medium' and 0.35 <= m < 0.65: score += 20
        if crop['water'] == 'low'    and m < 0.45: score += 20
        if crop['water'] == 'high'   and 0.40 <= m < 0.55: score += 10
        if crop['water'] == 'low'    and 0.45 <= m < 0.60: score += 10

        # Temperature match
        if crop['tempRange'][0] <= cell['temperature'] <= crop['tempRange'][1]:
            score += 20
        else:
            gap = max(crop['tempRange'][0] - cell['temperature'],
                      cell['temperature'] - crop['tempRange'][1])
            if gap <= 5:
                score += round(20 * (1 - gap / 5))

        # Nitrogen match
        n_avail = 'low' if cell['nitrogen'] < 60 else ('medium' if cell['nitrogen'] < 120 else 'high')
        if crop['nitrogen'] == n_avail:
            score += 15
        elif crop['nitrogen'] == 'medium' and n_avail in ('high', 'low'):
            score += 7

        # pH
        if 6.0 <= cell['ph'] <= 7.5: score += 10
        elif 5.5 <= cell['ph'] < 6.0: score += 6
        elif 7.5 < cell['ph'] <= 8.0: score += 5

        # Degradation penalty
        if degradation in ('high', 'critical'):
            score -= 20 if crop['water'] == 'high' else 8
        elif degradation == 'medium':
            if crop['water'] == 'high': score -= 10

        if score > best_score:
            best_score = score
            best_name = crop['name']

    return best_name


# ────────────────────────────────────────────────────────────────────────────────
# PARAMETER SWEEP
# ────────────────────────────────────────────────────────────────────────────────

def generate_dataset():
    """Sweep base parameters to create a massive training dataset."""

    # Sweep ranges
    ndvi_range     = [round(0.2 + i * 0.035, 3) for i in range(21)]     # 0.20 → 0.90
    moisture_range = [round(0.1 + i * 0.04, 2)  for i in range(21)]     # 0.10 → 0.90
    nitrogen_range = [50 + i * 22 for i in range(10)]                    # 50 → 248
    temp_range     = [18 + i * 2.2 for i in range(10)]                   # 18 → 37.8

    # Grid size per configuration (smaller for speed)
    grid_rows, grid_cols = 3, 3

    # Base template
    base_template = {
        'evi_mean': 0.51,
        'savi_mean': 0.58,
        'chlorophyll_index': 0.72,
        'sar_backscatter_vv': -8.4,
        'soil_texture': 'clay_loam',
        'ph_mean': 6.4,
        'soc_pct': 1.45,
        'phosphorus_kg_ha': 22,
        'potassium_kg_ha': 128,
        'bulk_density': 1.32,
        'cec': 24.5,
        'humidity_pct': 71,
        'et0_mm_day': 4.8,
    }

    # Output columns
    columns = [
        'ndvi', 'evi', 'savi', 'chlorophyll', 'moisture', 'ph', 'soc_pct',
        'nitrogen', 'phosphorus', 'potassium', 'soil_texture_encoded',
        'bulk_density', 'temperature', 'humidity',
        'suit_score', 'disease_score', 'degradation_score',
        'yield_qtl_acre', 'best_crop',
    ]

    os.makedirs('ml/data', exist_ok=True)
    out_path = 'ml/data/training_data.csv'

    total = 0
    with open(out_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()

        combos = list(itertools.product(
            ndvi_range[:15],       # Trim to keep ~500K rows
            moisture_range[:15],
            nitrogen_range,
            temp_range
        ))

        print(f"[DataGen] Generating {len(combos)} base configs × {grid_rows*grid_cols} cells each...")
        print(f"[DataGen] Expected rows: {len(combos) * grid_rows * grid_cols:,}")

        for idx, (ndvi_m, moist_m, nit, temp) in enumerate(combos):
            base = {**base_template,
                    'ndvi_mean': ndvi_m,
                    'moisture_mean': moist_m,
                    'nitrogen_kg_ha': nit,
                    'temperature_c': temp}

            for r in range(grid_rows):
                for c in range(grid_cols):
                    cell = generate_cell(r, c, base)
                    analysis = analyze_cell(cell)

                    row = {
                        'ndvi': cell['ndvi'],
                        'evi': cell['evi'],
                        'savi': cell['savi'],
                        'chlorophyll': cell['chlorophyll'],
                        'moisture': cell['moisture'],
                        'ph': cell['ph'],
                        'soc_pct': cell['soc_pct'],
                        'nitrogen': cell['nitrogen'],
                        'phosphorus': cell['phosphorus'],
                        'potassium': cell['potassium'],
                        'soil_texture_encoded': cell['soil_texture_encoded'],
                        'bulk_density': cell['bulk_density'],
                        'temperature': cell['temperature'],
                        'humidity': cell['humidity'],
                        'suit_score': analysis['suit_score'],
                        'disease_score': analysis['disease_score'],
                        'degradation_score': analysis['degradation_score'],
                        'yield_qtl_acre': analysis['yield_qtl_acre'],
                        'best_crop': analysis['best_crop'],
                    }
                    writer.writerow(row)
                    total += 1

            if (idx + 1) % 5000 == 0:
                print(f"  ... processed {idx+1}/{len(combos)} configs ({total:,} rows)")

    print(f"\n[DataGen] ✅ Done! Generated {total:,} rows → {out_path}")
    print(f"[DataGen] File size: {os.path.getsize(out_path) / 1024 / 1024:.1f} MB")
    return out_path


if __name__ == '__main__':
    generate_dataset()
