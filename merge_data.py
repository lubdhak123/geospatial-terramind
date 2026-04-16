import pandas as pd
import numpy as np
import os

# Ensure the data directory exists
os.makedirs('data', exist_ok=True)

# 1. Load the 3 CSV files
print("Loading CSV files...")
try:
    ndvi_df = pd.read_csv('data/ndvi_farms.csv')
    weather_df = pd.read_csv('data/weather.csv')
    mandi_df = pd.read_csv('data/mandi_prices.csv')
except FileNotFoundError as e:
    print(f"File not found error: {e}")
    print("Please ensure the data/ folder contains ndvi_farms.csv, weather.csv, and mandi_prices.csv")
    exit(1)

# 2. Merge them on "date"
print("Merging datasets...")
merged_df = pd.merge(ndvi_df, weather_df, on='date', how='outer')
merged_df = pd.merge(merged_df, mandi_df, on='date', how='outer')

# 3. Clean missing values and sort by date
print("Cleaning missing values and sorting...")
base_df = merged_df.dropna().copy()
base_df['date'] = pd.to_datetime(base_df['date'])
base_df = base_df.sort_values(by='date').reset_index(drop=True)

# 4. Simulate 50 farms
print("Simulating 50 farms with NDVI variations...")
farm_dfs = []
np.random.seed(42)

for farm_id in range(1, 51):
    farm_df = base_df.copy()
    farm_df['farm_id'] = farm_id
    
    variation = np.random.uniform(-0.05, 0.05, size=len(farm_df))
    farm_df['ndvi'] = farm_df['ndvi'] + variation
    
    peak_idx = farm_df['ndvi'].idxmax()
    farm_df['harvest_ready'] = 0
    
    is_after_peak = farm_df.index > peak_idx
    is_decreasing = farm_df['ndvi'].diff() < 0
    farm_df.loc[is_after_peak & is_decreasing, 'harvest_ready'] = 1
    
    farm_dfs.append(farm_df)

multi_farm_df = pd.concat(farm_dfs, ignore_index=True)

# 5. Calculate farm readiness volume per date
print("Calculating market dynamics...")
ready_counts = multi_farm_df.groupby('date')['harvest_ready'].sum().reset_index()
ready_counts.rename(columns={'harvest_ready': 'farms_ready'}, inplace=True)

# 6. Predict price behavior based on market supply
conditions = [
    ready_counts['farms_ready'] > 25,
    (ready_counts['farms_ready'] >= 10) & (ready_counts['farms_ready'] <= 25),
    ready_counts['farms_ready'] < 10
]
prices = [14, 18, 21]
statuses = ['CRASH', 'NORMAL', 'RECOVERY']

ready_counts['predicted_price'] = np.select(conditions, prices, default=18)
ready_counts['market_status'] = np.select(conditions, statuses, default='NORMAL')

# Combine the overall DataFrame with our market predictions
final_df = pd.merge(multi_farm_df, ready_counts, on='date', how='left')

# 7. Find best selling date
# Ignore dates where farms_ready = 0 and only consider "RECOVERY" phase
valid_dates = ready_counts[(ready_counts['farms_ready'] > 0) & (ready_counts['market_status'] == 'RECOVERY')].copy()

if valid_dates.empty:
    best_date_str = "N/A"
    best_price = "N/A"
    why = "No valid recovery dates with available harvest"
else:
    # Sort by price descending, then date ascending to pick the earliest highest price
    valid_dates = valid_dates.sort_values(by=['predicted_price', 'date'], ascending=[False, True])
    best_row = valid_dates.iloc[0]
    
    best_date = best_row['date']
    best_date_str = best_date.strftime('%Y-%m-%d') if isinstance(best_date, pd.Timestamp) else str(best_date)
    best_price = best_row['predicted_price']
    why = "Low supply, post-glut recovery phase"

# 8. Print Results clearly for demo
print("\n" + "="*50)
print("          MARKET OPPORTUNITY FORECAST")
print("="*50)
print(f"BEST SELL DATE (VALID):   {best_date_str}")
print(f"EXPECTED PRICE:           ${best_price} / unit")
print(f"WHY:                      {why}")
print("="*50 + "\n")

# 9. Save everything in final_dataset.csv
output_file = 'data/final_dataset.csv'
final_df.to_csv(output_file, index=False)
print(f"Final dataset with market models saved to {output_file}")
