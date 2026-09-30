import { chooseBotMove, type BotLevel, type BotMove } from './imposterBot';
import { hideOpponentImposter, type Color, type GameState } from './imposterChess';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (move: BotMove | null) => void>();

function getWorker(): Worker | null {
    if (worker) return worker;
    if (typeof Worker === 'undefined') return null;
    try {
        worker = new Worker(new URL('../workers/imposterBot.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<{ id: number; move: BotMove | null }>) => {
            const resolve = pending.get(event.data.id);
            if (resolve) {
                pending.delete(event.data.id);
                resolve(event.data.move);
            }
        };
        worker.onerror = () => {
            // Worker failed: settle everything through the main-thread fallback.
            worker?.terminate();
            worker = null;
            for (const [id, resolve] of pending) {
                pending.delete(id);
                resolve(null);
            }
        };
    } catch {
        worker = null;
    }
    return worker;
}

/**
 * Ask the bot for a move. The real state is sanitized here, so the human's hidden imposter
 * never reaches the search code (or the worker).
 */
export function requestBotMove(real: GameState, botColor: Color, level: BotLevel): Promise<BotMove | null> {
    const sanitized = hideOpponentImposter(real, botColor);
    const w = getWorker();
    const fallback = () =>
        new Promise<BotMove | null>((resolve) => {
            setTimeout(() => resolve(chooseBotMove(sanitized, botColor, level)), 0);
        });
    if (!w) return fallback();

    return new Promise<BotMove | null>((resolve) => {
        const id = nextId++;
        pending.set(id, (move) => {
            if (move) resolve(move);
            else resolve(chooseBotMove(sanitized, botColor, level));
        });
        w.postMessage({ id, state: sanitized, botColor, level });
    });
}

export function disposeBotWorker(): void {
    worker?.terminate();
    worker = null;
    pending.clear();
}
