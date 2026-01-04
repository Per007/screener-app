# ESG Screener - Production Deployment Guide

This guide walks you through deploying the ESG Screener application with:
- **Frontend**: GitHub Pages (free static hosting)
- **Backend**: Render (free tier Node.js hosting)
- **Database**: Supabase PostgreSQL (free tier)

## Prerequisites

- GitHub account with repository pushed
- Node.js 18+ installed locally

---

## Step 1: Set Up Supabase (Database)

### 1.1 Create Supabase Account & Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization (or create one)
4. Fill in:
   - **Project name**: `esg-screener` (or your preference)
   - **Database password**: Generate a strong password and **save it securely**
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait for setup (~2 minutes)

### 1.2 Get Database Connection String

1. In your Supabase project dashboard, go to **Settings** (gear icon)
2. Click **Database** in the left sidebar
3. Scroll to **Connection string** section
4. Click **URI** tab
5. Copy the connection string - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with your actual database password

### 1.3 Create Local Environment File

Create a `.env` file in the project root (NOT in version control):

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres"
JWT_SECRET="generate-a-random-32-char-string-here"
FRONTEND_URL="http://localhost:5173"
PORT=3000
NODE_ENV=development
```

> **Tip**: Generate a JWT secret with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 1.4 Push Schema to Supabase

Run these commands from the project root:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase (creates all tables)
npm run db:push

# Seed initial data (optional - creates test users and data)
npm run db:seed
```

You should see output indicating tables were created successfully.

---

## Step 2: Deploy Backend to Render

### 2.1 Create Render Account

1. Go to [render.com](https://render.com) and sign up/login
2. Connect your GitHub account when prompted

### 2.2 Create Web Service

1. Click **New +** → **Web Service**
2. Connect your GitHub repository (`SCREENER_APP`)
3. Configure the service:
   - **Name**: `esg-screener-api`
   - **Region**: Choose closest to your Supabase region
   - **Branch**: `main`
   - **Root Directory**: Leave empty (uses repo root)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### 2.3 Set Environment Variables

In the Render dashboard, go to **Environment** tab and add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Supabase connection string |
| `JWT_SECRET` | A secure random string (32+ characters) |
| `FRONTEND_URL` | `https://YOUR_GITHUB_USERNAME.github.io` |
| `NODE_ENV` | `production` |

> **Important**: The `FRONTEND_URL` should be your GitHub Pages URL without trailing slash

### 2.4 Deploy

1. Click **Create Web Service**
2. Wait for the build and deployment (~3-5 minutes)
3. Once deployed, note your service URL (e.g., `https://esg-screener-api.onrender.com`)
4. Test the health check: `https://your-service.onrender.com/health`

---

## Step 3: Deploy Frontend to GitHub Pages

### 3.1 Create Frontend Environment File

Create `esg-frontend/.env.production` (NOT in version control):

```env
VITE_API_BASE_URL=https://esg-screener-api.onrender.com
```

Replace with your actual Render URL from Step 2.

### 3.2 Add GitHub Secret

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: Your Render backend URL (e.g., `https://esg-screener-api.onrender.com`)

### 3.3 Enable GitHub Pages

1. Go to your repository → **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Save

### 3.4 Trigger Deployment

The workflow triggers automatically on push to `main` when files in `esg-frontend/` change.

To trigger manually:
1. Go to **Actions** tab
2. Select **Deploy Frontend to GitHub Pages**
3. Click **Run workflow** → **Run workflow**

### 3.5 Access Your App

Once deployed, your app will be available at:
```
https://YOUR_GITHUB_USERNAME.github.io/SCREENER_APP/
```

---

## Step 4: Verify Deployment

### 4.1 Backend Health Check

Visit: `https://your-render-url.onrender.com/health`

Expected response:
```json
{"status":"ok"}
```

### 4.2 Frontend Access

Visit: `https://YOUR_USERNAME.github.io/SCREENER_APP/`

You should see the login page.

### 4.3 Test Login

If you ran the seed script, use these test credentials:
- **Email**: `admin@example.com`
- **Password**: `password123`

### 4.4 Troubleshooting

**CORS Errors**: Ensure `FRONTEND_URL` in Render matches your GitHub Pages URL exactly

**API Connection Failed**: 
- Check Render logs for errors
- Verify `VITE_API_BASE_URL` secret is set correctly
- Ensure the Render service is running (free tier spins down after inactivity)

**404 on Page Refresh**: The 404.html redirect should handle this. If not, check the file was deployed correctly.

**Render Cold Start**: Free tier services spin down after 15 minutes of inactivity. First request may take 30-60 seconds.

---

## Environment Variables Summary

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase PostgreSQL connection string | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres` |
| `JWT_SECRET` | Secret for JWT token signing | Random 32+ character string |
| `FRONTEND_URL` | GitHub Pages URL for CORS | `https://username.github.io` |
| `PORT` | Server port (auto-set by Render) | `3000` |
| `NODE_ENV` | Environment mode | `production` |

### Frontend (GitHub Secrets)

| Secret | Description | Example |
|--------|-------------|---------|
| `VITE_API_BASE_URL` | Render backend URL | `https://esg-screener-api.onrender.com` |

---

## Updating Your Deployment

### Backend Updates
Push to `main` branch → Render auto-deploys

### Frontend Updates
Push to `main` with changes in `esg-frontend/` → GitHub Actions auto-deploys

### Database Schema Changes
1. Update `prisma/schema.prisma`
2. Run `npm run db:push` locally with production `DATABASE_URL`
3. Or run migrations if using `prisma migrate`

---

## Cost Summary (Free Tier Limits)

| Service | Free Tier | Limitations |
|---------|-----------|-------------|
| **GitHub Pages** | Unlimited | Static files only |
| **Render** | 750 hours/month | Spins down after 15min inactivity |
| **Supabase** | 500MB database, 2 projects | Pauses after 1 week inactivity |

For production use, consider upgrading to paid tiers for better performance and reliability.
