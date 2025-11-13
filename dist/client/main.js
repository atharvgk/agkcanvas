import { connectWS } from './websocket.js';
import { CanvasController } from './canvas.js';
const canvasEl = document.getElementById('canvas');
const usersEl = document.getElementById('users');
const sidebarEl = document.querySelector('.sidebar');
const roomLabelEl = document.getElementById('roomLabel');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const toolBrushBtn = document.getElementById('toolBrush');
const toolEraserBtn = document.getElementById('toolEraser');
const colorEl = document.getElementById('color');
const sizeEl = document.getElementById('size');
const sizeValueEl = document.getElementById('sizeValue');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const roomModal = document.getElementById('roomModal');
const soloBtn = document.getElementById('soloBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomNameInput = document.getElementById('roomNameInput');
const changeRoomBtn = document.getElementById('changeRoomBtn');
let currentRoomId = null;
let wsConnection = null;
let currentUserId = null;
const canvasController = new CanvasController(canvasEl);
canvasController.setColor(colorEl.value);
canvasController.setSize(parseInt(sizeEl.value, 10));
if (sizeValueEl)
    sizeValueEl.textContent = `${parseInt(sizeEl.value, 10)}px`;
let currentTool = 'brush';
setTool('brush');
toolBrushBtn.onclick = () => setTool('brush');
toolEraserBtn.onclick = () => setTool('eraser');
colorEl.onchange = () => canvasController.setColor(colorEl.value);
sizeEl.oninput = () => {
    canvasController.setSize(parseInt(sizeEl.value, 10));
    if (sizeValueEl)
        sizeValueEl.textContent = `${parseInt(sizeEl.value, 10)}px`;
};
function showRoomModal() {
    roomModal.classList.remove('hidden');
    roomNameInput.value = '';
}
function hideRoomModal() {
    roomModal.classList.add('hidden');
}
let isSoloMode = false;
function joinRoom(roomId, solo = false, create = false) {
    isSoloMode = solo;
    if (wsConnection) {
        canvasController.resetAndReplay([]);
        wsConnection.api.updateHandlers({
            onInit: init => {
                currentUserId = init.userId;
                currentRoomId = init.roomId;
                canvasController.setUser({ userId: init.userId, color: init.color });
                canvasController.setRoomId(init.roomId);
                canvasController.resetAndReplay(init.operations);
                renderUsers(wsConnection.presence.getUsers());
                updateRoomLabel(init.roomId, isSoloMode);
                hideRoomModal();
            },
            onStrokeChunk: chunk => {
                canvasController.applyRemoteChunk(chunk);
            },
            onUndo: ({ opId }) => {
                canvasController.applyUndo(opId);
            },
            onRedo: ({ operation }) => {
                canvasController.applyRedo(operation);
            },
            onPresence: () => renderUsers(wsConnection.presence.getUsers()),
            onCursor: c => canvasController.updateRemoteCursor(c),
            onRoomError: error => {
                alert(error.message);
            }
        });
        wsConnection.api.switchRoom(roomId, create);
        currentRoomId = roomId;
        updateRoomLabel(roomId, solo);
    }
    else {
        wsConnection = connectWS(roomId, {
            onInit: init => {
                currentUserId = init.userId;
                currentRoomId = init.roomId;
                canvasController.setUser({ userId: init.userId, color: init.color });
                canvasController.setRoomId(init.roomId);
                canvasController.resetAndReplay(init.operations);
                renderUsers(wsConnection.presence.getUsers());
                updateRoomLabel(init.roomId, isSoloMode);
                hideRoomModal();
                setOnline(true);
            },
            onStrokeChunk: chunk => {
                canvasController.applyRemoteChunk(chunk);
            },
            onUndo: ({ opId }) => {
                canvasController.applyUndo(opId);
            },
            onRedo: ({ operation }) => {
                canvasController.applyRedo(operation);
            },
            onPresence: () => renderUsers(wsConnection.presence.getUsers()),
            onCursor: c => canvasController.updateRemoteCursor(c),
            onRoomError: error => {
                alert(error.message);
            }
        }, create);
        canvasController.onLocalStrokeChunk = chunk => wsConnection.api.sendStrokeChunk(chunk);
        canvasController.onLocalCursor = cursor => wsConnection.api.sendCursor(cursor);
        // connection indicators
        wsConnection.socket.on('connect', () => setOnline(true));
        wsConnection.socket.on('disconnect', () => setOnline(false));
    }
}
function updateRoomLabel(roomId, isSolo) {
    if (isSolo) {
        roomLabelEl.textContent = 'Solo Mode';
        sidebarEl.style.display = 'none';
        const canvas = document.getElementById('canvas');
        canvas.style.left = '0';
        canvas.style.width = '100vw';
    }
    else {
        roomLabelEl.textContent = `Room: ${roomId}`;
        sidebarEl.style.display = 'block';
        const canvas = document.getElementById('canvas');
        canvas.style.left = '200px';
        canvas.style.width = 'calc(100vw - 200px)';
    }
    setTimeout(() => {
        canvasController.resizeCanvas();
    }, 0);
}
function renderUsers(users) {
    usersEl.innerHTML = '';
    for (const u of users) {
        const li = document.createElement('li');
        li.textContent = u.username;
        li.style.borderLeft = `6px solid ${u.color}`;
        li.style.paddingLeft = '6px';
        usersEl.appendChild(li);
    }
}
function setOnline(isOnline) {
    if (!statusDot || !statusText)
        return;
    statusDot.classList.toggle('online', isOnline);
    statusDot.classList.toggle('offline', !isOnline);
    statusText.textContent = isOnline ? 'Online' : 'Offline';
}
function setTool(tool) {
    currentTool = tool;
    canvasController.setTool(tool);
    toolBrushBtn.classList.toggle('active', tool === 'brush');
    toolEraserBtn.classList.toggle('active', tool === 'eraser');
}
soloBtn.onclick = () => {
    const soloRoomId = `solo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    joinRoom(soloRoomId, true, true);
};
createRoomBtn.onclick = () => {
    const roomName = roomNameInput.value.trim();
    if (roomName) {
        joinRoom(roomName, false, true);
    }
    else {
        alert('Please enter a room name');
    }
};
joinRoomBtn.onclick = () => {
    const roomName = roomNameInput.value.trim();
    if (roomName) {
        joinRoom(roomName, false, false);
    }
    else {
        alert('Please enter a room name');
    }
};
roomNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const roomName = roomNameInput.value.trim();
        if (roomName) {
            joinRoom(roomName, false);
        }
    }
});
changeRoomBtn.onclick = () => {
    showRoomModal();
};
undoBtn.onclick = () => {
    if (wsConnection) {
        wsConnection.api.undo();
    }
};
redoBtn.onclick = () => {
    if (wsConnection) {
        wsConnection.api.redo();
    }
};
const resize = () => canvasController.resizeCanvas();
window.addEventListener('resize', resize);
resize();
showRoomModal();
//# sourceMappingURL=main.js.map