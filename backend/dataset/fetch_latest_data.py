import yfinance as yf
import pandas as pd
import numpy as np
import ta
from datetime import datetime, timedelta
import pymongo
from pymongo import MongoClient
import time
from tqdm import tqdm

# MongoDB setup
client = pymongo.MongoClient("mongodb://mongo:27017/")
db = client["market_risk_assessment"]
sensex_data_collection = db["sensex_data"]

# List of Sensex companies (tickers)
sensex_companies = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "HINDUNILVR.NS", "BHARTIARTL.NS",
    "KOTAKBANK.NS", "ITC.NS", "AXISBANK.NS", "MARUTI.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS",
    "HCLTECH.NS", "LUPIN.NS", "ULTRACEMCO.NS", "NTPC.NS", "WIPRO.NS", "M&M.NS", "POWERGRID.NS",
    "SBIN.NS", "ASIANPAINT.NS", "DRREDDY.NS", "BAJAJ-AUTO.NS", "SUNPHARMA.NS", "JSWSTEEL.NS",
    "TATAMOTORS.NS", "TITAN.NS", "HDFCLIFE.NS", "INDUSINDBK.NS", "DIVISLAB.NS","^BSESN","AAPL",
]

# Define risk label assignment
def assign_risk_label(return_series):
    # Calculate 5% VaR (Value at Risk)
    var_95 = np.percentile(return_series, 5)
    # Calculate 10% VaR for medium risk threshold
    var_90 = np.percentile(return_series, 10)
    
    # Create risk labels
    risk_labels = pd.Series(index=return_series.index, dtype=str)
    
    # Assign labels
    risk_labels[return_series < var_95] = "High"
    risk_labels[(return_series >= var_95) & (return_series < var_90)] = "Medium"
    risk_labels[return_series >= var_90] = "Low"
    
    # Convert to int codes for easier storage (0=Low, 1=Medium, 2=High)
    risk_codes = pd.Series(index=return_series.index, dtype=int)
    risk_codes[risk_labels == "Low"] = 0
    risk_codes[risk_labels == "Medium"] = 1
    risk_codes[risk_labels == "High"] = 2
    
    return risk_codes, risk_labels

def fetch_data_with_retries(ticker, start_date, end_date, max_attempts=3, delay=2):
    """Fetch data with retry logic"""
    for attempt in range(max_attempts):
        try:
            data = yf.download(ticker, start=start_date, end=end_date, auto_adjust=False)
            if not data.empty:
                # Handle multi-index columns if present
                if isinstance(data.columns, pd.MultiIndex):
                    data.columns = data.columns.get_level_values(0)
                return data
            else:
                print(f"[WARNING] Empty data retrieved for {ticker}, retrying ({attempt + 1}/{max_attempts})")
        except Exception as e:
            print(f"[ERROR] Failed to fetch {ticker} on attempt {attempt + 1}: {str(e)}")
        
        if attempt < max_attempts - 1:
            time.sleep(delay)  # Wait before retrying
    
    return pd.DataFrame()  # Return empty DataFrame if all attempts fail

def compute_technical_indicators(df):
    """Calculate technical indicators safely"""
    result = df.copy()
    
    # Basic price and volume metrics
    result['Return'] = result['Close'].pct_change()
    result['MA_5'] = result['Close'].rolling(window=5).mean()
    result['MA_10'] = result['Close'].rolling(window=10).mean()
    result['MA_50'] = result['Close'].rolling(window=50).mean()
    result['MA_200'] = result['Close'].rolling(window=200).mean()
    result['STD_5'] = result['Close'].rolling(window=5).std()
    result['Range'] = result['High'] - result['Low']
    
    # Safely calculate ratio metrics
    result['Range_Ratio'] = np.where(result['Close'] != 0, 
                                     (result['High'] - result['Low']) / result['Close'], 
                                     0)
    
    result['Price_to_MA5'] = np.where(result['MA_5'] != 0, 
                                     result['Close'] / result['MA_5'] - 1, 
                                     0)
    
    result['Price_to_MA10'] = np.where(result['MA_10'] != 0, 
                                      result['Close'] / result['MA_10'] - 1, 
                                      0)
    
    # Momentum indicators
    result['Momentum'] = result['Close'] - result['Close'].shift(5)
    
    # Volume metrics
    if 'Volume' in result.columns and not result['Volume'].isna().all():
        result['Volume_Change'] = result['Volume'].pct_change()
    else:
        result['Volume_Change'] = 0
    
    # Risk metrics
    rolling_returns = result['Return'].rolling(100)
    if len(result) >= 100:
        result['VaR_95'] = rolling_returns.quantile(0.05)
    else:
        result['VaR_95'] = result['Return'].min()
    
    result['Volatility'] = result['Return'].rolling(20).std()
    
    # TA-Lib indicators (safely)
    try:
        result['RSI'] = ta.momentum.RSIIndicator(result['Close'], window=14).rsi()
        
        macd = ta.trend.MACD(result['Close'])
        result['MACD'] = macd.macd()
        result['MACD_Signal'] = macd.macd_signal()
        
        # Bollinger Bands
        ma20 = result['Close'].rolling(20).mean()
        std20 = result['Close'].rolling(20).std()
        result['BB_Upper'] = ma20 + 2 * std20
        result['BB_Lower'] = ma20 - 2 * std20
        
        # ATR
        result['ATR'] = ta.volatility.AverageTrueRange(
            result['High'], result['Low'], result['Close'], window=14
        ).average_true_range()
    except Exception as e:
        print(f"[ERROR] Failed to compute some TA indicators: {str(e)}")
    
    # Replace infinities with NaN
    result = result.replace([np.inf, -np.inf], np.nan)
    
    return result

def fetch_and_insert_data(ticker, start_date, end_date):
    now = datetime.now()
    print(f"[{now:%Y-%m-%d %H:%M:%S}] Fetching data for {ticker}...")
    
    # Fetch historical data
    df = fetch_data_with_retries(ticker, start_date, end_date)
    
    if df.empty:
        print(f"[ERROR] Could not fetch data for {ticker}. Skipping.")
        return 0
    
    # Compute technical indicators
    df = compute_technical_indicators(df)
    
    # Drop rows with NaN values and reset index
    df.dropna(inplace=True)
    df.reset_index(inplace=True)
    
    if df.empty:
        print(f"[WARNING] No valid data after processing for {ticker}. Skipping.")
        return 0
    
    # Compute risk labels (both codes and labels)
    risk_codes, risk_labels = assign_risk_label(df['Return'])
    df['Risk_Code'] = risk_codes
    df['Risk_Label'] = risk_labels
    
    # Binary risk indicator (for compatibility with your model)
    df['High_Risk'] = (df['Risk_Code'] == 2).astype(int)
    
    # Add ticker as a field
    df['Ticker'] = ticker
    
    # Check data quality
    print(f"[INFO] Data quality for {ticker}:")
    print(f"  - Rows: {len(df)}")
    print(f"  - Risk Distribution: {df['Risk_Label'].value_counts(normalize=True) * 100}")
    
    try:
        # Convert DataFrame to dictionary format for MongoDB
        data_dict = df.to_dict(orient='records')
        
        # First remove existing data for this ticker
        sensex_data_collection.delete_many({"Ticker": ticker})
        
        # Then insert new data
        if data_dict:
            result = sensex_data_collection.insert_many(data_dict)
            print(f"[{now:%Y-%m-%d %H:%M:%S}] {len(result.inserted_ids)} records for {ticker} inserted into MongoDB.")
            return len(result.inserted_ids)
        else:
            print(f"[WARNING] No data to insert for {ticker}.")
            return 0
    except Exception as e:
        print(f"[ERROR] Failed to insert data for {ticker}: {str(e)}")
        return 0

# Main execution
def main():
    # Set date range
    end_date = datetime.today().strftime('%Y-%m-%d')
    start_date = (datetime.today() - timedelta(days=365*10)).strftime('%Y-%m-%d')  # 10 years of data
    
    print(f"Fetching data from {start_date} to {end_date}")
    
    # Create index on Ticker field for faster queries
    sensex_data_collection.create_index([("Ticker", pymongo.ASCENDING)])
    
    # Fetch and insert data for all Sensex companies
    total_records = 0
    for company in tqdm(sensex_companies):
        records = fetch_and_insert_data(company, start_date, end_date)
        total_records += records
    
    print(f"Data collection complete. Total records inserted: {total_records}")

if __name__ == "__main__":
    main()