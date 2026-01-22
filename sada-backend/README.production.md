# Production Deployment Guide

## Prerequisites

1. Docker and Docker Compose installed on your server
2. External `web` network created (for nginx-proxy integration):
   ```bash
   docker network create web
   ```

## Setup

1. **Create production environment file:**
   ```bash
   cp env.production.template .env.production
   ```

2. **Edit `.env.production` with your actual values:**
   - Set your domain name for `VIRTUAL_HOST` and `LETSENCRYPT_HOST`
   - Set your email for `LETSENCRYPT_EMAIL`
   - Add your Cloudflare TURN credentials
   - Generate a strong JWT secret

3. **Build and start services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```
   
   **Note:** The `docker-compose.prod.yml` is configured to load environment variables from `.env.production`.

## Deployment Commands

### Start services:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Stop services:
```bash
docker-compose -f docker-compose.prod.yml down
```

### View logs:
```bash
docker-compose -f docker-compose.prod.yml logs -f web
```

### Rebuild and restart:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database migrations (if needed):
Connect to the container and run migrations:
```bash
docker-compose -f docker-compose.prod.yml exec web sh
npm run typeorm migration:run
```

## Nginx Proxy Setup

This configuration assumes you're using [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) with [acme-companion](https://github.com/nginx-proxy/acme-companion) for automatic SSL certificates.

If you haven't set up nginx-proxy yet, you can do so with:

```bash
# Create the web network
docker network create web

# Start nginx-proxy and acme-companion
docker run -d \
  --name nginx-proxy \
  --network web \
  -p 80:80 \
  -p 443:443 \
  -v /var/run/docker.sock:/tmp/docker.sock:ro \
  -v nginx-certs:/etc/nginx/certs \
  -v nginx-vhost:/etc/nginx/vhost.d \
  -v nginx-html:/usr/share/nginx/html \
  nginxproxy/nginx-proxy

docker run -d \
  --name acme-companion \
  --network web \
  --volumes-from nginx-proxy \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v nginx-acme:/etc/acme.sh \
  nginxproxy/acme-companion
```

## Environment Variables

Required environment variables in `.env.production`:

- `VIRTUAL_HOST`: Your API domain (e.g., sada.mustafin.dev)
- `LETSENCRYPT_HOST`: Same as VIRTUAL_HOST for SSL certificate (sada.mustafin.dev)
- `LETSENCRYPT_EMAIL`: Email for Let's Encrypt notifications (le@mustafin.dev)
- `CLOUDFLARE_APP_ID`: Your Cloudflare app ID
- `CLOUDFLARE_TURN_KEY_ID`: Your Cloudflare TURN key ID
- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
- `JWT_SECRET`: Strong secret for JWT token signing

## Security Notes

1. **Never commit `.env.production` to version control**
2. Use strong, randomly generated secrets for production
3. Consider using Docker secrets or a secrets management service for sensitive data
4. Regularly update Docker images for security patches
5. Set up proper database backups

## Monitoring

Monitor your services:
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats

# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Backup Database

```bash
# Backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres sada > backup.sql

# Restore
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres sada < backup.sql
```
