#!/bin/bash

# Debug script to check server state
SERVER="dreamer@51.158.148.158"

echo "🔍 Debugging server deployment..."
echo ""

ssh "${SERVER}" << 'ENDSSH'
cd /home/dreamer/sada

echo "📁 Files in directory:"
ls -la

echo ""
echo "📄 .env.production exists?"
if [ -f .env.production ]; then
    echo "✅ Yes, .env.production exists"
    echo "First few lines (without sensitive data):"
    head -5 .env.production
else
    echo "❌ No, .env.production NOT found"
fi

echo ""
echo "🐳 Docker containers status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "📋 Web container logs (last 50 lines):"
docker-compose -f docker-compose.prod.yml logs --tail=50 web

echo ""
echo "🔧 Docker Compose version:"
docker-compose --version
ENDSSH
