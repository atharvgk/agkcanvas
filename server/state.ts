export type Point = { x: number; y: number; t: number; p?: number };

export type DrawingOperation = {
	id: string;
	userId: string;
	tool: 'brush' | 'eraser';
	color: string;
	size: number;
	points: Point[];
	timestamp: number;
	isFinal: boolean;
	revoked?: boolean;
};

export class DrawingState {
	private operations: DrawingOperation[];
	private redoStack: DrawingOperation[];

	constructor() {
		this.operations = [];
		this.redoStack = [];
	}

	getUserCount(): number {
		const set = new Set(this.operations.map(o => o.userId));
		return Math.max(1, set.size);
	}

	getOperationsSnapshot(): DrawingOperation[] {
		return this.operations.map(op => ({ ...op, points: op.points.map(p => ({ ...p })) }));
	}

	addOrAppendOperation(incoming: DrawingOperation): boolean {
		const existingIndex = this.operations.findIndex(o => o.id === incoming.id);
		if (existingIndex >= 0) {
			const existing = this.operations[existingIndex];
			if (!existing.revoked) {
				existing.points.push(...incoming.points);
				if (incoming.isFinal) existing.isFinal = true;
			}
			return false;
		}
		this.redoStack = [];
		this.operations.push({ ...incoming, points: [...incoming.points] });
		return true;
	}

	undo(): DrawingOperation | null {
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

	redo(): DrawingOperation | null {
		while (this.redoStack.length > 0) {
			const op = this.redoStack.pop()!;
			if (op.revoked) {
				op.revoked = false;
				return op;
			}
		}
		return null;
	}
}




