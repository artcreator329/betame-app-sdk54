#!/bin/bash

# BetaMe Admin Dashboard Deployment Script

echo "🚀 Starting BetaMe Admin Dashboard deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
    echo "❌ Error: This script must be run from the betame-app-admin directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create one with your environment variables."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Build the project
echo "🔨 Building admin dashboard..."
yarn build:web

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed. dist directory not found."
    exit 1
fi

echo "✅ Build completed successfully!"

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."
netlify deploy --prod

echo "🎉 Deployment completed!"
echo "📊 Admin Dashboard URL: https://dashboard.betame.com.my"
