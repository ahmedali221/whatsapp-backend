# Quick Start Guide - Hostinger VPS Deployment

## Prerequisites Checklist

- [ ] Hostinger VPS with SSH access
- [ ] Docker installed on VPS
- [ ] Docker Compose installed on VPS
- [ ] Domain name (optional)

## Quick Deployment Steps

### 1. Upload Your Code

```bash
# On your local machine, upload the backend folder to your VPS
scp -r backend/ user@your-vps-ip:/var/www/wa-project/backend/
```

### 2. SSH into Your VPS

```bash
ssh user@your-vps-ip
cd /var/www/wa-project/backend
```

### 3. Create Environment File

```bash
nano .env
```

Paste and customize:

```env
NODE_ENV=production
PORT=3000
EXTERNAL_PORT=3000

DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=CHANGE_THIS_PASSWORD
DB_NAME=wa_project_db

JWT_SECRET=CHANGE_THIS_TO_RANDOM_32_CHAR_STRING
JWT_EXPIRES_IN=7d

FRONTEND_URL=https://your-frontend-domain.com
```

**Important:** Change `DB_PASSWORD` and `JWT_SECRET` to secure values!

### 4. Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

Or manually:

```bash
docker-compose up -d --build
docker-compose exec backend npm run migration:run
```

### 5. Verify

```bash
# Check status
docker-compose ps

# Check logs
docker-compose logs -f backend

# Test API
curl http://localhost:3000
```

## Port Configuration

The server uses the `PORT` environment variable (default: 3000).

- **Internal container port:** Always 3000
- **External host port:** Set via `EXTERNAL_PORT` in `.env` (default: 3000)

To use a different external port (e.g., 8080):

```env
PORT=3000
EXTERNAL_PORT=8080
```

Then update docker-compose.yml port mapping:
```yaml
ports:
  - '8080:3000'
```

## Common Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Update and redeploy
git pull  # if using git
docker-compose up -d --build
docker-compose exec backend npm run migration:run
```

## Troubleshooting

**Port already in use:**
```bash
# Find what's using the port
sudo netstat -tulpn | grep 3000
# Or change PORT in .env
```

**Container won't start:**
```bash
docker-compose logs backend
```

**Database connection issues:**
```bash
docker-compose logs postgres
docker-compose exec postgres psql -U postgres -d wa_project_db
```

## Next Steps

1. Set up Nginx reverse proxy (see DEPLOYMENT.md)
2. Configure SSL with Let's Encrypt
3. Set up automated backups
4. Configure firewall rules

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

