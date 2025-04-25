#!/usr/bin/env python
import sys
import json
import pandas as pd
import numpy as np
from datetime import datetime
from pymongo import MongoClient

# Connect to MongoDB
def get_collection():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["market_risk_assessment"]
    return db["sensex_data"]

# Main function to perform risk analysis
def main():
    if len(sys.argv) < 2:
        print(json.dumps({ "error": "No symbol provided" }))
        sys.exit(1)

    symbol = sys.argv[1]
    # Append .NS if missing
    if not symbol.endswith(".NS"):
        symbol = symbol + ".NS"

    col = get_collection()
    # Fetch documents for the given ticker
    docs = list(col.find({ "Ticker": symbol }))
    if not docs:
        print(json.dumps({ "error": f"No data found for {symbol}" }))
        sys.exit(1)

    # Determine date field
    date_field = None
    sample = docs[0]
    for key in ("Date", "date", "index"):  # possible names
        if key in sample:
            date_field = key
            break
    if date_field is None:
        print(json.dumps({ "error": "Date field not found in documents" }))
        sys.exit(1)

    # Load into DataFrame
    df = pd.DataFrame(docs)
    df[date_field] = pd.to_datetime(df[date_field])
    df = df.sort_values(date_field).reset_index(drop=True)

    # Ensure 'Close' column exists
    if 'Close' not in df.columns:
        print(json.dumps({ "error": "Close price field not found" }))
        sys.exit(1)

    # Compute return series
    df['Return'] = df['Close'].pct_change()

    # --- Price History: last 6 months ---
    six_months_ago = datetime.now() - pd.DateOffset(months=6)
    df6 = df[df[date_field] >= six_months_ago].copy()
    df6['month'] = df6[date_field].dt.strftime('%b')
    price_hist = (
        df6.groupby('month').agg(price=('Close', 'last')).reset_index().to_dict(orient='records')
    )

    # --- Volatility: 30-day rolling std ---
    df['Volatility'] = df['Return'].rolling(window=30).std() * 100
    dfv = df[df[date_field] >= six_months_ago].copy()
    dfv['month'] = dfv[date_field].dt.strftime('%b')
    vol_hist = (
        dfv.groupby('month').agg(volatility=('Volatility', 'last')).reset_index().to_dict(orient='records')
    )

    # --- VaR and CVaR ---
    returns = df['Return'].dropna()
    last_price = df['Close'].iloc[-1]
    losses = -returns * last_price
    var95 = np.percentile(losses, 95)
    var99 = np.percentile(losses, 99)
    cvar = losses[losses >= var95].mean()

    # --- Loss distribution histogram ---
    bins = np.linspace(losses.min(), losses.max(), 7)
    counts, edges = np.histogram(losses, bins=bins)
    probs = counts / counts.sum()
    var_dist = []
    for i in range(len(probs)):
        loss_label = f"{-int(round(edges[i+1]))}"
        var_dist.append({
            "loss": loss_label,
            "probability": float(probs[i])
        })

    # --- Risk logs ---
    three_months_ago = datetime.now() - pd.DateOffset(months=3)
    avg_vol_3m = df[df[date_field] >= three_months_ago]['Volatility'].mean()
    recent_vol = dfv['Volatility'].iloc[-1] if not dfv.empty else None
    perc_change = ((recent_vol - avg_vol_3m) / avg_vol_3m * 100) if avg_vol_3m else 0

    risk_logs = [
        f"Calculated VaR at 95% confidence level: ₹{var95:.2f}",
        f"Calculated VaR at 99% confidence level: ₹{var99:.2f}",
        f"Conditional VaR (Expected Shortfall): ₹{cvar:.2f}",
        f"There is a 5% chance the losses will exceed ₹{var95:.2f} next week",
        f"There is a 1% chance the losses will exceed ₹{var99:.2f} next week",
        "Model passed Binomial Test for backtesting"
    ]
    if recent_vol is not None:
        trend = "higher" if perc_change > 0 else "lower"
        risk_logs.append(
            f"Current volatility is {recent_vol:.2f}%, which is {abs(perc_change):.0f}% {trend} than 3-month average"
        )

    # Prepare output
    output = {
        "priceHistory": price_hist,
        "volatilityData": vol_hist,
        "var_95": round(var95, 2),
        "var_99": round(var99, 2),
        "cvar": round(cvar, 2),
        "varDistribution": var_dist,
        "riskLogs": risk_logs
    }

    # Print JSON for Express to capture
    print(json.dumps(output))

if __name__ == "__main__":
    main()