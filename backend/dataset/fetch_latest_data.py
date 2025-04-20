#!pip install ta
#pip install yfinance

import yfinance as yf
import pandas as pd
import numpy as np
import ta

# Fetch full historical data for Sensex (from ~1979)
df = yf.Ticker("^BSESN").history(period="max", interval="1d")

# Basic cleanup
df = df[['Open', 'High', 'Low', 'Close', 'Volume']].copy()

# --- FEATURE ENGINEERING ---

# Daily Returns
df['Return'] = df['Close'].pct_change()

# Volatility (10-day rolling std of returns)
df['Volatility'] = df['Return'].rolling(10).std()

# Moving Averages
df['MA50'] = df['Close'].rolling(50).mean()
df['MA200'] = df['Close'].rolling(200).mean()

# Price Range (High - Low)
df['Range'] = df['High'] - df['Low']

# Volume Surge (% change in volume)
df['Volume_Surge'] = df['Volume'].pct_change()

# RSI (14-day)
df['RSI'] = ta.momentum.RSIIndicator(df['Close'], window=14).rsi()

# MACD
macd = ta.trend.MACD(df['Close'])
df['MACD'] = macd.macd()
df['MACD_Signal'] = macd.macd_signal()

# Basic Candlestick Pattern: Bearish Candle
df['Bearish'] = df['Open'] > df['Close']

# Gap Up / Down
df['Gap'] = df['Open'] - df['Close'].shift(1)

# Rolling Value at Risk (95%) using 100-day rolling window
df['VaR_95'] = df['Return'].rolling(100).apply(lambda x: np.percentile(x.dropna(), 5), raw=False)

# Bollinger Bands (20-day MA ± 2 std)
ma20 = df['Close'].rolling(20).mean()
std20 = df['Close'].rolling(20).std()
df['BB_Upper'] = ma20 + 2 * std20
df['BB_Lower'] = ma20 - 2 * std20

# Average True Range (14-day)
atr = ta.volatility.AverageTrueRange(df['High'], df['Low'], df['Close'], window=14)
df['ATR'] = atr.average_true_range()

# Drop NA rows caused by rolling indicators
df.dropna(inplace=True)

# Reset index for a clean DataFrame
df.reset_index(inplace=True)

# Preview the resulting DataFrame
print(df.head())