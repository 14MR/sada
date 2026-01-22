#!/bin/bash

# Check deployment status on production server
# Usage: ./deploy-status.sh

SERVER="dreamer@51.158.148.158"

echo "📊 Checking deployment status..."
echo ""

ssh "${SERVER}" << 'ENDSSH'
cd /home/dreamer/sada

echo "🐳 Docker containers:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "💾 Disk usage:"
df -h /home/dreamer/sada

echo ""
echo "📈 Container stats:"
docker stats --no-stream $(docker-compose -f docker-compose.prod.yml ps -q)

echo ""
echo "🔍 Recent logs (last 20 lines):"
docker-compose -f docker-compose.prod.yml logs --tail=20 web
ENDSSH
