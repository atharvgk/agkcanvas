export class CanvasController {
    constructor(canvas) {
        this.tool = 'brush';
        this.color = '#3b82f6';
        this.size = 8;
        this.isDrawing = false;
        this.currentOpId = null;
        this.user = null;
        this.roomId = 'default';
        this.operations = [];
        this.cursors = new Map();
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('2D context not supported');
        this.ctx = ctx;
        this.attachEvents();
    }
    setUser(user) {
        this.user = user;
    }
    setRoomId(roomId) {
        this.roomId = roomId;
    }
    setTool(tool) {
        this.tool = tool;
    }
    setColor(color) {
        this.color = color;
    }
    setSize(size) {
        this.size = size;
    }
    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = Math.floor(rect.width * dpr);
        this.canvas.height = Math.floor(rect.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.redrawAll();
    }
    resetAndReplay(operations) {
        this.operations = operations.map(o => ({ ...o, points: o.points.map(p => ({ ...p })) }));
        this.redrawAll();
    }
    applyRemoteChunk(chunk) {
        let op = this.operations.find(o => o.id === chunk.opId);
        if (!op) {
            op = {
                id: chunk.opId,
                userId: chunk.userId,
                tool: chunk.tool,
                color: chunk.color,
                size: chunk.size,
                points: [],
                isFinal: false
            };
            this.operations.push(op);
        }
        op.points.push(...chunk.points);
        if (chunk.isFinal)
            op.isFinal = true;
        this.drawChunk(chunk);
    }
    applyUndo(opId) {
        const op = this.operations.find(o => o.id === opId);
        if (op) {
            op.revoked = true;
            this.redrawAll();
        }
    }
    applyRedo(operation) {
        let op = this.operations.find(o => o.id === operation.id);
        if (op) {
            op.revoked = false;
        }
        else {
            this.operations.push({ ...operation, points: operation.points.map(p => ({ ...p })) });
        }
        this.redrawAll();
    }
    updateRemoteCursor(c) {
        let el = this.cursors.get(c.userId);
        if (!el) {
            el = document.createElement('div');
            el.className = 'cursor';
            document.body.appendChild(el);
            this.cursors.set(c.userId, el);
        }
        const rect = this.canvas.getBoundingClientRect();
        el.style.left = `${rect.left + c.x}px`;
        el.style.top = `${rect.top + c.y}px`;
        el.style.borderColor = c.color;
        el.textContent = '';
    }
    attachEvents() {
        const toPoint = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                t: performance.now(),
                p: e.pressure
            };
        };
        this.canvas.addEventListener('pointerdown', e => {
            if (!this.user)
                return;
            this.isDrawing = true;
            this.currentOpId = crypto.randomUUID();
            this.canvas.setPointerCapture(e.pointerId);
            const p = toPoint(e);
            this.emitChunk([p], false);
            this.drawChunk({
                opId: this.currentOpId,
                userId: this.user.userId,
                roomId: this.roomId,
                tool: this.tool,
                color: this.color,
                size: this.size,
                points: [p]
            });
        });
        this.canvas.addEventListener('pointermove', e => {
            if (this.onLocalCursor) {
                const p = toPoint(e);
                this.onLocalCursor({ x: p.x, y: p.y, pressure: p.p });
            }
            if (!this.isDrawing || !this.user)
                return;
            const p = toPoint(e);
            this.emitChunk([p], false);
            this.drawChunk({
                opId: this.currentOpId,
                userId: this.user.userId,
                roomId: this.roomId,
                tool: this.tool,
                color: this.color,
                size: this.size,
                points: [p]
            });
        });
        this.canvas.addEventListener('pointerup', e => {
            if (!this.isDrawing || !this.user)
                return;
            this.isDrawing = false;
            const p = toPoint(e);
            this.emitChunk([p], true);
            this.currentOpId = null;
        });
        this.canvas.addEventListener('pointercancel', () => {
            this.isDrawing = false;
            if (this.currentOpId) {
                this.emitChunk([], true);
                this.currentOpId = null;
            }
        });
    }
    emitChunk(points, isFinal) {
        if (!this.user || !this.currentOpId)
            return;
        const chunk = {
            opId: this.currentOpId,
            userId: this.user.userId,
            roomId: this.roomId,
            tool: this.tool,
            color: this.color,
            size: this.size,
            points,
            isFinal
        };
        this.accumulateLocalOperation(chunk);
        if (this.onLocalStrokeChunk)
            this.onLocalStrokeChunk(chunk);
    }
    accumulateLocalOperation(chunk) {
        let op = this.operations.find(o => o.id === chunk.opId);
        if (!op) {
            op = {
                id: chunk.opId,
                userId: chunk.userId,
                tool: chunk.tool,
                color: chunk.color,
                size: chunk.size,
                points: [],
                isFinal: false
            };
            this.operations.push(op);
        }
        op.points.push(...chunk.points);
        if (chunk.isFinal)
            op.isFinal = true;
    }
    drawChunk(chunk) {
        this.ctx.save();
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = chunk.size;
        if (chunk.tool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)';
        }
        else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = chunk.color;
        }
        const op = this.operations.find(o => o.id === chunk.opId);
        const pts = op ? op.points : chunk.points;
        if (pts.length >= 2) {
            const a = pts[pts.length - 2];
            const b = pts[pts.length - 1];
            this.ctx.beginPath();
            this.ctx.moveTo(a.x, a.y);
            this.ctx.lineTo(b.x, b.y);
            this.ctx.stroke();
        }
        else if (pts.length === 1) {
            const a = pts[0];
            this.ctx.beginPath();
            this.ctx.arc(a.x, a.y, chunk.size / 2, 0, Math.PI * 2);
            this.ctx.fillStyle = chunk.tool === 'eraser' ? 'rgba(0,0,0,1)' : chunk.color;
            if (chunk.tool === 'eraser') {
                this.ctx.globalCompositeOperation = 'destination-out';
            }
            this.ctx.fill();
        }
        this.ctx.restore();
    }
    redrawAll() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (const op of this.operations) {
            if (op.revoked)
                continue;
            this.ctx.save();
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.lineWidth = op.size;
            if (op.tool === 'eraser') {
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.strokeStyle = 'rgba(0,0,0,1)';
                this.ctx.fillStyle = 'rgba(0,0,0,1)';
            }
            else {
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.strokeStyle = op.color;
                this.ctx.fillStyle = op.color;
            }
            for (let i = 1; i < op.points.length; i++) {
                const a = op.points[i - 1];
                const b = op.points[i];
                this.ctx.beginPath();
                this.ctx.moveTo(a.x, a.y);
                this.ctx.lineTo(b.x, b.y);
                this.ctx.stroke();
            }
            if (op.points.length === 1) {
                const a = op.points[0];
                this.ctx.beginPath();
                this.ctx.arc(a.x, a.y, op.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();
        }
    }
}
//# sourceMappingURL=canvas.js.map