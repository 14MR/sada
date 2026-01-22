#!/bin/bash

# View logs from production server
# Usage: ./deploy-logs.sh

SERVER="dreamer@51.158.148.158"

echo "📝 Connecting to server and showing logs..."
echo "Press Ctrl+C to exit"
echo ""

ssh -t "${SERVER}" "cd /home/dreamer/sada && docker-compose -f docker-compose.prod.yml logs -f web"
