# Architecture Overview

## Data Flow

1. User draws on canvas; pointer events are sampled into points `{ x, y, t, p }`.
2. Client batches points into stroke chunks, tagged by an operation id (`opId`), and streams them via WebSocket:
   - `strokeChunk` with `{ opId, tool, color, size, points, isFinal }`
3. Server appends to the room's operation log (`DrawingState.addOrAppendOperation`) and broadcasts the chunk to other clients in the room immediately for real-time rendering.
4. Clients render incoming chunks incrementally and maintain a local operation list. Full redraws happen on resize or undo/redo.

## WebSocket Protocol

- Client -> Server
  - `join`: `{ roomId?, username? }`
  - `strokeChunk`: `{ opId, userId, roomId, tool: 'brush'|'eraser', color, size, points[], isFinal? }`
  - `cursor`: `{ x, y, pressure? }`
  - `undo`: `{}`
  - `redo`: `{}`
- Server -> Client
  - `init`: `{ roomId, userId, username, color, operations[] }`
  - `strokeChunk`: same as client payload
  - `presence`: `{ type: 'join'|'leave', user: { userId, username, color } }`
  - `cursor`: `{ userId, color, x, y, pressure? }`
  - `undo`: `{ opId }`
  - `redo`: `{ operation }`

## Undo/Redo Strategy (Global)

- The server maintains a linear list of drawing operations with flags:
  - `isFinal` marks stroke completion (pointerup).
  - `revoked` marks operations undone.
- `undo` finds the latest `isFinal && !revoked` op and marks it `revoked = true` (LIFO global history).
- `redo` restores most recent revoked op from a server-side redo stack.
- Clients react to `undo`/`redo` by toggling the operation state and triggering full redraws.
- Conflict handling: operations are immutable after finalization; undo affects whatever was last finalized regardless of author. This keeps the model simple and consistent.

## Performance Decisions

- Event streaming: Points are streamed as they are captured; minimal batching reduces latency.
- Rendering: Incremental drawing on each chunk, with full redraws only on undo/redo/resize to keep frames smooth.
- Canvas: Uses `globalCompositeOperation='destination-out'` for eraser, avoiding per-pixel operations.
- Resolution: Honors device pixel ratio and keeps transform scaled to avoid blurring.
- Minimal allocations: Reuse op arrays; shallow copies only for snapshots.

## Conflict Resolution

- Overlapping strokes are composited by arrival order; eraser uses compositing to remove previous pixels regardless of author.
- Global LIFO undo allows any user to remove the most recent finalized stroke; predictable and simple for consistency.
- Cursor conflicts are non-critical; last write wins on position updates.

## Future Improvements

- Per-user undo stacks (requires mapping user -> own ops plus global merges)
- CRDT/OT for operations if adding shapes/text edits
- Stroke smoothing (e.g., quadratic bezier or one-euro filter)
- Persistence (Redis/Postgres) and snapshotting for large histories
- Backpressure/batching for very high user counts
- Touch-specific gesture handling and palm rejection




