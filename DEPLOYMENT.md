# 🚀 Backend Deployment Guide

## ⚠️ IMPORTANT: Production vs Development Commands

**❌ NEVER run these on production:**
```bash
npm run dev          # Uses nodemon + TypeScript (development only)
nodemon src/index.ts # Direct TypeScript execution (development only)
```

**✅ ALWAYS use these for production:**
```bash
npm run build        # Compile TypeScript to JavaScript
npm start           # Run compiled JavaScript
```

## 🌐 Railway Deployment

### 1. Environment Variables
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secure-random-string-here
CORS_ORIGIN=https://your-frontend-domain.vercel.app
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

### 2. Build Settings
- **Root Directory**: `backend`
- **Build Command**: `npm run build`  
- **Start Command**: `npm start`

### 3. Database Setup (One-time only)
After first deployment, run in Railway console:
```bash
npm run init-db-prod
npm run create-admin-prod
```

## 🔧 Render Deployment

### 1. Service Settings
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 2. Environment Variables
Same as Railway above.

## 📝 Troubleshooting

### Error: "nodemon: Permission denied"
**Cause**: Trying to run development command on production
**Fix**: Change start command from `npm run dev` to `npm start`

### Error: "Cannot find module './dist/index.js'"
**Cause**: TypeScript not compiled to JavaScript
**Fix**: Ensure `npm run build` runs before `npm start`

### Error: "EADDRINUSE: port already in use"
**Cause**: Another process using the same port
**Fix**: Use environment variable `PORT` provided by hosting platform
