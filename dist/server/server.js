import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { RoomsManager } from './rooms.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const clientDir = path.resolve(__dirname, '../client');
app.use('/', express.static(clientDir));
const roomsManager = new RoomsManager(io);
io.on('connection', socket => {
    roomsManager.handleConnection(socket);
});
server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map