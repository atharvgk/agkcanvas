# Collaborative Canvas

Vanilla HTML5 Canvas + Node.js + Socket.IO real-time multi-user drawing app with global undo/redo.

## Setup

1. Requirements: Node.js 18+
2. Install and start:
   - `npm install`
   - `npm start`
3. Open `http://localhost:3000`
4. To test multiple users, open the URL in multiple browser windows or tabs. Use the room creation/joining UI to collaborate.

## Features

- Brush and eraser, color and stroke size
- Real-time strokes streaming (chunked points) and client-side rendering
- Live cursors for other users
- User list with color assignment (hidden in solo mode)
- Global undo/redo (affects last finalized operation across all users in the room)
- Room support: Create rooms, join existing rooms, or draw solo
- Solo mode: Private canvas with sidebar hidden

## Known Limitations

- Global undo/redo uses a simple last-finalized op policy (LIFO); not per-user
- No persistence across server restarts
- Minimal smoothing; point-to-point segments (adequate but improvable)
- No touch-specific gestures (basic pointer events work on mobile)

## Time Spent

~4-6 hours initial implementation and documentation.

## Scripts

- `npm start`: build and run server
- `npm run dev`: TypeScript watch (server not auto-restarted)
- `npm run build:client`: Build client files only (for Vercel deployment)

## Tech Stack

- Frontend: Vanilla TS + HTML5 Canvas
- Backend: Node.js (Express) + Socket.IO
- No UI frameworks, no drawing libraries

## Deployment

**Important:** This app requires WebSocket support. Vercel's serverless functions don't support WebSockets.

### Recommended: Split Deployment

1. **Frontend on Vercel:**
   - Deploy the `dist/client` directory to Vercel
   - Update WebSocket URL in client code to point to backend

2. **Backend on WebSocket-compatible platform:**
   - Railway (recommended): https://railway.app
   - Render: https://render.com
   - Fly.io: https://fly.io
   - Heroku: https://heroku.com

See `DEPLOYMENT.md` for detailed deployment instructions.

### Setting WebSocket URL for Production

Before deploying frontend, update `client/websocket.ts` or inject the URL:

```html
<script>
  window.__WS_URL__ = 'https://your-backend-url.com';
</script>
<script src="/socket.io/socket.io.js"></script>
```
