# Deployment Guide

## Important: WebSocket Limitation on Vercel

**Vercel does not support WebSocket connections in serverless functions.** This application requires persistent WebSocket connections (Socket.IO) for real-time collaboration, which cannot run on Vercel's serverless platform.

## Recommended Deployment Strategy

### Option 1: Split Deployment (Recommended)

**Frontend on Vercel + Backend on a WebSocket-compatible platform**

1. **Deploy Frontend to Vercel:**
   - The frontend (static files) can be deployed to Vercel
   - Update the WebSocket connection URL in `client/websocket.ts` to point to your backend server

2. **Deploy Backend to a WebSocket-compatible platform:**
   - **Railway** (recommended): https://railway.app
   - **Render**: https://render.com
   - **Fly.io**: https://fly.io
   - **Heroku**: https://heroku.com
   - **DigitalOcean App Platform**: https://www.digitalocean.com/products/app-platform

### Option 2: Full Stack on One Platform

Deploy both frontend and backend together on a platform that supports WebSockets:

- **Railway**: Supports Node.js with WebSockets
- **Render**: Supports persistent WebSocket connections
- **Fly.io**: Good for WebSocket applications
- **DigitalOcean App Platform**: Full-stack deployment

## Deployment Steps

### For Vercel (Frontend Only)

1. Install Vercel CLI: `npm i -g vercel`
2. Build the project: `npm run build`
3. Deploy: `vercel --prod`

**Note:** You'll need to update the WebSocket URL in the client code to point to your backend server.

### For Railway (Backend)

1. Create account at https://railway.app
2. Create new project from GitHub repo
3. Railway will auto-detect Node.js
4. Set environment variable: `PORT` (Railway provides this automatically)
5. Deploy

### For Render (Backend)

1. Create account at https://render.com
2. Create new Web Service
3. Connect your GitHub repo
4. Build command: `npm run build`
5. Start command: `node dist/server/server.js`
6. Set environment: `NODE_ENV=production`

## Environment Variables

For the backend server, you may need:
- `PORT`: Server port (usually provided by platform)
- `NODE_ENV`: Set to `production`

## Updating WebSocket URL

After deploying the backend, you need to set the WebSocket URL. The app is configured to read it from `window.__WS_URL__`.

### Option 1: Set in HTML (Recommended)

Before deploying to Vercel, update `client/index.html`:

```html
<script>
  window.__WS_URL__ = 'https://your-backend-url.com';
</script>
```

### Option 2: Use Vercel Environment Variables

If you need different URLs for different environments, you can inject it during build or use a build-time replacement.

### Option 3: Update websocket.ts directly

Edit `client/websocket.ts` line 30:
```typescript
const wsUrl = 'https://your-backend-url.com' || (window as any).__WS_URL__ || undefined;
```

## Testing the Fixes

All the fixes implemented will work on any platform that supports WebSockets:

1. ✅ Solo mode hides user sidebar
2. ✅ All users see complete user list when joining
3. ✅ Room existence validation (can't join non-existent rooms)

These fixes are platform-agnostic and will work wherever you deploy the WebSocket server.

