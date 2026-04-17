import pandas as pd
import numpy as np

# STRICT REQUIREMENTS: ONLY 4 columns
np.random.seed(42)
n_rows = 250

# 1. ndvi -> between 0.2 and 0.9
ndvi = np.random.uniform(0.2, 0.9, n_rows)

# 2. temperature -> between 20 and 40
temperature = np.random.uniform(20.0, 40.0, n_rows)

# 3. rainfall -> between 0 and 200
rainfall = np.random.uniform(0.0, 200.0, n_rows)

# Relationship logic:
# - Higher ndvi -> higher price
# - Moderate rainfall (50-120) -> better price
# - Very low ndvi -> low price

# Base price calculation
base = 10.0

# NDVI impact (linearly increasing up to 14 points)
ndvi_boost = ndvi * 14.0

# Rainfall impact (peak around 85, drops off smoothly outside 50-120)
# using a simple Gaussian-like or piecewise drop
# Let's say optimal is 85, stdev is 40
rain_boost = np.exp(-((rainfall - 85) ** 2) / (2 * (40 ** 2))) * 6.0

# Combine
price = base + ndvi_boost + rain_boost + np.random.normal(0, 1.0, n_rows)

# Explicitly ensure low ndvi forces low price by clipping lower bounds tightly
price = np.where(ndvi < 0.35, np.clip(price, 10.0, 15.0), price)

# Finally, ensure overall price falls between 10 and 30
price = np.clip(price, 10.0, 30.0)

# Format must be exactly: ndvi,temperature,rainfall,price
df = pd.DataFrame({
    'ndvi': ndvi,
    'temperature': temperature,
    'rainfall': rainfall,
    'price': price
})

# Save exactly formatting requirement
df.to_csv('data/final_dataset.csv', index=False)
print("Data saved successfully.")
