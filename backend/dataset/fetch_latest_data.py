#!pip install ta
# pip install yfinance

import yfinance as yf
import pandas as pd
import numpy as np
import ta
from datetime import datetime

# Path to your CSV
DATA_PATH = r'C:\Users\anuvr\Documents\caps\VolatiSense\backend\dataset\sensex_data.csv'

def update_dataset():
    now = datetime.now()
    print(f"[{now:%Y-%m-%d %H:%M:%S}] Starting full update…")

    # 1) Fetch raw full history
    df = (
        yf.Ticker("^BSESN")
          .history(period="max", interval="1d")
          [['Open','High','Low','Close','Volume']]
          .copy()
    )

    # 2) Feature engineering
    df['Return']        = df['Close'].pct_change()
    df['Volatility']    = df['Return'].rolling(10).std()
    df['MA50']          = df['Close'].rolling(50).mean()
    df['MA200']         = df['Close'].rolling(200).mean()
    df['Range']         = df['High'] - df['Low']
    df['Volume_Surge']  = df['Volume'].pct_change()
    df['RSI']           = ta.momentum.RSIIndicator(df['Close'], window=14).rsi()
    macd                = ta.trend.MACD(df['Close'])
    df['MACD']          = macd.macd()
    df['MACD_Signal']   = macd.macd_signal()
    df['Bearish']       = df['Open'] > df['Close']
    df['Gap']           = df['Open'] - df['Close'].shift(1)
    df['VaR_95']        = df['Return'].rolling(100)\
                                .apply(lambda x: np.percentile(x.dropna(), 5), raw=False)
    ma20                = df['Close'].rolling(20).mean()
    std20               = df['Close'].rolling(20).std()
    df['BB_Upper']      = ma20 + 2 * std20
    df['BB_Lower']      = ma20 - 2 * std20
    df['ATR']           = ta.volatility.AverageTrueRange(
                             df['High'], df['Low'], df['Close'], window=14
                         ).average_true_range()

    # 3) Clean & save
    df.dropna(inplace=True)
    df.reset_index(inplace=True)
    df.to_csv(DATA_PATH, index=False)

    print(f"[{now:%Y-%m-%d %H:%M:%S}] Update complete; saved to {DATA_PATH}")

if __name__ == "__main__":
    update_dataset()
