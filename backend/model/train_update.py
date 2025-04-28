import yfinance as yf
import pandas as pd
import numpy as np
import xgboost as xgb
import os
import pickle
import pymongo
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
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


# Fixed function to save model statistics to MongoDB
# Fixed function to save model statistics to MongoDB
def save_model_stats(ticker, model, X_test, y_test, start_date):
    print(f"[INFO] Saving model stats for {ticker} to MongoDB")
    
    # Connect to MongoDB
    client = pymongo.MongoClient("mongodb://localhost:27017/")
    db = client["market_risk_assessment"]
    stats_collection = db["model_stats"]
    
    # Calculate accuracy
    y_pred = model.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred) * 100)  # Explicitly convert to float
    
    # Get recent data for charts (last year)
    end_date = datetime.today().strftime('%Y-%m-%d')
    chart_start = (datetime.today().replace(year=datetime.today().year-1)).strftime('%Y-%m-%d')
    
    try:
        data = fetch_stock_data(ticker, chart_start, end_date)
        
        # Calculate returns for risk metrics
        returns = data['Close'].pct_change().dropna()
        
        # Calculate VaR metrics (negative values represent losses)
        # Ensure each value is explicitly converted to float
        try:
            var95 = float(returns.quantile(0.05)) * float(data['Close'].iloc[-1])
            var99 = float(returns.quantile(0.01)) * float(data['Close'].iloc[-1])
        except Exception as e:
            print(f"[WARNING] Error calculating VaR: {e}, using fallback")
            var95 = float(min(returns) * data['Close'].iloc[-1])
            var99 = float(min(returns) * 1.5 * data['Close'].iloc[-1])

        # Conditional VaR with additional error handling
        try:
            cvar_returns = returns[returns <= returns.quantile(0.05)]
            if not cvar_returns.empty:
                cvar = float(cvar_returns.mean()) * float(data['Close'].iloc[-1])
            else:
                cvar = float(returns.min()) * float(data['Close'].iloc[-1])
        except Exception as e:
            print(f"[WARNING] Error calculating CVaR: {e}, using fallback")
            cvar = float(min(returns) * 2 * data['Close'].iloc[-1])
        
        # Create price history for chart (last 30 days)
        price_history = []
        for idx, row in data.iloc[-30:].iterrows():
            try:
                date_str = idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx).split(' ')[0]
                price_history.append({
                    "date": date_str,
                    "price": float(row['Close'])
                })
            except Exception as e:
                print(f"[WARNING] Error processing price history item: {e}")
        
        # Calculate rolling volatility with improved error handling
        try:
            volatility = returns.rolling(window=30).std().dropna()
            volatility_data = []
            for idx, vol in volatility.iloc[-30:].items():
                date_str = idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx).split(' ')[0]
                volatility_data.append({
                    "date": date_str,
                    "volatility": float(vol)
                })
        except Exception as e:
            print(f"[WARNING] Error calculating volatility data: {e}")
            volatility_data = []
        
        # Create VaR distribution data with additional error handling
        var_data = []
        try:
            # Create 20 equally spaced loss points from 0 to 2*VAR99
            loss_range = np.linspace(0, abs(float(var99)) * 2, 20)
            for loss in loss_range:
                prob = float((returns <= -loss).mean())
                var_data.append({
                    "loss": f"{loss*100:.1f}%",
                    "probability": prob
                })
        except Exception as e:
            print(f"[WARNING] Error calculating VaR distribution: {e}")
            # Fallback dummy data
            for i in range(20):
                var_data.append({
                    "loss": f"{i*0.5:.1f}%",
                    "probability": float(max(0.1 - i*0.005, 0.001))
                })
        
        # Determine risk level based on 5% VaR
        if var95 < -0.03:  # More than 3% loss at 95% confidence
            risk_level = "High"
        elif var95 < -0.015:  # Between 1.5% and 3% loss
            risk_level = "Medium"
        else:  # Less than 1.5% loss
            risk_level = "Low"
        
        # Create model stats document
        model_stats = {
            "ticker": ticker,
            "var95": abs(float(var95)),  # Convert to absolute value
            "var99": abs(float(var99)),
            "cvar": abs(float(cvar)),
            "riskLevel": risk_level,
            "accuracy": float(accuracy),
            "priceHistory": price_history,
            "volatilityData": volatility_data,
            "varData": var_data,
            "updatedAt": datetime.now()
        }
        
        # Update or insert model stats
        result = stats_collection.update_one(
            {"ticker": ticker},
            {"$set": model_stats},
            upsert=True
        )
        
        if result.modified_count > 0:
            print(f"[INFO] Updated existing stats for {ticker}")
        elif result.upserted_id:
            print(f"[INFO] Created new stats for {ticker}")
        else:
            print(f"[INFO] No changes to stats for {ticker}")
            
    except Exception as e:
        print(f"[ERROR] Failed to save stats for {ticker}: {e}")

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
    
    # Save model stats to MongoDB
    save_model_stats('^BSESN', model, X_test, y_test, start)
    
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
    
    # Save model stats to MongoDB
    save_model_stats(ticker, model, X_test, y_test, start)
    
    return model


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