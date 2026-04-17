"""
Soil Intelligence Engine
------------------------
Analyzes NDVI grid data to classify soil health zones and
generate targeted fertilizer recommendations.
"""

import numpy as np


def analyze_soil_from_ndvi(ndvi_grid: np.ndarray) -> dict:
    """
    Analyzes a 2D NDVI numpy array to determine soil health zones
    and produce fertilizer recommendations.

    Parameters
    ----------
    ndvi_grid : np.ndarray
        A 2D array of NDVI values, typically in the range [0.0, 1.0].

    Returns
    -------
    dict
        A structured dictionary containing:
            - zone_stats (dict): Percentage coverage for low, medium, high zones.
            - dominant_zone (str): The zone with the highest coverage.
            - recommendation (str): Actionable fertilizer advice.
    """

    if not isinstance(ndvi_grid, np.ndarray) or ndvi_grid.ndim != 2:
        raise ValueError("ndvi_grid must be a 2D numpy array.")

    total_cells = ndvi_grid.size

    if total_cells == 0:
        raise ValueError("ndvi_grid must not be empty.")

    # --- 1. Zone Classification ---
    low_mask    = ndvi_grid < 0.3
    medium_mask = (ndvi_grid >= 0.3) & (ndvi_grid < 0.6)
    high_mask   = ndvi_grid >= 0.6

    # --- 2. Calculate Zone Percentages ---
    low_pct  = (np.sum(low_mask)    / total_cells) * 100
    mid_pct  = (np.sum(medium_mask) / total_cells) * 100
    high_pct = (np.sum(high_mask)   / total_cells) * 100

    zone_stats = {
        "low":    round(low_pct, 2),
        "medium": round(mid_pct, 2),
        "high":   round(high_pct, 2),
    }

    # --- 3. Determine Dominant Zone ---
    dominant_zone = max(zone_stats, key=zone_stats.get)

    # --- 4. Recommendation Rules ---
    if low_pct > 30:
        recommendation = (
            "High nitrogen fertilizer required (urea). Apply within 5 days."
        )
    elif mid_pct > 50:
        recommendation = (
            "Balanced NPK fertilizer recommended for optimal growth."
        )
    else:
        recommendation = (
            "Soil health is good. Maintain current fertilizer usage."
        )

    # --- 5. Return Structured Output ---
    return {
        "zone_stats":     zone_stats,
        "dominant_zone":  dominant_zone,
        "recommendation": recommendation,
    }
