# Import necessary libraries
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from xgboost import XGBClassifier
import os
import joblib # For saving the model and scaler

print(f"Script started at {pd.Timestamp.now()}") # Log start time

# --- 1. Configuration ---
# Define file paths
DATASET_PATH = r'C:\Users\anuvr\Documents\caps\VolatiSense\backend\dataset\sensex_data.csv' # Use raw string
MODEL_PATH = r'C:\Users\anuvr\Documents\caps\VolatiSense\backend\model\xgb_market_risk.pkl'
SCALER_PATH = r'C:\Users\anuvr\Documents\caps\VolatiSense\backend\model\scaler.pkl'
N_SPLITS_CV = 5 # Number of folds for cross-validation

# List of features to use
# Make sure these columns actually exist in your sensex_data.csv!
features = ['Volatility', 'MA50', 'MA200', 'Range', 'Volume_Surge', 'RSI',
            'MACD', 'MACD_Signal', 'Gap', 'VaR_95', 'BB_Upper', 'BB_Lower', 'ATR']

# XGBoost Hyperparameter Grid for GridSearchCV
param_grid = {
    'n_estimators': [100, 200],        # Number of boosting rounds
    'max_depth': [3, 5, 7],           # Maximum depth of a tree
    'learning_rate': [0.01, 0.1],    # Step size shrinkage
    'subsample': [0.8, 1.0],          # Fraction of samples used for fitting the trees
    'colsample_bytree': [0.8, 1.0]    # Fraction of features used per tree
}

# --- 2. Load the Dataset ---
print(f"\nLoading dataset from: {DATASET_PATH}")
try:
    df = pd.read_csv(DATASET_PATH)
    print(f"Successfully loaded dataset. Shape: {df.shape}")
    # print("Available columns:", df.columns.tolist()) # Optional: uncomment to check columns
except FileNotFoundError:
    print(f"Error: The file was not found at {DATASET_PATH}")
    exit()
except Exception as e:
    print(f"An error occurred while loading the dataset: {e}")
    exit()

# --- 3. Feature Engineering & Target Definition ---
print("\nDefining target variable 'High_Risk'...")
required_target_cols = ['Return', 'VaR_95']
if not all(col in df.columns for col in required_target_cols):
    print(f"Error: Missing one or more required columns for target calculation: {required_target_cols}")
    print(f"Available columns: {df.columns.tolist()}")
    exit()

try:
    # Ensure target-related columns are numeric, coerce errors to NaN
    df['Return'] = pd.to_numeric(df['Return'], errors='coerce')
    df['VaR_95'] = pd.to_numeric(df['VaR_95'], errors='coerce')

    # Drop rows where essential columns for target calculation became NaN
    initial_rows = len(df)
    df.dropna(subset=required_target_cols, inplace=True)
    if len(df) < initial_rows:
        print(f"Dropped {initial_rows - len(df)} rows due to non-numeric 'Return' or 'VaR_95'.")

    # Define the target variable
    df['High_Risk'] = (df['Return'] < df['VaR_95']).astype(int)
    print(f"Target 'High_Risk' created. Value counts:\n{df['High_Risk'].value_counts()}")

except Exception as e:
     print(f"An error occurred during target creation: {e}")
     exit()

# --- 4. Preprocessing ---
print("\nPreprocessing features...")
# Check if all specified feature columns exist
missing_features = [f for f in features if f not in df.columns]
if missing_features:
    print(f"\nError: The following feature columns are missing in the dataset: {missing_features}")
    print(f"Available columns are: {df.columns.tolist()}")
    exit()

# Convert feature columns to numeric, coercing errors to NaN
for col in features:
     df[col] = pd.to_numeric(df[col], errors='coerce')

# Replace inf/-inf with NaN
df[features] = df[features].replace([np.inf, -np.inf], np.nan)

# Handle missing values (NaNs) in features using forward fill then backward fill
initial_nan_counts = df[features].isnull().sum().sum()
df[features] = df[features].ffill().bfill()
final_nan_counts = df[features].isnull().sum().sum()
if initial_nan_counts > 0:
    print(f"Handled NaNs in features using ffill/bfill. Initial NaNs: {initial_nan_counts}, Final NaNs: {final_nan_counts}")
if final_nan_counts > 0:
     print(f"Warning: {final_nan_counts} NaNs remain in features after imputation. Consider dropping rows or alternative imputation.")
     # Optional: df.dropna(subset=features, inplace=True)
     # Optional: exit()

# Scale the features
print("Scaling features using StandardScaler...")
scaler = StandardScaler()
try:
    # Ensure data is purely numeric before scaling
    if not all(df[f].dtype in [np.float64, np.int64, np.float32, np.int32] for f in features):
         print("Error: Non-numeric data types detected in features before scaling.")
         print(df[features].dtypes)
         exit()
    df[features] = scaler.fit_transform(df[features])
    print("Features successfully scaled.")
except Exception as e:
    print(f"\nError during feature scaling: {e}")
    print("Check data types and presence of NaNs/Infs in feature columns before scaling.")
    print(df[features].info())
    print(df[features].isnull().sum())
    exit()

# --- 5. Data Splitting ---
# Define features (X) and target (y) after preprocessing
X = df[features]
y = df['High_Risk']

# Check for sufficient samples for stratified split
min_class_count = y.value_counts().min()
n_splits_actual = N_SPLITS_CV
if min_class_count < n_splits_actual:
    print(f"\nWarning: Smallest class has only {min_class_count} samples, less than CV splits ({n_splits_actual}).")
    if min_class_count > 1:
         n_splits_actual = min_class_count
         print(f"Adjusting StratifiedKFold n_splits to {n_splits_actual}")
    else:
         print("Error: Cannot perform stratified split with only 1 sample in the smallest class.")
         exit()

# Split data into training and testing sets (80/20)
# We still need the training set for GridSearchCV
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
print(f"\nData split into training ({X_train.shape[0]} samples) and testing ({X_test.shape[0]} samples).")
print(f"Training target distribution:\n{y_train.value_counts(normalize=True)}")

# --- 6. Model Training and Hyperparameter Tuning ---
print(f"\nStarting XGBoost training with GridSearchCV (CV splits={n_splits_actual})...")

# Stratified K-Fold Cross-validation
cv = StratifiedKFold(n_splits=n_splits_actual, shuffle=True, random_state=42)

# XGBoost classifier
xgb_clf = XGBClassifier(eval_metric='logloss', random_state=42, use_label_encoder=False)

# GridSearchCV setup
grid_search = GridSearchCV(
    estimator=xgb_clf,
    param_grid=param_grid,
    scoring='f1',        # Optimize for F1-score
    cv=cv,
    n_jobs=-1,           # Use all available CPU cores
    verbose=1            # Show progress
)

# Fit GridSearchCV to the training data
grid_search.fit(X_train, y_train)

# Get the best estimator (model) found by GridSearchCV
best_xgb = grid_search.best_estimator_

print("\nGridSearchCV training finished.")
print("Best Parameters found:", grid_search.best_params_)
print("Best F1-score during CV:", grid_search.best_score_)

# --- 7. Save Scaler and Trained Model ---
print("\nSaving the scaler and the best trained model...")

# Ensure the target directory exists
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True) # Also ensures dir exists for scaler if same dir

# Save the scaler
try:
    joblib.dump(scaler, SCALER_PATH)
    print(f"Saved scaler object to {SCALER_PATH}")
except Exception as e:
    print(f"Error saving scaler: {e}")

# Save the best model
try:
    joblib.dump(best_xgb, MODEL_PATH)
    print(f"Saved tuned XGBoost model to {MODEL_PATH}")
except Exception as e:
    print(f"Error saving model: {e}")

print(f"\nScript finished successfully at {pd.Timestamp.now()}. Model file updated.")