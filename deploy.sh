#!/bin/bash

# Deployment script for WA Project Backend
# This script helps automate the deployment process on Hostinger VPS

set -e  # Exit on error

echo "🚀 Starting WA Project Backend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please create a .env file based on the environment variables in DEPLOYMENT.md"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Error: Docker is not installed!${NC}"
    echo "Please install Docker first. See DEPLOYMENT.md for instructions."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Error: Docker Compose is not installed!${NC}"
    echo "Please install Docker Compose first. See DEPLOYMENT.md for instructions."
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Containers are running${NC}"
else
    echo -e "${RED}❌ Error: Containers failed to start${NC}"
    echo "Check logs with: docker-compose logs"
    exit 1
fi

# Run database migrations
echo "📊 Running database migrations..."
docker-compose exec -T backend npm run migration:run || {
    echo -e "${YELLOW}⚠ Warning: Migration failed or no migrations to run${NC}"
}

# Health check
echo "🏥 Performing health check..."
sleep 5

PORT=$(grep PORT .env | cut -d '=' -f2 | tr -d ' ' || echo "3050")
if curl -f http://localhost:${PORT} > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is responding on port ${PORT}${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Backend health check failed${NC}"
    echo "Check logs with: docker-compose logs backend"
fi

echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Check status: docker-compose ps"
echo ""

