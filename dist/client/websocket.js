export function connectWS(roomId, handlers, create = false) {
    const ioGlobal = window.io;
    const wsUrl = process.env.REACT_APP_WS_URL
        ? process.env.REACT_APP_WS_URL.replace('https://', 'wss://')
        : window.location.origin.replace('http', 'ws');
    const socket = ioGlobal(wsUrl);
    const presenceUsers = new Map();
    socket.on('connect', () => {
        socket.emit('join', { roomId, create });
    });
    socket.on('init', (init) => {
        presenceUsers.clear();
        if (init.users) {
            for (const user of init.users) {
                presenceUsers.set(user.userId, user);
            }
        }
        else {
            presenceUsers.set(init.userId, { userId: init.userId, username: init.username, color: init.color });
        }
        handlers.onInit(init);
    });
    socket.on('roomError', (error) => {
        if (handlers.onRoomError) {
            handlers.onRoomError(error);
        }
    });
    socket.on('strokeChunk', (chunk) => {
        handlers.onStrokeChunk(chunk);
    });
    socket.on('undo', (payload) => {
        handlers.onUndo(payload);
    });
    socket.on('redo', (payload) => {
        handlers.onRedo(payload);
    });
    socket.on('presence', (evt) => {
        if (evt.type === 'join') {
            presenceUsers.set(evt.user.userId, evt.user);
        }
        else if (evt.type === 'leave') {
            presenceUsers.delete(evt.user.userId);
        }
        handlers.onPresence();
    });
    socket.on('cursor', (cursor) => {
        handlers.onCursor(cursor);
    });
    return {
        socket,
        presence: {
            getUsers: () => Array.from(presenceUsers.values())
        },
        api: {
            sendStrokeChunk: (chunk) => socket.emit('strokeChunk', chunk),
            sendCursor: (cursor) => socket.emit('cursor', cursor),
            undo: () => socket.emit('undo'),
            redo: () => socket.emit('redo'),
            switchRoom: (newRoomId, create = false) => {
                socket.emit('join', { roomId: newRoomId, create });
            },
            updateHandlers: (newHandlers) => {
                socket.removeAllListeners('init');
                socket.removeAllListeners('roomError');
                socket.on('init', (init) => {
                    presenceUsers.clear();
                    if (init.users) {
                        for (const user of init.users) {
                            presenceUsers.set(user.userId, user);
                        }
                    }
                    else {
                        presenceUsers.set(init.userId, { userId: init.userId, username: init.username, color: init.color });
                    }
                    newHandlers.onInit(init);
                });
                if (newHandlers.onRoomError) {
                    socket.on('roomError', (error) => {
                        newHandlers.onRoomError(error);
                    });
                }
            }
        }
    };
}
//# sourceMappingURL=websocket.js.map