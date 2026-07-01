# BugFlow Deployment Guide

A full-stack QA Test Case Management System built with Next.js, Express, TypeScript, Prisma, and MySQL.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Environment Setup](#environment-setup)
4. [Database Setup](#database-setup)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Production Configuration](#production-configuration)
8. [Docker Deployment (Optional)](#docker-deployment-optional)
9. [CI/CD Pipeline (Optional)](#cicd-pipeline-optional)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements
- Node.js 18+ (LTS recommended)
- npm or yarn
- MySQL 8.0+ or MariaDB 10.5+
- Git
- (Optional) Docker & Docker Compose

### Cloud Service Options
- **Frontend**: Vercel, Netlify, AWS Amplify, or any static hosting
- **Backend**: Railway, Render, AWS EC2, DigitalOcean, Heroku
- **Database**: PlanetScale, AWS RDS, DigitalOcean Managed Databases, Railway MySQL
- **File Storage**: Cloudinary (required for attachments)
- **Email**: SMTP server (Gmail, SendGrid, Mailgun, etc.)

---

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │  Next.js (React)
│  (bugflow/)     │  Port: 3000 (default)
└────────┬────────┘
         │ HTTPS/WebSocket
         ↓
┌─────────────────┐
│   Backend       │  Express.js + Socket.IO
│  (backend/)     │  Port: 3001 (default)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Database      │  MySQL
└─────────────────┘
         ↓
┌─────────────────┐
│   Cloudinary    │  File/Attachment Storage
└─────────────────┘
```

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd BugFlow
```

### 2. Backend Environment Variables

Create `backend/.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL="mysql://username:password@host:port/database_name?schema=public"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# CORS
CORS_ORIGIN="https://your-frontend-domain.com"

# Frontend URL (for password reset emails)
FRONTEND_URL="https://your-frontend-domain.com"

# Cloudinary (for file attachments)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# SMTP (for password reset emails)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### 3. Frontend Environment Variables

Create `bugflow/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL="https://your-backend-domain.com/api"
NEXT_PUBLIC_API_BASE_URL="https://your-backend-domain.com"

# Socket.IO
NEXT_PUBLIC_SOCKET_URL="https://your-backend-domain.com"
```

---

## Database Setup

### Option A: Managed Database (Recommended for Production)

1. **Create a MySQL database** using:
   - PlanetScale (https://planetscale.com)
   - AWS RDS
   - DigitalOcean Managed Databases
   - Railway

2. **Get your connection string** and update `DATABASE_URL` in `backend/.env`

### Option B: Self-hosted MySQL

```bash
# Install MySQL
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# macOS (Homebrew)
brew install mysql

# Start MySQL
sudo systemctl start mysql  # Linux
brew services start mysql   # macOS
```

Create database and user:

```sql
CREATE DATABASE bugflow;
CREATE USER 'bugflow_user'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON bugflow.* TO 'bugflow_user'@'localhost';
FLUSH PRIVILEGES;
```

Update `DATABASE_URL`:

```env
DATABASE_URL="mysql://bugflow_user:your-password@localhost:3306/bugflow?schema=public"
```

### Run Database Migrations

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
```

---

## Backend Deployment

### Option 1: Deploy to Railway (Simplest)

1. **Install Railway CLI**

```bash
npm install -g @railway/cli
```

2. **Login and Initialize**

```bash
cd backend
railway login
railway init
```

3. **Add MySQL Database**

```bash
railway add mysql
```

4. **Set Environment Variables**

Go to Railway dashboard → Your project → Variables → Add all variables from `backend/.env`

5. **Deploy**

```bash
railway up
```

### Option 2: Deploy to Render

1. **Create a new Web Service** on Render
2. **Connect your repository**
3. **Configure**:
   - Root Directory: `backend`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm start`
4. **Add Environment Variables** in Render dashboard
5. **Add MySQL Database** via Render's PostgreSQL/MySQL service
6. **Deploy**

### Option 3: Manual Deployment (VPS/Droplet)

1. **SSH into your server**

```bash
ssh user@your-server-ip
```

2. **Install Node.js and PM2**

```bash
# Install Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

3. **Clone and deploy backend**

```bash
cd /var/www
git clone <your-repo>
cd BugFlow/backend

# Install dependencies
npm install

# Build
npx prisma generate
npx prisma migrate deploy
npm run build

# Start with PM2
pm2 start dist/server.js --name bugflow-backend

# Save PM2 config
pm2 save
pm2 startup
```

4. **Setup Nginx Reverse Proxy**

Create `/etc/nginx/sites-available/bugflow-backend`:

```nginx
server {
    listen 80;
    server_name your-backend-domain.com;

    location / {
        proxy_pass http://localhost:3001;
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
sudo ln -s /etc/nginx/sites-available/bugflow-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

5. **SSL with Let's Encrypt**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-backend-domain.com
```

---

## Frontend Deployment

### Option 1: Deploy to Vercel (Recommended)

1. **Install Vercel CLI**

```bash
npm install -g vercel
```

2. **Deploy**

```bash
cd bugflow
vercel
```

3. **Set Environment Variables** in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_SOCKET_URL`

4. **Redeploy for production**

```bash
vercel --prod
```

### Option 2: Deploy to Netlify

1. **Create `netlify.toml`** in `bugflow/`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. **Connect to Netlify** and deploy

### Option 3: Manual Deployment (Self-hosted)

1. **Build the frontend**

```bash
cd bugflow
npm install
npm run build
```

2. **Serve with PM2**

```bash
pm2 start npm --name bugflow-frontend -- start
```

Or use Nginx to serve static files:

```nginx
server {
    listen 80;
    server_name your-frontend-domain.com;

    root /var/www/BugFlow/bugflow/.next;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /_next {
        alias /var/www/BugFlow/bugflow/.next;
    }
}
```

---

## Production Configuration

### Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use secret managers (AWS Secrets Manager, Doppler, etc.)
   - Rotate secrets regularly

2. **JWT Secret**
   - Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

3. **CORS Configuration**
   - Set `CORS_ORIGIN` to your exact frontend domain
   - Don't use `*` in production

4. **Rate Limiting**
   - Add rate limiting to prevent abuse:

```typescript
// backend/src/server.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per window
});

app.use(limiter);
```

5. **Helmet.js**
   - Add security headers:

```typescript
import helmet from 'helmet';
app.use(helmet());
```

### Performance Optimization

1. **Enable Gzip Compression**

```typescript
import compression from 'compression';
app.use(compression());
```

2. **Database Connection Pooling**
   - Configure in Prisma schema:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  connection_limit = 10
}
```

3. **Frontend Caching**
   - Configure cache headers in Next.js
   - Use CDN for static assets

### Monitoring & Logging

1. **PM2 Monitoring**

```bash
pm2 monit
pm2 logs bugflow-backend
```

2. **Error Tracking**
   - Add Sentry: https://sentry.io
   - Add LogRocket: https://logrocket.com

3. **Health Checks**
   - Backend already has `/api/health` endpoint
   - Configure uptime monitoring (UptimeRobot, Pingdom)

### Backups

1. **Database Backups**

```bash
# Automated daily backup
crontab -e

# Add this line (daily at 2 AM)
0 2 * * * mysqldump -u bugflow_user -p'your-password' bugflow > /var/backups/bugflow_$(date +\%Y\%m\%d).sql
```

2. **Cloudinary Assets**
   - Enable automatic backups in Cloudinary dashboard

---

## Docker Deployment (Optional)

### Backend Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

### Frontend Dockerfile (`bugflow/Dockerfile`)

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: bugflow
      MYSQL_USER: bugflow
      MYSQL_PASSWORD: bugflowpassword
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  backend:
    build:
      context: ./backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: "mysql://bugflow:bugflowpassword@mysql:3306/bugflow?schema=public"
      PORT: 3001
      NODE_ENV: production
      JWT_SECRET: "your-jwt-secret"
      CORS_ORIGIN: "http://localhost:3000"
      FRONTEND_URL: "http://localhost:3000"
    depends_on:
      - mysql

  frontend:
    build:
      context: ./bugflow
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: "http://localhost:3001/api"
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001"
      NEXT_PUBLIC_SOCKET_URL: "http://localhost:3001"
    depends_on:
      - backend

volumes:
  mysql_data:
```

### Start with Docker Compose

```bash
docker-compose up -d
```

---

## CI/CD Pipeline (Optional)

### GitHub Actions Example (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Deploy Backend to Railway
        uses: railwayapp/action@v1
        with:
          service: backend
          token: ${{ secrets.RAILWAY_TOKEN }}

      - name: Deploy Frontend to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify `DATABASE_URL` is correct
   - Check if database server is running
   - Verify firewall/security group settings

2. **CORS Errors**
   - Check `CORS_ORIGIN` matches frontend domain exactly
   - Include protocol (https://)

3. **WebSocket Connection Issues**
   - Make sure reverse proxy (Nginx) supports WebSocket
   - Check `NEXT_PUBLIC_SOCKET_URL` is correct

4. **Prisma Migrations Fail**
   - Run `npx prisma migrate resolve` if needed
   - Check database user permissions

5. **File Uploads Fail**
   - Verify Cloudinary credentials
   - Check file size limits

### Logs

```bash
# Backend logs
pm2 logs bugflow-backend

# Docker logs
docker-compose logs backend
docker-compose logs frontend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Post-Deployment Checklist

- [ ] Backend and frontend are deployed
- [ ] Database is connected and migrations run
- [ ] SSL certificates are installed and valid
- [ ] Environment variables are set correctly
- [ ] Email sending works (test password reset)
- [ ] File uploads work (test attachment)
- [ ] Real-time features work (Socket.IO)
- [ ] CORS is properly configured
- [ ] Backups are set up
- [ ] Monitoring is in place
- [ ] Security headers are applied
- [ ] Performance is optimized

---

## Support

For issues or questions:
- Check the logs first
- Review this guide
- Check GitHub Issues (if applicable)

---

## License

[Your License Here]
