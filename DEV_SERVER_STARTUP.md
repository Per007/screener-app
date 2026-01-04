# ESG Portfolio Screening Application - Development Server Startup Guide

## AI AGENT: RUN THESE COMMANDS DIRECTLY (DO NOT CREATE SCRIPTS)

### Backend Command (run in terminal, wait for it to start):

**PowerShell (Windows - Recommended):**
```powershell
cd C:/Users/stuur/MY_CODE/SCREENER_APP; npx ts-node src/index.ts
```

**Bash/Git Bash (Alternative):**
```bash
cd C:/Users/stuur/MY_CODE/SCREENER_APP && npx ts-node src/index.ts
```

**Success:** Shows `ESG Screener API running on port 3000`

### Frontend Command (run in a SECOND terminal):

**PowerShell (Windows - Recommended):**
```powershell
cd C:/Users/stuur/MY_CODE/SCREENER_APP/esg-frontend; npm run dev
```

**Bash/Git Bash (Alternative):**
```bash
cd C:/Users/stuur/MY_CODE/SCREENER_APP/esg-frontend && npm run dev
```

**Success:** Shows `Local: http://localhost:5173/`

### Login Credentials:

- **URL:** http://localhost:5173
- **Email:** `admin@example.com`
- **Password:** `admin123`

---

## ONLY IF ERRORS OCCUR

### Error: "Cannot find module @prisma/client"

**PowerShell (Windows - Recommended):**
```powershell
cd C:/Users/stuur/MY_CODE/SCREENER_APP; npx prisma generate
```

**Bash/Git Bash (Alternative):**
```bash
cd C:/Users/stuur/MY_CODE/SCREENER_APP && npx prisma generate
```

Then retry the backend command above.

### Error: Port already in use

```bash
npx kill-port 3000 5173
```

### Error: Database not found (CAUTION: This resets data)

**PowerShell (Windows - Recommended):**
```powershell
cd C:/Users/stuur/MY_CODE/SCREENER_APP; npx prisma db push; npx prisma db seed
```

**Bash/Git Bash (Alternative):**
```bash
cd C:/Users/stuur/MY_CODE/SCREENER_APP && npx prisma db push && npx prisma db seed
```

---

## Detailed Instructions (For Humans)

### Shell Compatibility

This project runs on **Windows**. Commands work in:
- **PowerShell** (default on Windows) - Use `;` to chain commands
- **Bash/Git Bash/WSL** - Use `&&` to chain commands
- All use forward slashes `/` which work everywhere

**Important:** PowerShell does NOT support `&&` - use `;` instead. Bash uses `&&`.

---

## Test Credentials

Use these credentials to log in:

| Role    | Email               | Password    | Access Level |
| ------- | ------------------- | ----------- | ------------ |
| Admin   | admin@example.com   | admin123    | Full access  |
| Analyst | analyst@example.com | analyst123  | Limited      |

---

## Available NPM Scripts

### Backend Scripts (in `C:\Users\stuur\MY_CODE\SCREENER_APP`)

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start with nodemon (auto-restart)        |
| `npm run build`      | Compile TypeScript to JavaScript         |
| `npm start`          | Run compiled production build            |
| `npm run db:generate`| Generate Prisma client                   |
| `npm run db:push`    | Push schema changes to database          |
| `npm run db:seed`    | Seed database with test data             |

### Frontend Scripts (in `C:\Users\stuur\MY_CODE\SCREENER_APP\esg-frontend`)

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start Vite development server      |
| `npm run build`   | Build for production               |
| `npm run preview` | Preview production build           |
| `npm run lint`    | Run ESLint                         |

---

## Troubleshooting Guide

### Port Already In Use

**Windows (PowerShell):**

```powershell
# Find process using port 3000
netstat -ano | findstr :3000
# Note the PID (last column), then kill it:
taskkill /PID <PID> /F

# Find process using port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Alternative: Use npx kill-port (cross-platform)
npx kill-port 3000
npx kill-port 5173
```

**macOS/Linux (Bash):**

```bash
# Kill process on port 3000
lsof -ti :3000 | xargs kill -9

# Kill process on port 5173
lsof -ti :5173 | xargs kill -9

# Alternative: Use npx kill-port (cross-platform)
npx kill-port 3000
npx kill-port 5173
```

### Database Connection Issues

**Windows (PowerShell):**

```powershell
cd C:\Users\stuur\MY_CODE\SCREENER_APP

# Remove existing database file
Remove-Item dev.db -ErrorAction SilentlyContinue

# Recreate database
npx prisma db push
npx prisma db seed

# Restart backend
npm run dev
```

**macOS/Linux (Bash):**

```bash
cd /path/to/SCREENER_APP

# Remove existing database file
rm -f dev.db

# Recreate database
npx prisma db push
npx prisma db seed

# Restart backend
npm run dev
```

### Missing Dependencies

**Cross-platform:**

```powershell
# Backend
cd C:\Users\stuur\MY_CODE\SCREENER_APP
npm install
npx prisma generate

# Frontend
cd C:\Users\stuur\MY_CODE\SCREENER_APP\esg-frontend
npm install
```

### Frontend Dependency Conflicts

**Windows (PowerShell):**

```powershell
cd C:\Users\stuur\MY_CODE\SCREENER_APP\esg-frontend

# Remove node_modules and package-lock.json
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# Reinstall
npm install
npm run dev
```

**macOS/Linux (Bash):**

```bash
cd /path/to/SCREENER_APP/esg-frontend

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
npm run dev
```

### Prisma Client Not Generated

```powershell
cd C:\Users\stuur\MY_CODE\SCREENER_APP
npx prisma generate
npm run dev
```

---

## Success Indicators

### Backend is ready when:

- Console shows: `ESG Screener API running on port 3000`
- Health endpoint returns: `{"status":"ok"}`
- No error messages in console

### Frontend is ready when:

- Console shows: `VITE ready in XXX ms`
- Console shows: `Local: http://localhost:5173/`
- Browser displays login page at http://localhost:5173
- No JavaScript errors in browser console (F12 → Console tab)

---

## Shutdown Process

### Graceful Shutdown

1. **Frontend**: Press `Ctrl+C` in frontend terminal
2. **Backend**: Press `Ctrl+C` in backend terminal
3. Both servers should stop cleanly

### Force Shutdown (if needed)

**Cross-platform:**

```powershell
npx kill-port 3000 5173
```

---

## Database Management

### View Database Contents

```powershell
cd C:\Users\stuur\MY_CODE\SCREENER_APP
npx prisma studio
```

This opens a browser-based database viewer at http://localhost:5555

### Reset Database Completely

**Windows (PowerShell):**

```powershell
cd C:\Users\stuur\MY_CODE\SCREENER_APP
Remove-Item dev.db -ErrorAction SilentlyContinue
npx prisma db push
npx prisma db seed
```

**macOS/Linux (Bash):**

```bash
cd /path/to/SCREENER_APP
rm -f dev.db
npx prisma db push
npx prisma db seed
```

---

## API Testing

### Test Authentication

**Windows (PowerShell):**

```powershell
$body = @{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3000/auth/login -Method POST -Body $body -ContentType "application/json" | Select-Object -ExpandProperty Content
```

**macOS/Linux (Bash) or curl:**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

---

## Related Documentation

| Document                        | Description                    |
| ------------------------------- | ------------------------------ |
| `NEW_ENDPOINTS_DOCUMENTATION.md`| API endpoint reference         |
| `IMPLEMENTATION_SUMMARY.md`     | Implementation details         |
| `TESTING_GUIDE.md`              | Testing procedures             |
| `SAMPLE_MOCK_DATA.md`           | Sample data reference          |
| `README.md`                     | Project overview               |

---

## Quick Reference Card

### AI Agents: Run These Directly (No Scripts)

**Terminal 1 (Backend) - PowerShell:**
```powershell
cd C:/Users/stuur/MY_CODE/SCREENER_APP; npx ts-node src/index.ts
```

**Terminal 1 (Backend) - Bash:**
```bash
cd C:/Users/stuur/MY_CODE/SCREENER_APP && npx ts-node src/index.ts
```

**Terminal 2 (Frontend) - PowerShell:**
```powershell
cd C:/Users/stuur/MY_CODE/SCREENER_APP/esg-frontend; npm run dev
```

**Terminal 2 (Frontend) - Bash:**
```bash
cd C:/Users/stuur/MY_CODE/SCREENER_APP/esg-frontend && npm run dev
```

**Login:** `admin@example.com` / `admin123`

**Note:** PowerShell uses `;` to chain commands, Bash uses `&&`. Choose the syntax that matches your shell.

---

**Last Updated**: January 2026  
**Version**: 2.0  
**Compatibility**: Windows (PowerShell), macOS, Linux
