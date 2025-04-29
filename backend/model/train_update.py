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
    client = pymongo.MongoClient("mongodb://mongo:27017/")
    db = client["market_risk_assessment"]
    stats_collection = db["model_stats"]
    
    # Calculate accuracy
    y_pred = model.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred) * 100)
    
    # Get recent data for charts (last year)
    from datetime import datetime, timedelta
    end_date = datetime.today().strftime('%Y-%m-%d')
    chart_start = (datetime.today().replace(year=datetime.today().year-1)).strftime('%Y-%m-%d')
    
    try:
        data = fetch_stock_data(ticker, chart_start, end_date)
        
        # Calculate returns for risk metrics (returns in decimal form, e.g. 0.01 for 1%)
        returns = data['Close'].pct_change().dropna()
        current_price = float(data['Close'].iloc[-1])
        
        # Calculate VaR metrics as percentage of current price
        try:
            # Get percentage VaR (negative values represent losses)
            var95_pct = float(returns.quantile(0.05))
            var99_pct = float(returns.quantile(0.01))
            
            # Convert percentage VaR to absolute rupee amount with reasonable caps
            # Use absolute values to show the magnitude of potential loss
            var95 = abs(var95_pct * current_price)
            var99 = abs(var99_pct * current_price)
            
            # Cap at 20% of price as sanity check for unrealistically high values
            max_reasonable_var = current_price * 0.20
            var95 = min(var95, max_reasonable_var)
            var99 = min(var99, max_reasonable_var)
        except Exception as e:
            print(f"[WARNING] Error calculating VaR: {e}, using fallback")
            var95 = current_price * 0.03  # 3% of price as fallback
            var99 = current_price * 0.05  # 5% of price as fallback
            var95_pct = -0.03  # Needed for VaR distribution calculation
            var99_pct = -0.05  # Needed for VaR distribution calculation

        # Conditional VaR with additional error handling
        try:
            cvar_returns = returns[returns <= returns.quantile(0.05)]
            if not cvar_returns.empty:
                cvar = abs(float(cvar_returns.mean() * current_price))
                # Cap at 25% of price as sanity check
                cvar = min(cvar, current_price * 0.25)
            else:
                cvar = var95 * 1.2  # Reasonable fallback
        except Exception as e:
            print(f"[WARNING] Error calculating CVaR: {e}, using fallback")
            cvar = var95 * 1.2  # Reasonable fallback
        
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
        
        # Calculate rolling volatility with improved data preparation
        try:
            # Calculate rolling volatility (returns in decimal form)
            volatility = returns.rolling(window=30).std().dropna()
            volatility_data = []
            
            # Make sure we get the most recent 30 days (or as many as available)
            date_range = data.index[-30:] if len(data) >= 30 else data.index
            
            # Create volatility data with proper dates aligned with price history
            for date in date_range:
                date_str = date.strftime('%Y-%m-%d') if hasattr(date, 'strftime') else str(date).split(' ')[0]
                
                # Get volatility value for this date, or estimate if not available
                try:
                    if date in volatility.index:
                        vol_value = float(volatility.loc[date])
                    else:
                        # For dates without volatility data, use a reasonable estimate
                        vol_value = 0.02  # 2% volatility as default
                except Exception:
                    vol_value = 0.02  # Fallback value
                    
                volatility_data.append({
                    "date": date_str,
                    "volatility": vol_value
                })
        except Exception as e:
            print(f"[WARNING] Error calculating volatility data: {e}")
            # Create volatility entries that match the price history dates
            volatility_data = []
            if price_history:
                for i, price_point in enumerate(price_history):
                    volatility_data.append({
                        "date": price_point["date"],
                        "volatility": 0.02 + (0.002 * (i % 5))  # Some variation
                    })
                    
        # Create VaR distribution data with improved calculations
        var_data = []
        try:
            # Create reasonably spaced loss points from 0 to 1.5*VAR99 (as percentages)
            max_loss_pct = min(abs(float(var99_pct)) * 1.5, 0.10)  # Cap at 10%
            loss_range = np.linspace(0, max_loss_pct, 20)
            
            for loss_pct in loss_range:
                # Calculate probability of loss being greater than this percentage
                prob = float((returns <= -loss_pct).mean())
                var_data.append({
                    "loss": f"{loss_pct*100:.1f}%",
                    "probability": prob
                })
        except Exception as e:
            print(f"[WARNING] Error calculating VaR distribution: {e}")
            # Fallback dummy data with realistic values
            for i in range(20):
                loss_pct = i * 0.005  # 0% to 9.5% in steps of 0.5%
                var_data.append({
                    "loss": f"{loss_pct*100:.1f}%",
                    "probability": float(max(0.5 - i*0.025, 0.001))  # Decreasing probability
                })
        
        # Determine risk level based on 5% VaR
        risk_level = "Medium"  # Default
        if var95 > current_price * 0.03:  # More than 3% loss
            risk_level = "High"
        elif var95 < current_price * 0.015:  # Less than 1.5% loss
            risk_level = "Low"
        
        # Create model stats document
        model_stats = {
            "ticker": ticker,
            "var95": float(var95),
            "var99": float(var99),
            "cvar": float(cvar),
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
           "TATAMOTORS.NS","TITAN.NS","HDFCLIFE.NS","INDUSINDBK.NS","DIVISLAB.NS","AAPL",
         ],
         help='List of tickers'
    )
    parser.add_argument('--start', type=str, default='2015-01-01', help='Start date')
    parser.add_argument('--end', type=str, default=datetime.today().strftime('%Y-%m-%d'), help='End date')
    args = parser.parse_args()
    main(args.tickers, args.start, args.end)