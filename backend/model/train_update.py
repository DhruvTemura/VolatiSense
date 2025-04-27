import yfinance as yf
import pandas as pd
import numpy as np
import xgboost as xgb
import os
import pickle
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from datetime import datetime
import warnings
import argparse

warnings.filterwarnings("ignore")

# Helper Functions
def fetch_stock_data(ticker, start, end):
    # Fetch data without auto-adjust
    data = yf.download(ticker, start=start, end=end, auto_adjust=False)
    if data.empty:
        raise ValueError(f"No data fetched for {ticker} between {start} and {end}.")
    return data


def compute_rsi(series, window=14):
    delta = series.diff()
    gain = delta.where(delta > 0, 0).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def compute_macd(series):
    exp1 = series.ewm(span=12, adjust=False).mean()
    exp2 = series.ewm(span=26, adjust=False).mean()
    macd = exp1 - exp2
    signal = macd.ewm(span=9, adjust=False).mean()
    return macd, signal


def engineer_features(data):
    # Use Close price for all calculations
    price_col = 'Close'

    # Basic returns and volatility
    data['Return'] = data[price_col].pct_change()
    data['Volatility'] = data['Return'].rolling(window=5).std()

    # Moving averages
    data['SMA_5'] = data[price_col].rolling(window=5).mean()
    data['SMA_10'] = data[price_col].rolling(window=10).mean()
    data['EMA_5'] = data[price_col].ewm(span=5, adjust=False).mean()
    data['EMA_10'] = data[price_col].ewm(span=10, adjust=False).mean()

    # Momentum and trend indicators
    data['MACD'], data['MACD_Signal'] = compute_macd(data[price_col])
    data['RSI'] = compute_rsi(data[price_col])

    # Drop any rows with NaNs
    data = data.dropna()
    return data


def label_risk(data):
    # Label based on VaR quantiles (5% high, 10% medium)
    q05 = data['Return'].quantile(0.05)
    q10 = data['Return'].quantile(0.10)
    conditions = [
        data['Return'] < q05,
        (data['Return'] >= q05) & (data['Return'] < q10),
        data['Return'] >= q10
    ]
    # 2=High risk, 1=Medium risk, 0=Low risk
    choices = [2, 1, 0]
    data['Risk'] = np.select(conditions, choices)
    return data

# Training Functions
def train_baseline_model(start, end):
    print(f"[INFO] Training baseline model on ^BSESN from {start} to {end}")
    data = fetch_stock_data('^BSESN', start, end)
    data = engineer_features(data)
    data = label_risk(data)

    feature_cols = [c for c in data.columns if c not in ['Risk']]
    X = data[feature_cols]
    y = data['Risk']

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, stratify=y, random_state=42
    )

    model = xgb.XGBClassifier(objective='multi:softmax', num_class=3, eval_metric='mlogloss')
    model.fit(X_train, y_train)

    # Save baseline model and scaler
    baseline_dir = os.path.normpath(
        os.path.join(os.path.dirname(__file__), '..', 'model', 'baseline')
    )
    os.makedirs(baseline_dir, exist_ok=True)
    with open(os.path.join(baseline_dir, 'baseline_model.pkl'), 'wb') as f:
        pickle.dump(model, f)
    with open(os.path.join(baseline_dir, 'scaler.pkl'), 'wb') as f:
        pickle.dump(scaler, f)

    print(f"[INFO] Baseline artifacts saved to {baseline_dir}")
    return model, scaler


def train_company_model(ticker, baseline_model, scaler, start, end):
    print(f"[INFO] Training model for {ticker}")
    data = fetch_stock_data(ticker, start, end)
    data = engineer_features(data)
    data = label_risk(data)

    feature_cols = [c for c in data.columns if c not in ['Risk']]
    X = data[feature_cols]
    y = data['Risk']

    # Transform or refit scaler
    try:
        X_scaled = scaler.transform(X)
    except ValueError:
        print(f"[WARNING] Feature mismatch for {ticker}, refitting scaler")
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, stratify=y, random_state=42
    )

    model = xgb.XGBClassifier(objective='multi:softmax', num_class=3, eval_metric='mlogloss')
    model.fit(X_train, y_train)

    # Save company model and scaler
    company_dir = os.path.normpath(
        os.path.join(os.path.dirname(__file__), '..', 'model', 'models', ticker)
    )
    os.makedirs(company_dir, exist_ok=True)
    with open(os.path.join(company_dir, 'model.pkl'), 'wb') as f:
        pickle.dump(model, f)
    with open(os.path.join(company_dir, 'scaler.pkl'), 'wb') as f:
        pickle.dump(scaler, f)

    print(f"[INFO] Artifacts for {ticker} saved to {company_dir}")

# Main Execution
def main(tickers, start, end):
    try:
        baseline_model, scaler = train_baseline_model(start, end)
        for ticker in tickers:
            try:
                train_company_model(ticker, baseline_model, scaler, start, end)
            except Exception as e:
                print(f"[ERROR] Failed model for {ticker}: {e}")
        print("[INFO] All company models trained successfully.")
    except Exception as e:
        print(f"[ERROR] Training aborted: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--tickers', nargs='+',
         default=[
           "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","HINDUNILVR.NS","BHARTIARTL.NS",
           "KOTAKBANK.NS","ITC.NS","AXISBANK.NS","MARUTI.NS","BAJFINANCE.NS","BAJAJFINSV.NS",
           "HCLTECH.NS","LUPIN.NS","ULTRACEMCO.NS","NTPC.NS","WIPRO.NS","M&M.NS","POWERGRID.NS",
           "SBIN.NS","ASIANPAINT.NS","DRREDDY.NS","BAJAJ-AUTO.NS","SUNPHARMA.NS","JSWSTEEL.NS",
           "TATAMOTORS.NS","TITAN.NS","HDFCLIFE.NS","INDUSINDBK.NS","DIVISLAB.NS"
         ],
         help='List of tickers'
    )
    parser.add_argument('--start', type=str, default='2015-01-01', help='Start date')
    parser.add_argument('--end', type=str, default=datetime.today().strftime('%Y-%m-%d'), help='End date')
    args = parser.parse_args()
    main(args.tickers, args.start, args.end)
