# Deployment Guide for Hostinger VPS

This guide will help you deploy the WA Project backend to your Hostinger VPS server.

## Prerequisites

- Hostinger VPS with SSH access
- Docker and Docker Compose installed on the VPS
- Domain name (optional, for production)
- Basic knowledge of Linux commands

## Step 1: Prepare Your VPS

### Install Docker and Docker Compose

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (optional, to run docker without sudo)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

## Step 2: Upload Your Backend Code

### Option A: Using Git (Recommended)

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to your project directory
cd /var/www  # or your preferred directory
mkdir wa-project
cd wa-project

# Clone your repository (if using Git)
git clone <your-repo-url> backend
cd backend

# Or if you already have the code, upload it via SCP:
# From your local machine:
# scp -r backend/ user@your-vps-ip:/var/www/wa-project/
```

### Option B: Using SCP

From your local machine:

```bash
scp -r backend/ user@your-vps-ip:/var/www/wa-project/backend/
```

## Step 3: Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
cd /var/www/wa-project/backend
nano .env
```

Add the following configuration (adjust values as needed):

```env
# Application Configuration
NODE_ENV=production
PORT=3050

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password_here_change_this
DB_NAME=wa_project_db
DB_SSL=false

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_chars
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com

# Optional: Additional configuration
LOG_LEVEL=info
```

**Important Security Notes:**
- Change `DB_PASSWORD` to a strong password
- Change `JWT_SECRET` to a random string (at least 32 characters)
- Update `FRONTEND_URL` with your actual frontend domain
- Never commit the `.env` file to Git

## Step 4: Configure Firewall

Allow necessary ports through the firewall:

```bash
# If using UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3050/tcp  # Backend API (or your chosen port)
sudo ufw allow 80/tcp    # HTTP (if using reverse proxy)
sudo ufw allow 443/tcp   # HTTPS (if using reverse proxy)
sudo ufw enable

# If using firewalld
sudo firewall-cmd --permanent --add-port=3050/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

## Step 5: Build and Start Services

```bash
cd /var/www/wa-project/backend

# Build and start all services
docker-compose up -d --build

# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f backend
```

## Step 6: Run Database Migrations

```bash
# Enter the backend container
docker-compose exec backend sh

# Run migrations
npm run migration:run

# Exit container
exit
```

Or run migrations from outside the container:

```bash
docker-compose exec backend npm run migration:run
```

## Step 7: Set Up Reverse Proxy (Optional but Recommended)

### Using Nginx

Install Nginx:

```bash
sudo apt install nginx -y
```

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/wa-backend
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/wa-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Certbot will automatically configure Nginx and set up auto-renewal
```

## Step 8: Set Up Auto-Start on Boot

Docker Compose services should automatically restart, but ensure Docker starts on boot:

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

## Step 9: Monitoring and Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Update Application

```bash
# Pull latest code (if using Git)
git pull

# Rebuild and restart
docker-compose up -d --build

# Run migrations if needed
docker-compose exec backend npm run migration:run
```

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres wa_project_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker-compose exec -T postgres psql -U postgres wa_project_db < backup_file.sql
```

## Step 10: Health Checks

Verify your deployment:

```bash
# Check if backend is responding
curl http://localhost:3050

# Check container health
docker-compose ps

# Check resource usage
docker stats
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs backend

# Check if port is already in use
sudo netstat -tulpn | grep 3050

# Restart Docker
sudo systemctl restart docker
```

### Database connection issues

```bash
# Check if database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U postgres -d wa_project_db
```

### Permission issues

```bash
# Fix file permissions
sudo chown -R $USER:$USER /var/www/wa-project
chmod -R 755 /var/www/wa-project
```

## Security Best Practices

1. **Change default passwords** - Update all default passwords in `.env`
2. **Use strong JWT secret** - Generate a random 32+ character string
3. **Enable firewall** - Only open necessary ports
4. **Use HTTPS** - Set up SSL certificate with Let's Encrypt
5. **Regular updates** - Keep Docker and system packages updated
6. **Backup database** - Set up automated backups
7. **Monitor logs** - Regularly check application logs for issues
8. **Limit SSH access** - Use SSH keys instead of passwords

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `production` | Yes |
| `PORT` | Server port | `3050` | No |
| `DB_HOST` | Database host | `postgres` | Yes |
| `DB_PORT` | Database port | `5432` | Yes |
| `DB_USERNAME` | Database username | `postgres` | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `DB_NAME` | Database name | `wa_project_db` | Yes |
| `DB_SSL` | Enable SSL for DB | `false` | No |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `JWT_EXPIRES_IN` | JWT expiration | `7d` | No |
| `FRONTEND_URL` | Frontend URL for CORS | - | Yes |

## Support

For issues or questions:
- Check application logs: `docker-compose logs -f`
- Check system resources: `docker stats`
- Review this deployment guide
- Check NestJS documentation: https://docs.nestjs.com

