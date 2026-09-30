import { chooseBotMove, type BotLevel, type BotMove } from '../lib/imposterBot';
import type { Color, GameState } from '../lib/imposterChess';

interface BotRequest {
    id: number;
    /** Already sanitized: the human's hidden imposter flag has been removed. */
    state: GameState;
    botColor: Color;
    level: BotLevel;
}

interface BotResponse {
    id: number;
    move: BotMove | null;
}

// Typed loosely so the DOM lib used by the app does not conflict with worker globals.
const scope = self as unknown as {
    onmessage: ((event: { data: BotRequest }) => void) | null;
    postMessage: (message: BotResponse) => void;
};

scope.onmessage = (event) => {
    const { id, state, botColor, level } = event.data;
    scope.postMessage({ id, move: chooseBotMove(state, botColor, level) });
};
