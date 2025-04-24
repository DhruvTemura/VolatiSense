import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from xgboost import XGBClassifier
import joblib
import os
import warnings
warnings.filterwarnings("ignore")

# Define risk label assignment using VaR-based approach
def assign_risk_label(return_series):
    # Calculate 5% VaR (Value at Risk)
    var_95 = np.percentile(return_series, 5)
    # Calculate 10% VaR for medium risk threshold
    var_90 = np.percentile(return_series, 10)
    
    # Create risk labels
    risk_labels = pd.Series(index=return_series.index, dtype=str)
    
    # Assign labels directly without np.select
    risk_labels[return_series < var_95] = "High"
    risk_labels[(return_series >= var_95) & (return_series < var_90)] = "Medium"
    risk_labels[return_series >= var_90] = "Low"
    
    return risk_labels

# Retry logic for fetching data with updated parameters
def fetch_data_with_retries(ticker, start, end, max_attempts=3):
    for attempt in range(max_attempts):
        print(f"[INFO] Attempt {attempt + 1} to fetch data for {ticker}")
        try:
            # Set auto_adjust=False to ensure we get Close prices
            data = yf.download(ticker, start=start, end=end, auto_adjust=False)
            if not data.empty:
                # Handle multi-index columns if present
                if isinstance(data.columns, pd.MultiIndex):
                    print(f"[INFO] Multi-index detected for {ticker}, flattening columns")
                    # Extract only the first level if it's a multi-index
                    data.columns = data.columns.get_level_values(0)
                return data
        except Exception as e:
            print(f"[WARNING] Error downloading {ticker}: {str(e)}")
    return pd.DataFrame()

# Fixed RSI calculation
def compute_rsi(price_series, period=14):
    # Convert to float to avoid any potential issues
    price_series = price_series.astype(float)
    
    # Calculate daily price changes
    delta = price_series.diff()
    
    # Separate gains and losses
    gain = delta.copy()
    loss = delta.copy()
    gain[gain < 0] = 0
    loss[loss > 0] = 0
    loss = abs(loss)
    
    # Calculate average gains and losses
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    
    # Calculate RS and RSI, handling division by zero
    rs = pd.Series(0, index=price_series.index)
    valid_indexes = avg_loss != 0
    rs[valid_indexes] = avg_gain[valid_indexes] / avg_loss[valid_indexes]
    
    rsi = 100 - (100 / (1 + rs))
    return rsi

# Handle infinite values
def clean_infinite_values(df):
    """Replace infinite values with NaN and then fill them"""
    # First report if there are any infinite values
    inf_check = np.isinf(df).any().any()
    if inf_check:
        # Find columns with infinity
        inf_cols = df.columns[np.isinf(df).any()].tolist()
        print(f"[WARNING] Columns with infinity values: {inf_cols}")
        
        # Replace inf with NaN
        df = df.replace([np.inf, -np.inf], np.nan)
    
    # Check for remaining NaN values
    if df.isna().any().any():
        nan_cols = df.columns[df.isna().any()].tolist()
        print(f"[WARNING] Columns with NaN values: {nan_cols}")
        
        # Fill NaN values with column medians (more robust than mean)
        for col in nan_cols:
            df[col] = df[col].fillna(df[col].median())
    
    return df

# Feature engineering with updated field references
def add_technical_indicators(df):
    print(f"[DEBUG] Columns before processing: {df.columns.tolist()}")
    
    # Use Close instead of Adj Close for all calculations
    df['Return'] = df['Close'].pct_change()
    df['MA_5'] = df['Close'].rolling(window=5).mean()
    df['MA_10'] = df['Close'].rolling(window=10).mean()
    df['STD_5'] = df['Close'].rolling(window=5).std()
    df['Momentum'] = df['Close'] - df['Close'].shift(5)
    
    # Calculate RSI with the fixed function
    df['RSI'] = compute_rsi(df['Close'])
    
    # Additional features for better risk assessment
    # For VaR_95, ensure we have enough data points
    rolling_returns = df['Return'].rolling(100)
    if len(df) >= 100:
        df['VaR_95'] = rolling_returns.quantile(0.05)
    else:
        print(f"[WARNING] Not enough data points for VaR calculation, using min value")
        df['VaR_95'] = df['Return'].min()
    
    df['Volatility'] = df['Return'].rolling(20).std()
    
    # SAFER: Avoid division by zero in range ratio
    df['Range_Ratio'] = np.where(df['Close'] != 0, 
                               (df['High'] - df['Low']) / df['Close'], 
                               0)
    
    # Handle potential NaN in Volume
    if 'Volume' in df.columns and not df['Volume'].isna().all():
        df['Volume_Change'] = df['Volume'].pct_change()
    else:
        print("[WARNING] Volume data not available, setting Volume_Change to 0")
        df['Volume_Change'] = 0
    
    # SAFER: Price relative to moving averages
    df['Price_to_MA5'] = np.where(df['MA_5'] != 0, 
                                df['Close'] / df['MA_5'] - 1, 
                                0)
    
    df['Price_to_MA10'] = np.where(df['MA_10'] != 0, 
                                 df['Close'] / df['MA_10'] - 1, 
                                 0)
    
    # Handle any infinities that may have been created during calculation
    df = clean_infinite_values(df)
    
    # Drop rows with NaN values
    df.dropna(inplace=True)
    
    print(f"[DEBUG] Columns after processing: {df.columns.tolist()}")
    print(f"[DEBUG] Data types: {df.dtypes}")
    
    return df

# Prepare training data with updated feature list
def prepare_features(df):
    features = [
        'Return', 'MA_5', 'MA_10', 'STD_5', 'Momentum', 'RSI',
        'VaR_95', 'Volatility', 'Range_Ratio', 'Volume_Change',
        'Price_to_MA5', 'Price_to_MA10'
    ]
    
    # Make sure all features exist in the dataframe
    available_features = [f for f in features if f in df.columns]
    
    if len(available_features) < len(features):
        missing = set(features) - set(available_features)
        print(f"[WARNING] Missing features: {missing}")
    
    # Clean data before processing
    df = df.dropna()
    X = df[available_features]
    
    # Final check for infinity values
    X = clean_infinite_values(X)
    
    # Ensure all features are float type
    for col in X.columns:
        X[col] = X[col].astype(float)
    
    y = assign_risk_label(df['Return'])
    
    # Print summary of X and y
    print(f"[DEBUG] X shape: {X.shape}, dtypes: {X.dtypes.unique()}")
    print(f"[DEBUG] y shape: {y.shape}, dtype: {y.dtype}")
    
    return X, y

# Model saving paths
model_dir = "backend/model/models"
os.makedirs(model_dir, exist_ok=True)

# Date range
start_date = "2015-01-01"
end_date = datetime.today().strftime('%Y-%m-%d')

def main():
    # 1. Train baseline model on ^BSESN
    print("\n[STEP 1] Training baseline model on ^BSESN...")
    baseline_data = fetch_data_with_retries("^BSESN", start_date, end_date)

    if baseline_data.empty:
        raise ValueError("No data found for ^BSESN")

    # Print data shape before processing
    print(f"[INFO] Raw data shape: {baseline_data.shape}")
    print(f"[INFO] Columns available: {baseline_data.columns.tolist()}")
    print(f"[INFO] First few rows:")
    print(baseline_data.head())
    
    # Process data
    baseline_data = add_technical_indicators(baseline_data)
    print(f"[INFO] Processed data shape: {baseline_data.shape}")
    
    # Prepare features and target
    X, y = prepare_features(baseline_data)
    print(f"[INFO] Feature matrix shape: {X.shape}")
    print(f"[INFO] Target vector shape: {y.shape}")

    # Verify the risk distribution
    risk_distribution = y.value_counts(normalize=True) * 100
    print(f"\nRisk Distribution in Training Data:")
    for risk_category, percentage in risk_distribution.items():
        print(f"  {risk_category}: {percentage:.2f}%")

    # Handle class imbalance by setting class_weight
    class_counts = y.value_counts()
    total = len(y)
    class_weights = {i: total / (len(class_counts) * count) for i, count in enumerate(class_counts)}
    print(f"Class weights: {class_weights}")

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, stratify=y, random_state=42
    )

    # Map string labels to numeric for XGBoost
    label_mapping = {"Low": 0, "Medium": 1, "High": 2}
    y_train_numeric = y_train.map(label_mapping)
    y_test_numeric = y_test.map(label_mapping)

    # Train baseline model with multi-class configuration and class weights
    model = XGBClassifier(
        objective='multi:softmax', 
        num_class=3, 
        eval_metric='mlogloss',
        n_estimators=200,
        learning_rate=0.1,
        max_depth=6,
        scale_pos_weight=class_weights[1]/class_weights[0],  # Adjust for class imbalance
        use_label_encoder=False  # Avoid warning
    )
    model.fit(X_train, y_train_numeric)

    y_pred = model.predict(X_test)
    
    # Map numeric predictions back to string labels for reporting
    y_pred_labels = pd.Series(y_pred).map({0: "Low", 1: "Medium", 2: "High"})
    
    print("\n[BASELINE MODEL RESULTS]")
    print(classification_report(y_test, y_pred_labels))
    print("Model Accuracy:", accuracy_score(y_test, y_pred_labels))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test_numeric, y_pred))

    # Save baseline model and scaler
    print("\n[INFO] Saving baseline model and scaler...")
    joblib.dump(model, os.path.join(model_dir, "baseline_model.pkl"))
    joblib.dump(scaler, os.path.join(model_dir, "baseline_scaler.pkl"))
    
    # Also save the label mapping
    joblib.dump(label_mapping, os.path.join(model_dir, "label_mapping.pkl"))

    # 2. Fine-tune model for each Sensex company using transfer learning
    sensex_tickers = [
        "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS", "LT.NS",
        "SBIN.NS", "BHARTIARTL.NS", "ASIANPAINT.NS", "HINDUNILVR.NS", "BAJFINANCE.NS",
        "KOTAKBANK.NS", "ITC.NS", "SUNPHARMA.NS", "ULTRACEMCO.NS", "WIPRO.NS",
        "HCLTECH.NS", "TECHM.NS", "TITAN.NS", "POWERGRID.NS", "NTPC.NS", "TATAMOTORS.NS",
        "AXISBANK.NS", "MARUTI.NS", "HINDALCO.NS", "NESTLEIND.NS", "JSWSTEEL.NS",
        "COALINDIA.NS", "BAJAJFINSV.NS", "DRREDDY.NS"
    ]

    print("\n[STEP 2] Fine-tuning models for Sensex companies using transfer learning...")

    results_summary = {}

    for ticker in sensex_tickers:
        print(f"\n[FINE-TUNE] {ticker}")
        try:
            company_data = fetch_data_with_retries(ticker, start_date, end_date)
            if company_data.empty:
                print(f"[WARNING] No data for {ticker}, skipping...")
                continue

            # Process company data
            company_data = add_technical_indicators(company_data)
            X_c, y_c = prepare_features(company_data)
            
            # Check risk distribution for this company
            risk_dist = y_c.value_counts(normalize=True) * 100
            print(f"Risk Distribution for {ticker}:")
            for risk_category, percentage in risk_dist.items():
                print(f"  {risk_category}: {percentage:.2f}%")
            
            # Map labels for XGBoost
            y_c_numeric = y_c.map(label_mapping)
            
            X_c_scaled = scaler.transform(X_c)
            
            # Train-test split for company data
            X_c_train, X_c_test, y_c_train, y_c_test = train_test_split(
                X_c_scaled, y_c_numeric, test_size=0.2, stratify=y_c_numeric, random_state=42
            )

            # Create a new model instance for fine-tuning
            company_model = XGBClassifier(
                objective='multi:softmax', 
                num_class=3, 
                eval_metric='mlogloss',
                n_estimators=200,
                learning_rate=0.05,  # Lower learning rate for fine-tuning
                max_depth=6,
                use_label_encoder=False
            )
            
            # Initialize with baseline model
            company_model.fit(
                X_c_train, 
                y_c_train,
                xgb_model=model.get_booster()  # This uses the baseline model as a starting point
            )
            
            # Evaluate fine-tuned model
            y_c_pred = company_model.predict(X_c_test)
            acc = accuracy_score(y_c_test, y_c_pred)
            print(f"[RESULTS] {ticker} Model Accuracy: {acc:.4f}")
            
            # Map numeric predictions back to string labels for reporting
            y_c_test_labels = pd.Series(y_c_test).map({0: "Low", 1: "Medium", 2: "High"})
            y_c_pred_labels = pd.Series(y_c_pred).map({0: "Low", 1: "Medium", 2: "High"})
            print(classification_report(y_c_test_labels, y_c_pred_labels))

            # Save company-specific model
            joblib.dump(company_model, os.path.join(model_dir, f"{ticker}_model.pkl"))
            results_summary[ticker] = acc
            print(f"[SUCCESS] Trained and saved model for {ticker}")
            
        except Exception as e:
            print(f"[ERROR] Failed for {ticker}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Print summary of all company models
    print("\n[SUMMARY] Model Accuracy Results:")
    for ticker, acc in sorted(results_summary.items(), key=lambda x: x[1], reverse=True):
        print(f"{ticker}: {acc:.4f}")
    
    print("\n[COMPLETE] All models trained and saved successfully.")

if __name__ == "__main__":
    main()