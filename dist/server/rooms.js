import { v4 as uuidv4 } from 'uuid';
import { DrawingState } from './state.js';
export class RoomsManager {
    constructor(io) {
        this.io = io;
        this.roomIdToState = new Map();
        this.socketIdToUser = new Map();
        this.roomIdToUsers = new Map();
        this.roomExists = new Set();
        this.colorPool = [
            '#ef4444',
            '#f59e0b',
            '#10b981',
            '#3b82f6',
            '#8b5cf6',
            '#ec4899',
            '#14b8a6',
            '#22c55e'
        ];
    }
    handleConnection(socket) {
        socket.on('join', (payload) => {
            const oldUser = this.socketIdToUser.get(socket.id);
            if (oldUser) {
                socket.leave(oldUser.roomId);
                const roomUsers = this.roomIdToUsers.get(oldUser.roomId);
                if (roomUsers) {
                    roomUsers.delete(oldUser.userId);
                    if (roomUsers.size === 0) {
                        this.roomIdToUsers.delete(oldUser.roomId);
                        this.roomExists.delete(oldUser.roomId);
                    }
                }
                this.io.to(oldUser.roomId).emit('presence', {
                    type: 'leave',
                    user: { userId: oldUser.userId, username: oldUser.username, color: oldUser.color }
                });
            }
            const roomId = payload.roomId && payload.roomId.trim() ? payload.roomId : 'default';
            const isSolo = roomId.startsWith('solo-');
            if (!payload.create && !isSolo && !this.roomExists.has(roomId)) {
                socket.emit('roomError', { message: 'Room does not exist' });
                return;
            }
            const state = this.ensureRoom(roomId);
            const userId = oldUser ? oldUser.userId : uuidv4();
            const username = payload.username && payload.username.trim() ? payload.username : (oldUser ? oldUser.username : `User-${userId.slice(0, 4)}`);
            const color = oldUser ? oldUser.color : this.colorPool[state.getUserCount() % this.colorPool.length];
            let roomUsers = this.roomIdToUsers.get(roomId);
            if (!roomUsers) {
                roomUsers = new Map();
                this.roomIdToUsers.set(roomId, roomUsers);
            }
            this.socketIdToUser.set(socket.id, { userId, username, roomId, color });
            roomUsers.set(userId, { userId, username, color });
            if (!isSolo) {
                this.roomExists.add(roomId);
            }
            socket.join(roomId);
            const allUsers = Array.from(roomUsers.values());
            socket.emit('init', {
                roomId,
                userId,
                username,
                color,
                operations: state.getOperationsSnapshot(),
                users: allUsers
            });
            socket.to(roomId).emit('presence', {
                type: 'join',
                user: { userId, username, color }
            });
        });
        socket.on('cursor', (cursor) => {
            const user = this.socketIdToUser.get(socket.id);
            if (!user)
                return;
            this.io.to(user.roomId).emit('cursor', { userId: user.userId, color: user.color, ...cursor });
        });
        socket.on('strokeChunk', (chunk) => {
            const user = this.socketIdToUser.get(socket.id);
            if (!user)
                return;
            const state = this.roomIdToState.get(user.roomId);
            if (!state)
                return;
            const op = {
                id: chunk.opId,
                userId: user.userId,
                tool: chunk.tool,
                color: chunk.color,
                size: chunk.size,
                points: chunk.points,
                timestamp: Date.now(),
                isFinal: !!chunk.isFinal
            };
            const isNew = state.addOrAppendOperation(op);
            socket.to(user.roomId).emit('strokeChunk', { ...chunk });
        });
        socket.on('undo', () => {
            const user = this.socketIdToUser.get(socket.id);
            if (!user)
                return;
            const state = this.roomIdToState.get(user.roomId);
            if (!state)
                return;
            const undone = state.undo();
            if (undone) {
                this.io.to(user.roomId).emit('undo', { opId: undone.id });
            }
        });
        socket.on('redo', () => {
            const user = this.socketIdToUser.get(socket.id);
            if (!user)
                return;
            const state = this.roomIdToState.get(user.roomId);
            if (!state)
                return;
            const redone = state.redo();
            if (redone) {
                this.io.to(user.roomId).emit('redo', { opId: redone.id, operation: redone });
            }
        });
        socket.on('disconnect', () => {
            const user = this.socketIdToUser.get(socket.id);
            if (!user)
                return;
            this.socketIdToUser.delete(socket.id);
            const roomUsers = this.roomIdToUsers.get(user.roomId);
            if (roomUsers) {
                roomUsers.delete(user.userId);
                if (roomUsers.size === 0) {
                    this.roomIdToUsers.delete(user.roomId);
                    const isSolo = user.roomId.startsWith('solo-');
                    if (!isSolo) {
                        this.roomExists.delete(user.roomId);
                    }
                }
            }
            this.io.to(user.roomId).emit('presence', {
                type: 'leave',
                user: { userId: user.userId, username: user.username, color: user.color }
            });
        });
    }
    ensureRoom(roomId) {
        let state = this.roomIdToState.get(roomId);
        if (!state) {
            state = new DrawingState();
            this.roomIdToState.set(roomId, state);
        }
        return state;
    }
}
//# sourceMappingURL=rooms.js.map