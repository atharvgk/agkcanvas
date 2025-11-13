export class DrawingState {
    constructor() {
        this.operations = [];
        this.redoStack = [];
    }
    getUserCount() {
        const set = new Set(this.operations.map(o => o.userId));
        return Math.max(1, set.size);
    }
    getOperationsSnapshot() {
        return this.operations.map(op => ({ ...op, points: op.points.map(p => ({ ...p })) }));
    }
    addOrAppendOperation(incoming) {
        const existingIndex = this.operations.findIndex(o => o.id === incoming.id);
        if (existingIndex >= 0) {
            const existing = this.operations[existingIndex];
            if (!existing.revoked) {
                existing.points.push(...incoming.points);
                if (incoming.isFinal)
                    existing.isFinal = true;
            }
            return false;
        }
        this.redoStack = [];
        this.operations.push({ ...incoming, points: [...incoming.points] });
        return true;
    }
    undo() {
        for (let i = this.operations.length - 1; i >= 0; i--) {
            const op = this.operations[i];
            if (!op.revoked && op.isFinal) {
                op.revoked = true;
                this.redoStack.push(op);
                return op;
            }
        }
        return null;
    }
    redo() {
        while (this.redoStack.length > 0) {
            const op = this.redoStack.pop();
            if (op.revoked) {
                op.revoked = false;
                return op;
            }
        }
        return null;
    }
}
//# sourceMappingURL=state.js.map