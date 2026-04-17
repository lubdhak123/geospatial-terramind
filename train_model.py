import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

# Ensure the model directory exists before saving
os.makedirs('model', exist_ok=True)

# Load dataset
df = pd.read_csv('data/final_dataset.csv')

# Split dataset
X = df[['ndvi', 'temperature', 'rainfall']]
y = df['price']

# Initialize and train model
model = RandomForestRegressor(n_estimators=50, random_state=42)
model.fit(X, y)

# Save the trained model
joblib.dump(model, 'model/price_model.pkl')

print("Model trained and saved successfully")
