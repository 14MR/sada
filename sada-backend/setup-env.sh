#!/bin/bash

# Script to help set up .env.production on the server
SERVER="dreamer@51.158.148.158"

echo "🔧 Setting up .env.production on server..."
echo ""

echo "This will open an SSH session to edit .env.production"
echo "Update the following values:"
echo "  - CLOUDFLARE_APP_ID"
echo "  - CLOUDFLARE_TURN_KEY_ID"
echo "  - CLOUDFLARE_API_TOKEN"
echo "  - JWT_SECRET (generate a random string)"
echo ""
echo "Press Enter to continue..."
read

ssh -t "${SERVER}" "cd /home/dreamer/sada && if [ ! -f .env.production ]; then cp env.production.template .env.production; fi && nano .env.production"

echo ""
echo "✅ Environment file updated!"
echo "Now run: ./deploy.sh"
