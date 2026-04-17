"""
Soil Utility Functions
----------------------
Grid-level NDVI zone mapping and summary tools for the
Soil Intelligence Engine.
"""

import numpy as np


def generate_zone_map(ndvi_grid: np.ndarray) -> np.ndarray:
    """
    Converts a 2D NDVI array into a zone classification map.

    Zone encoding:
        0 = Low health    (NDVI < 0.3)
        1 = Medium health (0.3 <= NDVI < 0.6)
        2 = High health   (NDVI >= 0.6)

    Parameters
    ----------
    ndvi_grid : np.ndarray
        A 2D numpy array of NDVI values in range [0.0, 1.0].

    Returns
    -------
    np.ndarray
        Integer array of same shape as ndvi_grid with zone labels (0, 1, 2).
    """
    if not isinstance(ndvi_grid, np.ndarray) or ndvi_grid.ndim != 2:
        raise ValueError("ndvi_grid must be a 2D numpy array.")

    # Start all cells at 0 (low), then upgrade using vectorized masking
    zone_map = np.zeros(ndvi_grid.shape, dtype=np.int8)
    zone_map[ndvi_grid >= 0.3] = 1   # Medium
    zone_map[ndvi_grid >= 0.6] = 2   # High (overwrites medium where applicable)

    return zone_map


def summarize_zone_map(zone_map: np.ndarray) -> dict:
    """
    Computes percentage coverage of each zone in a classification map.

    Parameters
    ----------
    zone_map : np.ndarray
        A 2D integer array produced by generate_zone_map(), with values 0, 1, or 2.

    Returns
    -------
    dict
        Percentage of each zone:
        {
            "low":    float,   # % of cells with zone 0
            "medium": float,   # % of cells with zone 1
            "high":   float,   # % of cells with zone 2
        }
    """
    if not isinstance(zone_map, np.ndarray) or zone_map.ndim != 2:
        raise ValueError("zone_map must be a 2D numpy array.")

    total = zone_map.size

    if total == 0:
        raise ValueError("zone_map must not be empty.")

    low_pct    = round((np.sum(zone_map == 0) / total) * 100, 2)
    medium_pct = round((np.sum(zone_map == 1) / total) * 100, 2)
    high_pct   = round((np.sum(zone_map == 2) / total) * 100, 2)

    return {
        "low":    low_pct,
        "medium": medium_pct,
        "high":   high_pct,
    }
