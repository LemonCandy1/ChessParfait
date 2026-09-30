import { describe, expect, it } from 'vitest';
import {
    applyMove,
    createInitialState,
    findMove,
    generateMoves,
    getResult,
    hideOpponentImposter,
    imposterSquare,
    isKingAttacked,
    moveNotation,
    needsPromotion,
    parseSq,
    positionKey,
    stateFromFen,
    type GameState
} from './imposterChess';
import { BOT_LEVELS, chooseBotImposter, chooseBotMoveForGame, type BotLevel } from './imposterBot';

const sq = parseSq;

function perft(s: GameState, depth: number): number {
    if (depth === 0) return 1;
    let n = 0;
    for (const m of generateMoves(s)) n += perft(applyMove(s, m), depth - 1);
    return n;
}

function play(s: GameState, from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): GameState {
    const m = findMove(generateMoves(s), sq(from), sq(to), promotion);
    if (!m) throw new Error(`Illegal test move ${from}-${to}`);
    return applyMove(s, m);
}

const seeded = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};

describe('move generation', () => {
    it('matches standard perft for the first three plies (no check is possible yet)', () => {
        const s = createInitialState();
        expect(perft(s, 1)).toBe(20);
        expect(perft(s, 2)).toBe(400);
        expect(perft(s, 3)).toBe(8902);
    });

    it('lets the imposter pawn move and capture like a queen', () => {
        // White imposter on d4 with an open board: rook and bishop lines, 27 squares on an open board.
        const s = stateFromFen('4k3/8/8/8/3P4/8/8/4K3 w - - 0 1', { w: 'd4' });
        const targets = generateMoves(s).filter((m) => m.from === sq('d4')).map((m) => m.to);
        expect(targets).toContain(sq('d8'));
        expect(targets).toContain(sq('h8'));
        expect(targets).toContain(sq('a1'));
        expect(targets).toContain(sq('a4'));
        expect(targets).toContain(sq('d1'));
        expect(targets).toHaveLength(27);
    });

    it('does not give a normal pawn queen moves', () => {
        const s = stateFromFen('4k3/8/8/8/3P4/8/8/4K3 w - - 0 1');
        const targets = generateMoves(s).filter((m) => m.from === sq('d4')).map((m) => m.to);
        expect(targets).toEqual([sq('d5')]);
    });

    it('never promotes the imposter, even on the last rank', () => {
        const s = stateFromFen('4k3/3P4/8/8/8/8/8/4K3 w - - 0 1', { w: 'd7' });
        const moves = generateMoves(s).filter((m) => m.from === sq('d7'));
        expect(moves.some((m) => m.promotion)).toBe(false);
        const after = applyMove(s, findMove(moves, sq('d7'), sq('d8'))!);
        const piece = after.board[sq('d8')]!;
        expect(piece.t).toBe('p');
        expect(piece.imp).toBe(true);
    });

    it('still promotes normal pawns', () => {
        const s = stateFromFen('8/3P4/8/8/8/8/8/k3K3 w - - 0 1');
        const moves = generateMoves(s);
        expect(needsPromotion(moves, sq('d7'), sq('d8'))).toBe(true);
        const after = play(s, 'd7', 'd8', 'n');
        expect(after.board[sq('d8')]).toEqual({ t: 'n', c: 'w' });
    });

    it('supports en passant for normal pawns only', () => {
        let s = stateFromFen('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1');
        s = play(s, 'd7', 'd5');
        expect(s.ep).toBe(sq('d6'));
        const ep = findMove(generateMoves(s), sq('e5'), sq('d6'))!;
        expect(ep.ep).toBe(true);
        const after = applyMove(s, ep);
        expect(after.board[sq('d5')]).toBeNull();
        expect(after.board[sq('d6')]).toEqual({ t: 'p', c: 'w' });
    });

    it('does not allow capturing an imposter en passant', () => {
        // A black imposter on d7 cannot double-step, so no en passant square is ever created for it.
        let s = stateFromFen('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1', { b: 'd7' });
        s = play(s, 'd7', 'd5');
        expect(s.ep).toBe(-1);
        expect(generateMoves(s).some((m) => m.ep)).toBe(false);
    });

    it('allows kings to move into attack', () => {
        const s = stateFromFen('4k3/8/8/8/8/8/r7/4K3 w - - 0 1');
        const target = findMove(generateMoves(s), sq('e1'), sq('e2'));
        expect(target).toBeDefined();
        expect(isKingAttacked(s, 'w')).toBe(false);
        expect(isKingAttacked(play(s, 'e1', 'e2'), 'w')).toBe(true);
    });

    it('allows castling through and out of attack', () => {
        const s = stateFromFen('r3k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
        const moves = generateMoves(s);
        expect(moves.some((m) => m.castle === 'K')).toBe(true);
        expect(moves.some((m) => m.castle === 'Q')).toBe(true);
        // Even with a rook attacking f1 and the king on an attacked file.
        const attacked = stateFromFen('4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1');
        expect(generateMoves(attacked).some((m) => m.castle === 'K')).toBe(true);
        const after = play(s, 'e1', 'g1');
        expect(after.board[sq('f1')]).toEqual({ t: 'r', c: 'w' });
        expect(after.board[sq('h1')]).toBeNull();
    });
});

describe('imposter reveal and game end', () => {
    it('reveals the imposter when it makes its first capture', () => {
        const s = stateFromFen('4k3/8/8/8/3P4/8/3p4/4K3 w - - 0 1', { w: 'd4' });
        expect(s.revealed.w).toBe(false);
        const quiet = play(s, 'd4', 'd3');
        expect(quiet.revealed.w).toBe(false);
        const capture = play(s, 'd4', 'd2');
        expect(capture.revealed.w).toBe(true);
        expect(capture.revealed.b).toBe(false);
    });

    it('reveals the imposter when it is captured', () => {
        const s = stateFromFen('4k3/3r4/8/8/3p4/8/8/4K3 b - - 0 1', { b: 'd4' });
        const rook = stateFromFen('4k3/8/8/8/3p4/8/8/3RK3 w - - 0 1', { b: 'd4' });
        expect(s.revealed.b).toBe(false);
        const after = play(rook, 'd1', 'd4');
        expect(after.revealed.b).toBe(true);
        expect(imposterSquare(after, 'b')).toBe(-1);
    });

    it('ends the game when a king is captured', () => {
        const s = stateFromFen('4k3/8/8/8/8/8/8/K3R3 w - - 0 1');
        expect(getResult(s)).toEqual({ over: false });
        const after = play(s, 'e1', 'e8');
        expect(getResult(after)).toEqual({ over: true, winner: 'w', reason: 'king-captured' });
    });

    it('has no checkmate or stalemate: a side with moves keeps playing', () => {
        // Black king boxed in and "checked" by a queen, but the game is not over.
        const s = stateFromFen('k7/1Q6/2K5/8/8/8/8/8 b - - 0 1');
        expect(getResult(s)).toEqual({ over: false });
        // A "stalemated" king may simply move next to the queen.
        const stale = stateFromFen('k7/2Q5/1K6/8/8/8/8/8 b - - 0 1');
        expect(getResult(stale)).toEqual({ over: false });
        expect(generateMoves(stale).length).toBeGreaterThan(0);
    });

    it('draws on the fifty-move rule, threefold repetition and bare kings', () => {
        const fifty = stateFromFen('4k3/8/8/8/8/8/8/R3K3 w - - 100 80');
        expect(getResult(fifty)).toEqual({ over: true, winner: 'draw', reason: 'fifty-move' });
        expect(getResult(createInitialState(), 3)).toEqual({ over: true, winner: 'draw', reason: 'repetition' });
        const bare = stateFromFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
        expect(getResult(bare)).toEqual({ over: true, winner: 'draw', reason: 'bare-kings' });
    });

    it('counts imposter flags in the repetition key', () => {
        const a = createInitialState({ w: sq('e2') });
        const b = createInitialState({ w: sq('d2') });
        expect(positionKey(a)).not.toBe(positionKey(b));
    });

    it('rejects an imposter that is not one of the colour\'s pawns', () => {
        expect(() => createInitialState({ w: sq('e1') })).toThrow();
        expect(() => createInitialState({ w: sq('e7') })).toThrow();
    });

    it('writes imposter moves like pawn moves so they do not leak the piece type', () => {
        const s = createInitialState({ w: sq('e2') });
        const after = play(s, 'e2', 'e4');
        const next = play(play(after, 'a7', 'a6'), 'e4', 'e5');
        expect(moveNotation(s, findMove(generateMoves(s), sq('e2'), sq('e4'))!)).toBe('e2-e4');
        expect(next.turn).toBe('b');
    });
});

describe('hidden information', () => {
    it('strips the opponent imposter flag until it is revealed', () => {
        const s = createInitialState({ w: sq('e2'), b: sq('d7') });
        const forBlack = hideOpponentImposter(s, 'b');
        expect(imposterSquare(forBlack, 'w')).toBe(-1);
        expect(imposterSquare(forBlack, 'b')).toBe(sq('d7'));
        const revealed = { ...s, revealed: { w: true, b: false } };
        expect(imposterSquare(hideOpponentImposter(revealed, 'b'), 'w')).toBe(sq('e2'));
    });
});

describe('bot', () => {
    it('captures the enemy king when it can', () => {
        const s = stateFromFen('4k3/8/8/8/8/8/8/K3R3 w - - 0 1');
        for (const level of Object.keys(BOT_LEVELS) as BotLevel[]) {
            const move = chooseBotMoveForGame(s, 'w', level, seeded(1))!;
            expect(move.from).toBe(sq('e1'));
            expect(move.to).toBe(sq('e8'));
        }
    });

    it('does not leave its king capturable when a safe move exists', () => {
        // Black rook attacks the white king; the only safe replies are king moves off the file or capturing the rook.
        const s = stateFromFen('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1');
        for (const level of ['club', 'strong'] as BotLevel[]) {
            const move = chooseBotMoveForGame(s, 'w', level, seeded(2))!;
            const after = applyMove(s, findMove(generateMoves(s), move.from, move.to, move.promotion)!);
            const replies = generateMoves(after);
            expect(replies.some((m) => m.captured?.t === 'k')).toBe(false);
        }
    });

    it('returns a legal move from the start position at every level', () => {
        const s = createInitialState({ w: sq('e2'), b: sq('d7') });
        for (const level of Object.keys(BOT_LEVELS) as BotLevel[]) {
            const black = applyMove(s, findMove(generateMoves(s), sq('e2'), sq('e3'))!);
            const move = chooseBotMoveForGame(black, 'b', level, seeded(3))!;
            expect(findMove(generateMoves(black), move.from, move.to, move.promotion)).toBeDefined();
        }
    });

    it('plays the same move whichever of the human pawns is the real imposter', () => {
        // The bot must not peek: swapping the hidden human imposter cannot change its choice.
        const base = applyMove(createInitialState({ w: sq('e2'), b: sq('d7') }), findMove(generateMoves(createInitialState()), sq('a2'), sq('a3'))!);
        const other = applyMove(createInitialState({ w: sq('h2'), b: sq('d7') }), findMove(generateMoves(createInitialState()), sq('a2'), sq('a3'))!);
        // Same visible board apart from the hidden flag once a2-a3 is played by a normal pawn in both.
        for (const level of ['club', 'strong'] as BotLevel[]) {
            const a = chooseBotMoveForGame(base, 'b', level, seeded(9));
            const b = chooseBotMoveForGame(other, 'b', level, seeded(9));
            expect(a).toEqual(b);
        }
    });

    it('chooses a real pawn as its imposter', () => {
        for (let i = 0; i < 40; i++) {
            const w = chooseBotImposter('w');
            const b = chooseBotImposter('b');
            expect(w >> 3).toBe(1);
            expect(b >> 3).toBe(6);
        }
    });

    it('answers within a sensible time budget at the strongest level', () => {
        const s = createInitialState({ w: sq('e2'), b: sq('d7') });
        const start = Date.now();
        const move = chooseBotMoveForGame(applyMove(s, findMove(generateMoves(s), sq('d2'), sq('d4'))!), 'b', 'strong', seeded(5));
        expect(move).not.toBeNull();
        expect(Date.now() - start).toBeLessThan(15000);
    });
});
