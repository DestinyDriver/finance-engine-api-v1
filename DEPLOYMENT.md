# Deployment Guide

This document covers deploying the Finance Dashboard Backend to various environments: local development, Docker, and cloud platforms.

## Table of Contents

- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
  - [Heroku](#heroku)
  - [Railway](#railway)
  - [Render](#render)
  - [AWS](#aws)
  - [DigitalOcean](#digitalocean)
- [Environment Configuration](#environment-configuration)
- [Database Migrations](#database-migrations)
- [Health Checks & Monitoring](#health-checks--monitoring)
- [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites

- Node.js 18+ (verifyiwth `node -v`)
- npm 8+ (verify with `npm -v`)
- PostgreSQL 14+ running locally or via Docker
- Redis 7+ running locally or via Docker
- Git

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd zorvynAssinment
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Start PostgreSQL and Redis (using Docker):**
   ```bash
   docker compose up -d postgres redis
   ```

   Or if running natively, ensure both services are running on their default ports.

5. **Generate Prisma client and run migrations:**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npm run seed
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:4000`
   - Swagger docs: `http://localhost:4000/api-docs`
   - Health check: `http://localhost:4000/health`

7. **Verify setup:**
   ```bash
   # Run tests
   npm test

   # Watch for changes
   npm run dev
   ```

### Development Commands

```bash
npm run dev              # Start with nodemon (file watch)
npm start               # Start production server
npm test                # Run all tests
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests only
npm run test:coverage  # Generate coverage report
npm run lint            # Run ESLint
npm run prisma:studio  # Open Prisma Studio GUI
npm run seed            # Seed database with test data
npx prisma migrate dev # Create/apply migrations
```

---

## Docker Deployment

### Using Docker Compose (Full Stack)

The easiest way to deploy locally or to a server with Docker installed.

1. **Verify Docker and Docker Compose are installed:**
   ```bash
   docker --version
   docker compose version
   ```

2. **Start the full stack:**
   ```bash
   docker compose up --build
   ```

   This starts:
   - PostgreSQL 16 on port 5432
   - Redis 7 on port 6379
   - Node.js API on port 4000

3. **Run migrations in the container:**
   ```bash
   docker compose exec api npx prisma migrate deploy
   docker compose exec api npm run seed
   ```

4. **View logs:**
   ```bash
   docker compose logs -f api        # API logs only
   docker compose logs -f postgres   # Database logs
   docker compose logs -f redis      # Cache logs
   docker compose logs -f            # All services
   ```

5. **Stop the stack:**
   ```bash
   docker compose down              # Stop containers
   docker compose down -v           # Stop and remove volumes (WARNING: deletes data)
   ```

### Docker Build Only (Single Container)

If you only want to deploy the API container:

```bash
docker build -t finance-dashboard-api:latest .
docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://user:password@db-host:5432/finance_db" \
  -e REDIS_URL="redis://redis-host:6379" \
  -e NODE_ENV="production" \
  finance-dashboard-api:latest
```

### Environment Variables for Docker

Create `.env.docker` or update environment in `docker-compose.yml`:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://finance_user:secure_password@postgres:5432/finance_db
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=
JWT_ACCESS_SECRET=your-access-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
LOG_LEVEL=info
LOG_DIR=/app/logs
CORS_ORIGIN=*
```

---

## Cloud Deployment

### Heroku

Heroku is the easiest for beginners.

#### Prerequisites

- Heroku account (free or paid)
- Heroku CLI installed

#### Deployment Steps

1. **Login to Heroku:**
   ```bash
   heroku login
   ```

2. **Create Heroku app:**
   ```bash
   heroku create finance-dashboard-api
   ```

3. **Add PostgreSQL addon:**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev -a finance-dashboard-api
   ```

4. **Add Redis addon:**
   ```bash
   heroku addons:create heroku-redis:premium-0 -a finance-dashboard-api
   ```

5. **Set environment variables:**
   ```bash
   heroku config:set JWT_ACCESS_SECRET=your-secret-key -a finance-dashboard-api
   heroku config:set JWT_REFRESH_SECRET=your-refresh-secret -a finance-dashboard-api
   heroku config:set NODE_ENV=production -a finance-dashboard-api
   heroku config:set BCRYPT_ROUNDS=12 -a finance-dashboard-api
   ```

   Note: `DATABASE_URL` and `REDIS_URL` are automatically set by addons.

6. **Add Procfile** (if not present):
   ```
   web: npm start
   release: npx prisma migrate deploy && npm run seed
   ```

7. **Deploy:**
   ```bash
   git push heroku main
   ```

8. **View logs:**
   ```bash
   heroku logs --tail -a finance-dashboard-api
   ```

9. **Access the app:**
   ```
   https://finance-dashboard-api.herokuapp.com/health
   ```

#### Cost

- **Free tier:** Limited (Heroku discontinued free tier; requires paid dyno)
- **Hobby dyno:** ~$7/month (limited resources)
- **PostgreSQL:** $9/month minimum
- **Redis:** $15/month minimum

---

### Railway

Railway offers simple Git-based deployment with pay-as-you-go pricing.

#### Prerequisites

- Railway account (free tier available)
- GitHub repository

#### Deployment Steps

1. **Connect GitHub repository to Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub"
   - Select your repository

2. **Add PostgreSQL service:**
   - Click "+" → Add service → PostgreSQL
   - Railway creates `DATABASE_URL` automatically

3. **Add Redis service:**
   - Click "+" → Add service → Redis
   - Railway creates `REDIS_URL` automatically

4. **Set environment variables:**
   - In the API service settings, add:
   ```
   NODE_ENV=production
   JWT_ACCESS_SECRET=your-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret
   BCRYPT_ROUNDS=12
   LOG_LEVEL=info
   CORS_ORIGIN=*
   ```

5. **Configure build & start commands:**
   - Build: `npm install && npx prisma generate && npm run build`
   - Start: `npm start`

6. **Deploy:**
   - Railway automatically deploys on push to main branch
   - Check deployment status in dashboard

7. **View logs:**
   - Logs visible in Railway dashboard
   - Real-time streaming available

#### Cost

- First $5/month free
- PostgreSQL: ~$0.25/day usage-based
- Redis: ~$0.30/day usage-based
- Very economical for hobby projects

---

### Render

Render provides Git-native deployment with free tier option.

#### Prerequisites

- Render account (free tier available)
- GitHub repository

#### Deployment Steps

1. **Create Web Service:**
   - Go to [render.com](https://render.com/dashboard)
   - Click "New" → "Web Service"
   - Select GitHub repository
   - Choose branch (main)

2. **Configure build settings:**
   - **Name:** finance-dashboard-api
   - **Runtime:** Node
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npm start`

3. **Set environment variables:**
   ```
   NODE_ENV=production
   JWT_ACCESS_SECRET=your-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret
   DATABASE_URL=<get-from-postgres-service>
   REDIS_URL=<get-from-redis-service>
   BCRYPT_ROUNDS=12
   LOG_LEVEL=info
   ```

4. **Attach PostgreSQL database:**
   - Click "New" → "PostgreSQL"
   - Set name: `finance-db`
   - Copy `DATABASE_URL` to web service environment

5. **Attach Redis cache:**
   - Click "New" → "Redis"
   - Set name: `finance-redis`
   - Copy `REDIS_URL` to web service environment

6. **Deploy:**
   - Click "Deploy"
   - Render auto-deploys on git push

#### Cost

- **Free tier:** 0.5 CPU, 512MB RAM (auto-sleeps after 15 min inactivity)
- **PostgreSQL:** Free tier available (2 GB)
- **Redis:** Free tier available (25 MB)
- **Paid:** ~$7/month minimum for always-on services

---

### AWS

AWS offers scalable deployment with multiple options (EC2, ECS, Elastic Beanstalk).

#### Option 1: EC2 (Simple Server)

1. **Launch EC2 instance:**
   - Ubuntu 22.04 LTS
   - t2.micro or t3.micro (free tier eligible)
   - Security group: Allow SSH (22), HTTP (80), HTTPS (443), and 4000

2. **SSH into instance:**
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   ```

3. **Install dependencies:**
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   npm install -g npm
   ```

4. **Install PostgreSQL and Redis:**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib redis-server -y
   ```

5. **Clone and setup application:**
   ```bash
   git clone <repository-url>
   cd zorvynAssinment
   npm install
   npx prisma migrate deploy
   npm run seed
   ```

6. **Setup PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start "npm start" --name "finance-api"
   pm2 startup
   pm2 save
   ```

7. **Setup reverse proxy with Nginx:**
   ```bash
   sudo apt install nginx -y
   sudo nano /etc/nginx/sites-available/default
   ```

   Add:
   ```nginx
   server {
     listen 80;
     server_name your-domain.com;

     location / {
       proxy_pass http://localhost:4000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
   proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

   ```bash
   sudo systemctl restart nginx
   ```

8. **Setup SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d your-domain.com
   ```

#### Option 2: ECS (Container Orchestration)

1. **Push Docker image to ECR:**
   ```bash
   aws ecr create-repository --repository-name finance-api
   docker tag finance-dashboard-api:latest <account-id>.dkr.ecr.<region>.amazonaws.com/finance-api:latest
   docker push <account-id>.dkr.ecr.<region>.amazonaws.com/finance-api:latest
   ```

2. **Create ECS cluster:**
   - Use AWS Management Console
   - Create Fargate cluster
   - Create task definition with container image

3. **Setup RDS (PostgreSQL) and ElastiCache (Redis)**

4. **Create service and load balancer**

---

### DigitalOcean

DigitalOcean provides straightforward VPS and App Platform options.

#### Option 1: App Platform (Git-native)

1. **Connect GitHub:**
   - Go to DigitalOcean App Platform
   - Click "Create App" → Select GitHub repository

2. **Add services:**
   - PostgreSQL: Auto-managed
   - Redis: Auto-managed
   - Node.js web service

3. **Set environment variables:**
   ```
   NODE_ENV=production
   JWT_ACCESS_SECRET=your-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   ```

4. **Deploy:** Click "Deploy"

#### Option 2: Droplet (Manual VPS)

Similar to AWS EC2 setup (see above).

#### Cost

- **App Platform:** $12/month minimum
- **PostgreSQL (Basic):** $15/month
- **Redis (Basic):** $15/month
- **Droplet (1GB):** $6/month + services

---

## Environment Configuration

### Required Variables

```env
# Server
NODE_ENV=production                    # development | production | test
PORT=4000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/finance_db

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=min-32-chars-long-secret-key
JWT_REFRESH_SECRET=min-32-chars-long-refresh-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12                       # Higher = slower but more secure
CORS_ORIGIN=http://localhost:3000     # or * for development only

# Logging
LOG_LEVEL=info                        # debug | info | warn | error
LOG_DIR=./logs
```

### Production Best Practices

1. **Secret Management:**
   - Use cloud provider secret manager (AWS Secrets, Azure Key Vault, etc.)
   - Never commit `.env` file to git
   - Rotate secrets regularly

2. **Database:**
   - Enable SSL connections
   - Set strong passwords (20+ chars, mixed case, numbers, symbols)
   - Setup automated backups
   - Use read replicas for scaling

3. **Redis:**
   - Enable password authentication
   - Use TLS/SSL in production
   - Setup memory policies and eviction

4. **Logging:**
   - Set to `info` or `warn` in production
   - Redirect logs to centralized logging service
   - Setup alerts for errors

---

## Database Migrations

### Creating Migrations

1. **Make schema changes** in `prisma/schema.prisma`

2. **Create migration:**
   ```bash
   npx prisma migrate dev --name add_new_field
   ```

3. **Review generated SQL** in `prisma/migrations/`

4. **Commit migration files** to git

### Applying Migrations

**Development:**
```bash
npx prisma migrate dev
```

**Production:**
```bash
npx prisma migrate deploy
```

**Reset database (DEV ONLY):**
```bash
npx prisma migrate reset  # Destructive!
```

### Viewing Database State

```bash
npx prisma studio      # GUI database browser
npx prisma validate    # Check schema validity
npx prisma generate    # Regenerate client
```

---

## Health Checks & Monitoring

### Built-in Health Endpoint

```bash
curl http://localhost:4000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

### Setup Monitoring

#### Heroku

```yaml
# Procfile
web: npm start
release: npx prisma migrate deploy && npm run seed
```

#### Railway/Render

Configure health check endpoint in dashboard:
```
GET /health
Expected status: 200
Interval: 60s
Timeout: 10s
```

#### AWS CloudWatch

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name api-health-check \
  --alarm-actions arn:aws:sns:region:account-id:topic-name \
  --evaluation-periods 2 \
  --period 60 \
  --threshold 1
```

### Logging & Alerts

#### Centralized Logging Service

**Option 1: Papertrail**
```env
PAPERTRAIL_LOG_SYSTEM_HOSTNAME=finance-api
```

**Option 2: Loggly**
```bash
npm install winston-loggly-bulk
```

**Option 3: DataDog**
```bash
npm install node-dogstatsd datadog-winston-transport
```

#### Application Performance Monitoring (APM)

**New Relic:**
```bash
npm install newrelic
# Add to start of app.js
require('newrelic');
```

**Datadog APM:**
```bash
npm install dd-trace
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```bash
# Check if PostgreSQL is running
psql --version
psql -U postgres

# Or verify DATABASE_URL is correct
echo $DATABASE_URL
```

#### 2. Redis Connection Errors

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:**
```bash
# Check if Redis is running
redis-cli ping
# Should respond: PONG

# Start Redis if needed
redis-server
```

#### 3. Migration Lock

**Error:** `The migration lock could not be acquired`

**Solution:**
```bash
# Force release lock (use with caution)
npx prisma migrate resolve --released
```

#### 4. Prisma Client Issues

**Error:** `PrismaClientInitializationError`

**Solution:**
```bash
# Regenerate Prisma client
npx prisma generate

# Check schema validity
npx prisma validate
```

#### 5. Port Already in Use

**Error:** `listen EADDRINUSE: address already in use :::4000`

**Solution:**
```bash
# Find process using port 4000
lsof -i :4000
kill -9 <PID>

# Or use different port
PORT=5000 npm start
```

#### 6. Memory Leaks

**Error:** Process memory keeps increasing

**Debugging:**
```bash
# Use clinic.js for profiling
npm install -g clinic
clinic doctor -- npm start

# Or heap snapshots
node --inspect app.js
# Then visit chrome://inspect
```

#### 7. Slow Queries

**Solution:**
```bash
# Enable slow query logging
# In Prisma schema, enable query logging
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

# Or enable in app
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'info' },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    console.warn(`Slow query (${e.duration}ms): ${e.query}`);
  }
});
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm start

# Or specific module
DEBUG=prisma:* npm start
```

### Getting Help

1. Check logs: `npm run logs` or cloud provider logs
2. Check database: `npx prisma studio`
3. Test connectivity:
   ```bash
   # Test database
   psql $DATABASE_URL

   # Test Redis
   redis-cli -u $REDIS_URL ping
   ```
4. Restart services:
   ```bash
   docker compose restart
   pm2 restart finance-api
   systemctl restart your-service-name
   ```

---

## Security Checklist

- [ ] All secrets stored in environment variables (not committed)
- [ ] HTTPS/SSL enabled in production
- [ ] Database backups configured and tested
- [ ] Rate limiting enabled
- [ ] CORS properly configured (not `*` in production)
- [ ] JWT secrets are 32+ characters
- [ ] Database passwords are 20+ characters, mixed case
- [ ] Regular security updates applied
- [ ] Error messages don't expose sensitive info
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (using Prisma)
- [ ] CSRF tokens configured if needed
- [ ] Monitoring and alerting setup

---

## Scaling Guide

### Vertical Scaling (More Resources)

1. Increase server CPU/RAM
2. Increase database instance size
3. Increase Redis memory allocation

### Horizontal Scaling (Multiple Servers)

1. **Load Balancer:** Nginx, HAProxy, or cloud provider LB
2. **Database:** Read replicas, connection pooling (PgBouncer)
3. **Redis:** Cluster mode or Sentinel for HA
4. **Sessions:** Store in database/Redis (already configured)
5. **File Uploads:** Use S3 or cloud storage (not local filesystem)

### Caching Strategy

- API responses cached in Redis (already configured)
- Increase TTL for static data
- Use CDN for static assets
- Implement request deduplication

---

## Rollback Procedure

```bash
# Git rollback
git revert HEAD
git push

# Database rollback (if migration failed)
npx prisma migrate resolve --rolled-back <migration-name>
npx prisma migrate deploy

# Or restore from backup
# Contact your cloud provider for restore procedure
```

---

## Maintenance Tasks

### Weekly

- Monitor error logs: `npm run logs`
- Check disk space
- Review slow queries

### Monthly

- Update npm dependencies: `npm update`
- Review security advisories: `npm audit fix`
- Database VACUUM and ANALYZE (PostgreSQL)

### Quarterly

- Security audit
- Load testing
- Disaster recovery drill

---

## Support & Resources

- **Node.js Docs:** https://nodejs.org/docs/
- **Express:** https://expressjs.com/
- **Prisma:** https://www.prisma.io/docs/
- **PostgreSQL:** https://www.postgresql.org/docs/
- **Redis:** https://redis.io/documentation
- **Docker:** https://docs.docker.com/

