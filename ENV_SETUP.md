# Environment Variables Setup Guide

## Quick Setup

1. **Copy the example file:**
   ```bash
   cp env.example .env
   ```

2. **Edit the .env file:**
   ```bash
   nano .env
   ```

3. **Update the following required variables:**
   - `DB_PASSWORD` - Set a strong database password
   - `JWT_SECRET` - Generate a random 32+ character string
   - `FRONTEND_URL` - Your frontend domain URL

## Required Environment Variables

### Application
- `NODE_ENV` - Environment mode (`production` or `development`)
- `PORT` - Internal container port (default: `3000`)
- `EXTERNAL_PORT` - Host port mapping (default: `3000`)

### Database
- `DB_HOST` - Database hostname (`postgres` for Docker Compose, or external host)
- `DB_PORT` - Database port (default: `5432`)
- `DB_USERNAME` - Database username (default: `postgres`)
- `DB_PASSWORD` - **REQUIRED** - Database password (change from default!)
- `DB_NAME` - Database name (default: `wa_project_db`)
- `DB_SSL` - Enable SSL for database (`true` or `false`)

### JWT Authentication
- `JWT_SECRET` - **REQUIRED** - Secret key for JWT signing (minimum 32 characters)
- `JWT_EXPIRATION` - JWT token expiration (default: `7d`)
- `JWT_EXPIRES_IN` - Alternative JWT expiration (default: `7d`)

### CORS
- `FRONTEND_URL` - **REQUIRED** - Frontend URL for CORS (e.g., `https://yourdomain.com`)

## Generating Secure Values

### Generate JWT Secret
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Generate Database Password
```bash
# Using OpenSSL
openssl rand -base64 24

# Using /dev/urandom (Linux/Mac)
tr -dc A-Za-z0-9 </dev/urandom | head -c 32
```

## Environment-Specific Configurations

### Development
```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5434
FRONTEND_URL=http://localhost:5173
```

### Production (Docker)
```env
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_SSL=false
FRONTEND_URL=https://your-production-domain.com
```

### Production (External Database)
```env
NODE_ENV=production
DB_HOST=your-db-host.com
DB_PORT=5432
DB_SSL=true
FRONTEND_URL=https://your-production-domain.com
```

## Security Checklist

Before deploying to production:

- [ ] Changed `DB_PASSWORD` from default
- [ ] Generated strong `JWT_SECRET` (32+ characters)
- [ ] Updated `FRONTEND_URL` with actual domain
- [ ] Set `NODE_ENV=production`
- [ ] Enabled `DB_SSL=true` if using external database
- [ ] Verified `.env` is in `.gitignore`
- [ ] Set appropriate file permissions: `chmod 600 .env`

## Troubleshooting

### JWT_SECRET not defined error
- Make sure `.env` file exists
- Verify `JWT_SECRET` is set in `.env`
- Check that `.env` file is in the backend root directory
- Restart Docker containers after updating `.env`

### Database connection failed
- Verify `DB_HOST` is correct (`postgres` for Docker, hostname/IP for external)
- Check `DB_PASSWORD` matches database configuration
- Ensure database is running and accessible
- For Docker: verify postgres service is healthy

### CORS errors
- Update `FRONTEND_URL` with exact frontend URL (including protocol)
- Check for trailing slashes
- Verify frontend is making requests to correct backend URL

## File Locations

- **Template:** `env.example`
- **Actual config:** `.env` (create from template, not in git)
- **Docker Compose:** `docker-compose.yml` (reads from `.env`)

