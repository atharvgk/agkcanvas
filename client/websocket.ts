type Socket = any;

type InitPayload = {
	roomId: string;
	userId: string;
	username: string;
	color: string;
	operations: any[];
	users?: Array<{ userId: string; username: string; color: string }>;
};

type PresenceEvent =
	| { type: 'join'; user: { userId: string; username: string; color: string } }
	| { type: 'leave'; user: { userId: string; username: string; color: string } };

export function connectWS(
	roomId: string,
	handlers: {
		onInit: (init: InitPayload) => void;
		onStrokeChunk: (chunk: any) => void;
		onUndo: (payload: { opId: string }) => void;
		onRedo: (payload: { operation: any }) => void;
		onPresence: () => void;
		onCursor: (c: { userId: string; color: string; x: number; y: number; pressure?: number }) => void;
		onRoomError?: (error: { message: string }) => void;
	},
	create: boolean = false
) {
	const ioGlobal = (window as any).io as (url?: string) => Socket;
	const wsUrl = (window as any).__WS_URL__ || undefined;
	const socket: Socket = ioGlobal(wsUrl);

	const presenceUsers = new Map<string, { userId: string; username: string; color: string }>();

	socket.on('connect', () => {
		socket.emit('join', { roomId, create });
	});

	socket.on('init', (init: InitPayload) => {
		presenceUsers.clear();
		if (init.users) {
			for (const user of init.users) {
				presenceUsers.set(user.userId, user);
			}
		} else {
			presenceUsers.set(init.userId, { userId: init.userId, username: init.username, color: init.color });
		}
		handlers.onInit(init);
	});
	
	socket.on('roomError', (error: { message: string }) => {
		if (handlers.onRoomError) {
			handlers.onRoomError(error);
		}
	});

	socket.on('strokeChunk', (chunk: any) => {
		handlers.onStrokeChunk(chunk);
	});

	socket.on('undo', (payload: { opId: string }) => {
		handlers.onUndo(payload);
	});

	socket.on('redo', (payload: { operation: any }) => {
		handlers.onRedo(payload);
	});

	socket.on('presence', (evt: PresenceEvent) => {
		if (evt.type === 'join') {
			presenceUsers.set(evt.user.userId, evt.user);
		} else if (evt.type === 'leave') {
			presenceUsers.delete(evt.user.userId);
		}
		handlers.onPresence();
	});

	socket.on('cursor', (cursor: any) => {
		handlers.onCursor(cursor);
	});

		return {
			socket,
			presence: {
				getUsers: () => Array.from(presenceUsers.values())
			},
			api: {
				sendStrokeChunk: (chunk: any) => socket.emit('strokeChunk', chunk),
				sendCursor: (cursor: any) => socket.emit('cursor', cursor),
				undo: () => socket.emit('undo'),
				redo: () => socket.emit('redo'),
				switchRoom: (newRoomId: string, create: boolean = false) => {
					socket.emit('join', { roomId: newRoomId, create });
				},
				updateHandlers: (newHandlers: typeof handlers) => {
					socket.removeAllListeners('init');
					socket.removeAllListeners('roomError');
					socket.on('init', (init: InitPayload) => {
						presenceUsers.clear();
						if (init.users) {
							for (const user of init.users) {
								presenceUsers.set(user.userId, user);
							}
						} else {
							presenceUsers.set(init.userId, { userId: init.userId, username: init.username, color: init.color });
						}
						newHandlers.onInit(init);
					});
					if (newHandlers.onRoomError) {
						socket.on('roomError', (error: { message: string }) => {
							newHandlers.onRoomError!(error);
						});
					}
				}
			}
		};
}


