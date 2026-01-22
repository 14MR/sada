#!/bin/bash

# Deploy script for sada-backend
# Usage: ./deploy.sh

set -e

SERVER="dreamer@51.158.148.158"
REMOTE_PATH="/home/dreamer/sada"
LOCAL_PATH="/Users/tim/workspace/pets/sada/sada-backend"

echo "🚀 Deploying sada-backend to production..."
echo ""

# Sync files to server
echo "📦 Syncing files to server..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.production' \
  --exclude '.DS_Store' \
  --exclude '*.log' \
  --exclude 'coverage' \
  --exclude 'deploy.sh' \
  "${LOCAL_PATH}/" "${SERVER}:${REMOTE_PATH}/"

echo ""
echo "✅ Files synced successfully!"
echo ""

# Deploy on server
echo "🐳 Building and starting Docker containers..."
ssh "${SERVER}" << 'ENDSSH'
cd /home/dreamer/sada

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "⚠️  Warning: .env.production not found!"
    echo "Creating from template..."
    cp env.production.template .env.production
    echo "❗ Please edit .env.production with your actual values"
    echo ""
    echo "Waiting for you to edit .env.production on the server..."
    exit 1
fi

echo "✅ .env.production found"

# Create web network if it doesn't exist
docker network inspect web >/dev/null 2>&1 || docker network create web

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Build and start services
echo "🔨 Building..."
docker-compose -f docker-compose.prod.yml build

echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 3

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📊 Service status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "📋 Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=20 web

echo ""
echo "📝 View live logs with:"
echo "   docker-compose -f docker-compose.prod.yml logs -f web"
ENDSSH

echo ""
echo "✨ Deployment finished!"
echo "🌐 Your API should be available at: https://sada.mustafin.dev"
