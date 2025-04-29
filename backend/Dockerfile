# Use Node.js 18 as the base image
FROM node:18-bullseye

# Set working directory
WORKDIR /app

# Install Python and pip + common ML packages
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    pip3 install pandas numpy scikit-learn matplotlib && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install additional Python packages required for your application
RUN pip3 install --no-cache-dir \
    yfinance \
    xgboost \
    pymongo \
    ta \
    tqdm

# Copy only package.json files and install dependencies
COPY package*.json ./ 
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Default command to run the app
CMD ["npm", "start"]
