import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { Chessboard, defaultPieces } from 'react-chessboard';
import { Crown, Flag, RefreshCw, RotateCcw } from '../lib/lucideOriginal';
import Navbar from '../components/Navbar/Navbar';
import { playCaptureSound, playLoseSound, playMoveSound, playWinSound } from '../lib/soundEffects';
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
    opposite,
    parseSq,
    positionKey,
    sqName,
    type Color,
    type GameResult,
    type GameState,
    type Piece,
    type PromotionPiece
} from '../lib/imposterChess';
import { BOT_LEVELS, chooseBotImposter, type BotLevel } from '../lib/imposterBot';
import { requestBotMove } from '../lib/imposterBotClient';

type Phase = 'setup' | 'select' | 'playing';
type ColorChoice = Color | 'random';

const PIECE_ORDER: Record<Piece['t'], number> = { q: 0, r: 1, b: 2, n: 3, p: 4, k: 5 };
const PIECE_NAMES: Record<PromotionPiece, string> = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' };

const BOARD_WIDTH =
    'w-full max-w-[min(100%,calc(100dvh-340px),540px)] md:max-w-[min(calc(100dvh-230px),560px)]';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function pieceCode(p: Piece): string {
    return `${p.c}${p.t.toUpperCase()}`;
}

function resultText(result: GameResult, playerColor: Color): { title: string; detail: string } {
    if (!result.over) return { title: '', detail: '' };
    if (result.winner === 'draw') {
        const detail =
            result.reason === 'fifty-move'
                ? 'Draw by the fifty-move rule.'
                : result.reason === 'repetition'
                    ? 'Draw by threefold repetition.'
                    : 'Only the two kings are left.';
        return { title: 'Draw', detail };
    }
    const won = result.winner === playerColor;
    if (result.reason === 'resignation') {
        return { title: won ? 'You won' : 'You resigned', detail: won ? 'Your opponent resigned.' : 'You resigned the game.' };
    }
    if (result.reason === 'no-moves') {
        return {
            title: won ? 'You won' : 'You lost',
            detail: won ? 'Your opponent had no legal move.' : 'You had no legal move.'
        };
    }
    return {
        title: won ? 'You won' : 'You lost',
        detail: won ? 'You captured the opponent king.' : 'The opponent captured your king.'
    };
}

function CapturedStrip({ pieces }: { pieces: Piece[] }) {
    if (pieces.length === 0) return <span className="text-[11px] text-plum/30 font-medium">No captures</span>;
    const sorted = pieces.slice().sort((a, b) => PIECE_ORDER[a.t] - PIECE_ORDER[b.t]);
    return (
        <div className="flex items-center -space-x-1.5 overflow-hidden">
            {sorted.map((p, i) => {
                const Svg = (defaultPieces as Record<string, (props?: { svgStyle?: CSSProperties }) => ReactElement>)[pieceCode(p)];
                return Svg ? (
                    <span key={i} className="inline-flex w-5 h-5 shrink-0">
                        <Svg svgStyle={{ width: 20, height: 20 }} />
                    </span>
                ) : null;
            })}
        </div>
    );
}

export default function ImposterChess() {
    // Setup choices
    const [phase, setPhase] = useState<Phase>('setup');
    const [colorChoice, setColorChoice] = useState<ColorChoice>('w');
    const [level, setLevel] = useState<BotLevel>('club');

    // Game
    const [playerColor, setPlayerColor] = useState<Color>('w');
    const [orientation, setOrientation] = useState<Color>('w');
    const [pickedImposter, setPickedImposter] = useState<number | null>(null);
    const [state, setState] = useState<GameState>(() => createInitialState());
    const [notation, setNotation] = useState<string[]>([]);
    const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [pendingPromotion, setPendingPromotion] = useState<{ from: number; to: number } | null>(null);
    const [result, setResult] = useState<GameResult>({ over: false });
    const [showResult, setShowResult] = useState(false);
    const [captured, setCaptured] = useState<{ w: Piece[]; b: Piece[] }>({ w: [], b: [] });

    const stateRef = useRef<GameState>(state);
    const gameIdRef = useRef(0);
    const botKeyRef = useRef('');
    const countsRef = useRef<Map<string, number>>(new Map());
    const [capturedImposter, setCapturedImposter] = useState<{ w?: number; b?: number }>({});
    const movesEndRef = useRef<HTMLDivElement | null>(null);
    // A move released while the bot is thinking; it is played as soon as the bot has moved
    const pendingMoveRef = useRef<{ from: number; to: number } | null>(null);
    const tryHumanMoveRef = useRef<(from: number, to: number, promotion?: PromotionPiece) => boolean>(() => false);

    const botColor = opposite(playerColor);
    const playing = phase === 'playing';
    const gameOver = result.over;
    const playerTurn = playing && !gameOver && state.turn === playerColor;
    const thinking = playing && !gameOver && state.turn === botColor;

    // Legal moves for the human, only computed on their turn
    const playerMoves = useMemo(() => (playerTurn ? generateMoves(state) : []), [playerTurn, state]);
    const targets = useMemo(() => {
        const map = new Map<number, boolean>();
        if (selected === null) return map;
        for (const m of playerMoves) if (m.from === selected) map.set(m.to, !!m.captured);
        return map;
    }, [playerMoves, selected]);

    // The king hint uses the player's own view so it can never reveal a hidden enemy imposter
    const playerKingAttacked = useMemo(
        () => playing && !gameOver && isKingAttacked(hideOpponentImposter(state, playerColor), playerColor),
        [playing, gameOver, state, playerColor]
    );
    const kingSquare = useMemo(() => {
        for (let i = 0; i < 64; i++) {
            const p = state.board[i];
            if (p && p.t === 'k' && p.c === playerColor) return i;
        }
        return -1;
    }, [state, playerColor]);

    const position = useMemo(() => {
        const out: Record<string, { pieceType: string }> = {};
        for (let i = 0; i < 64; i++) {
            const p = state.board[i];
            if (p) out[sqName(i)] = { pieceType: pieceCode({ t: p.t, c: p.c }) };
        }
        return out;
    }, [state]);

    // ---- Game flow ----

    const resetGameData = useCallback(() => {
        gameIdRef.current++;
        botKeyRef.current = '';
        pendingMoveRef.current = null;
        countsRef.current = new Map();
        setCapturedImposter({});
        setNotation([]);
        setLastMove(null);
        setSelected(null);
        setPendingPromotion(null);
        setResult({ over: false });
        setShowResult(false);
        setCaptured({ w: [], b: [] });
    }, []);

    const beginSelection = useCallback(() => {
        const color: Color = colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice;
        resetGameData();
        const fresh = createInitialState();
        stateRef.current = fresh;
        setState(fresh);
        setPlayerColor(color);
        setOrientation(color);
        setPickedImposter(null);
        setPhase('select');
    }, [colorChoice, resetGameData]);

    const startGame = useCallback(() => {
        if (pickedImposter === null) return;
        const botSide = opposite(playerColor);
        const imposters = { [playerColor]: pickedImposter, [botSide]: chooseBotImposter(botSide) } as { w: number; b: number };
        resetGameData();
        const fresh = createInitialState(imposters);
        stateRef.current = fresh;
        setState(fresh);
        countsRef.current.set(positionKey(fresh), 1);
        setPhase('playing');
    }, [pickedImposter, playerColor, resetGameData]);

    const backToSetup = useCallback(() => {
        resetGameData();
        const fresh = createInitialState();
        stateRef.current = fresh;
        setState(fresh);
        setPickedImposter(null);
        setPhase('setup');
    }, [resetGameData]);

    const commitMove = useCallback(
        (move: ReturnType<typeof generateMoves>[number]) => {
            const before = stateRef.current;
            const next = applyMove(before, move);
            stateRef.current = next;
            setState(next);
            setNotation((n) => [...n, moveNotation(before, move)]);
            setLastMove({ from: move.from, to: move.to });
            setSelected(null);
            setPendingPromotion(null);

            if (move.captured) {
                const capturer = before.turn;
                const taken = move.captured;
                setCaptured((c) => ({ ...c, [capturer]: [...c[capturer], { t: taken.t, c: taken.c }] }));
                if (taken.imp) setCapturedImposter((c) => ({ ...c, [taken.c]: move.to }));
                playCaptureSound();
            } else {
                playMoveSound();
            }

            const key = positionKey(next);
            const count = (countsRef.current.get(key) ?? 0) + 1;
            countsRef.current.set(key, count);
            const res = getResult(next, count);
            if (res.over) {
                setResult(res);
                setShowResult(true);
                if (res.winner === 'draw') playMoveSound();
                else if (res.winner === playerColor) playWinSound();
                else playLoseSound();
            }
        },
        [playerColor]
    );

    const tryHumanMove = useCallback(
        (from: number, to: number, promotion?: PromotionPiece): boolean => {
            const current = stateRef.current;
            if (phase !== 'playing' || result.over || thinking || current.turn !== playerColor) return false;
            const moves = generateMoves(current);
            if (needsPromotion(moves, from, to) && !promotion) {
                setPendingPromotion({ from, to });
                setSelected(from);
                return false;
            }
            const move = findMove(moves, from, to, promotion);
            if (!move) return false;
            commitMove(move);
            return true;
        },
        [commitMove, phase, playerColor, result.over, thinking]
    );

    // Bot replies whenever it is its turn
    useEffect(() => {
        if (phase !== 'playing' || result.over || state.turn === playerColor) return;
        const gameId = gameIdRef.current;
        const key = `${gameId}-${notation.length}`;
        if (botKeyRef.current === key) return;
        botKeyRef.current = key;
        const started = Date.now();
        const snapshot = state;

        requestBotMove(snapshot, botColor, level).then(async (choice) => {
            await sleep(Math.max(0, 450 - (Date.now() - started)));
            if (gameIdRef.current !== gameId || stateRef.current !== snapshot) return;
            const legal = generateMoves(snapshot);
            let move = choice ? findMove(legal, choice.from, choice.to, choice.promotion) : undefined;
            if (!move && legal.length > 0) move = legal[Math.floor(Math.random() * legal.length)];
            if (move) commitMove(move);

            // Play the move the user released while the bot was thinking
            const pending = pendingMoveRef.current;
            pendingMoveRef.current = null;
            if (pending) setTimeout(() => tryHumanMoveRef.current(pending.from, pending.to), 80);
        });
    }, [botColor, commitMove, level, notation.length, phase, playerColor, result.over, state]);

    // Keep the newest move in view
    useEffect(() => {
        movesEndRef.current?.scrollIntoView({ block: 'nearest', inline: 'end' });
    }, [notation.length]);

    const resign = useCallback(() => {
        if (phase !== 'playing' || result.over) return;
        gameIdRef.current++;
        pendingMoveRef.current = null;
        setSelected(null);
        setPendingPromotion(null);
        setResult({ over: true, winner: botColor, reason: 'resignation' });
        setShowResult(true);
        playLoseSound();
    }, [botColor, phase, result.over]);

    // ---- Board interaction ----

    const handleSquareClick = useCallback(
        ({ square }: { square: string }) => {
            const idx = parseSq(square);
            if (idx < 0) return;

            if (phase === 'select') {
                const p = state.board[idx];
                if (p && p.t === 'p' && p.c === playerColor) setPickedImposter(idx);
                return;
            }
            if (!playerTurn || pendingPromotion) return;

            if (selected !== null && targets.has(idx)) {
                tryHumanMove(selected, idx);
                return;
            }
            const p = state.board[idx];
            if (p && p.c === playerColor && idx !== selected && playerMoves.some((m) => m.from === idx)) {
                setSelected(idx);
            } else {
                setSelected(null);
            }
        },
        [pendingPromotion, phase, playerColor, playerMoves, playerTurn, selected, state.board, targets, tryHumanMove]
    );

    const handlePieceDrop = useCallback(
        ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }): boolean => {
            if (!targetSquare) return false;
            const from = parseSq(sourceSquare);
            const to = parseSq(targetSquare);
            if (thinking) {
                // Released while the bot is still thinking: queue it for as soon as the bot has moved
                const dragged = stateRef.current.board[from];
                if (dragged && dragged.c === playerColor) pendingMoveRef.current = { from, to };
                return false;
            }
            return tryHumanMove(from, to);
        },
        [playerColor, thinking, tryHumanMove]
    );

    useEffect(() => {
        tryHumanMoveRef.current = tryHumanMove;
    });

    const handlePieceDrag = useCallback(
        ({ square }: { square: string | null }) => {
            if (!square || !playerTurn) return;
            const idx = parseSq(square);
            if (playerMoves.some((m) => m.from === idx)) setSelected(idx);
        },
        [playerMoves, playerTurn]
    );

    const revealAll = gameOver;

    const renderSquare = useCallback(
        ({ square, children }: { square: string; children?: ReactNode }) => {
            const idx = parseSq(square);
            const p = state.board[idx];
            const overlays: ReactNode[] = [];
            const fill = (color: string, key: string) => (
                <div key={key} className="absolute inset-0 pointer-events-none" style={{ backgroundColor: color }} />
            );

            if (phase === 'select') {
                if (p && p.t === 'p' && p.c === playerColor) {
                    overlays.push(
                        <div
                            key="selectable"
                            className="absolute inset-[6%] rounded-md pointer-events-none border-2 border-berry/40"
                        />
                    );
                }
                if (pickedImposter === idx) overlays.push(fill('rgba(210,49,87,0.28)', 'picked'));
            } else {
                if (lastMove && (lastMove.from === idx || lastMove.to === idx)) overlays.push(fill('rgba(255,213,79,0.42)', 'last'));
                if (selected === idx) overlays.push(fill('rgba(210,49,87,0.32)', 'selected'));
                if (playerKingAttacked && idx === kingSquare) overlays.push(fill('rgba(239,68,68,0.45)', 'king'));
                if (targets.has(idx)) {
                    overlays.push(
                        targets.get(idx) ? (
                            <div key="cap" className="absolute inset-[4%] rounded-full pointer-events-none border-[3px] border-plum/45" />
                        ) : (
                            <div key="dot" className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[28%] h-[28%] rounded-full bg-plum/35" />
                            </div>
                        )
                    );
                }
            }

            const showBadge =
                !!p &&
                p.t === 'p' &&
                (phase === 'select'
                    ? pickedImposter === idx
                    : !!p.imp && (p.c === playerColor || state.revealed[p.c] || revealAll));

            return (
                <div className="relative w-full h-full">
                    {children}
                    {overlays}
                    {showBadge && (
                        <div
                            className="absolute top-[3%] right-[3%] w-[30%] h-[30%] min-w-[12px] min-h-[12px] rounded-full bg-berry text-white flex items-center justify-center shadow pointer-events-none z-10"
                            aria-label="Imposter"
                        >
                            <Crown className="w-[68%] h-[68%]" strokeWidth={2.4} />
                        </div>
                    )}
                </div>
            );
        },
        [kingSquare, lastMove, phase, pickedImposter, playerColor, playerKingAttacked, revealAll, selected, state.board, state.revealed, targets]
    );

    const boardOptions = useMemo(
        () => ({
            id: 'imposter-chess-board',
            position,
            boardOrientation: (orientation === 'w' ? 'white' : 'black') as 'white' | 'black',
            allowDragging: playing && !gameOver,
            allowDrawingArrows: false,
            // Never fade the piece that was picked up or last moved
            draggingPieceGhostStyle: { opacity: 1 },
            canDragPiece: ({ piece }: { piece: { pieceType: string } }) => playing && !gameOver && piece.pieceType[0] === playerColor,
            onPieceDrop: handlePieceDrop,
            onPieceDrag: handlePieceDrag,
            onSquareClick: handleSquareClick,
            squareRenderer: renderSquare,
            darkSquareStyle: { backgroundColor: '#b58863' },
            lightSquareStyle: { backgroundColor: '#f0d9b5' },
            alphaNotationStyle: { fontSize: '9.5px', fontWeight: 'bold', lineHeight: 1, bottom: 2, right: 3, zIndex: 15, pointerEvents: 'none' as const, userSelect: 'none' as const },
            numericNotationStyle: { fontSize: '9.5px', fontWeight: 'bold', lineHeight: 1, top: 2, left: 3, zIndex: 15, pointerEvents: 'none' as const, userSelect: 'none' as const },
            animationDurationInMs: 160
        }),
        [gameOver, handlePieceDrag, handlePieceDrop, handleSquareClick, orientation, playerColor, playing, position, renderSquare]
    );

    // ---- Derived text ----

    const opponentName = `${BOT_LEVELS[level].label} bot`;
    const statusText = (() => {
        if (phase === 'select') return 'Tap one of your pawns to make it the imposter.';
        if (gameOver) return resultText(result, playerColor).title;
        if (thinking || state.turn !== playerColor) return 'Opponent is thinking...';
        if (playerKingAttacked) return 'Your move. Your king is under attack.';
        return 'Your move.';
    })();

    const movePairs = useMemo(() => {
        const pairs: { n: number; w: string; b?: string }[] = [];
        for (let i = 0; i < notation.length; i += 2) pairs.push({ n: i / 2 + 1, w: notation[i], b: notation[i + 1] });
        return pairs;
    }, [notation]);

    const revealInfo = (color: Color) => {
        const sq = imposterSquare(state, color);
        if (sq >= 0) return `on ${sqName(sq)}`;
        const gone = capturedImposter[color];
        return gone !== undefined ? `captured on ${sqName(gone)}` : 'unknown';
    };

    // ---- Views ----

    const actionButtons = (
        <div className="grid grid-cols-3 gap-1.5 md:gap-2">
            <button
                onClick={() => setOrientation((o) => opposite(o))}
                className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 min-h-[44px] rounded-xl bg-white border-2 border-plum/15 text-plum text-[11px] md:text-xs font-black active:scale-95 transition-transform"
            >
                <RefreshCw size={16} />
                <span>Flip</span>
            </button>
            <button
                onClick={resign}
                disabled={!playing || gameOver}
                className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 min-h-[44px] rounded-xl bg-white border-2 border-plum/15 text-plum text-[11px] md:text-xs font-black active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none"
            >
                <Flag size={16} />
                <span>Resign</span>
            </button>
            <button
                onClick={backToSetup}
                className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 min-h-[44px] rounded-xl bg-berry text-white text-[11px] md:text-xs font-black active:scale-95 transition-transform"
            >
                <RotateCcw size={16} />
                <span>New game</span>
            </button>
        </div>
    );

    const setupView = (
        <div className="w-full max-w-md mx-auto px-4 py-4 md:py-8 space-y-4">
            <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-plum/5 text-plum/60 text-[10px] font-black uppercase tracking-widest">
                    <Crown size={12} className="text-berry" />
                    Special variant
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                    Imposter <span className="text-berry italic">Chess</span>
                </h1>
                <p className="text-xs md:text-sm text-plum/60 font-medium leading-snug">
                    Secretly turn one of your pawns into a queen. Capture the enemy king to win. There is no check or checkmate.
                </p>
            </div>

            <section className="space-y-1.5">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-plum/50">Play as</h2>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Play as">
                    {([['w', 'White'], ['b', 'Black'], ['random', 'Random']] as [ColorChoice, string][]).map(([value, label]) => (
                        <button
                            key={value}
                            role="radio"
                            aria-checked={colorChoice === value}
                            onClick={() => setColorChoice(value)}
                            className={`min-h-[44px] rounded-xl border-2 text-sm font-black transition-colors ${
                                colorChoice === value ? 'bg-plum text-cream border-plum' : 'bg-white text-plum border-plum/15'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </section>

            <section className="space-y-1.5">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-plum/50">Opponent</h2>
                <div className="space-y-2" role="radiogroup" aria-label="Opponent level">
                    {(Object.keys(BOT_LEVELS) as BotLevel[]).map((key) => (
                        <button
                            key={key}
                            role="radio"
                            aria-checked={level === key}
                            onClick={() => setLevel(key)}
                            className={`w-full text-left min-h-[52px] px-3 py-2 rounded-xl border-2 transition-colors ${
                                level === key ? 'bg-berry/10 border-berry' : 'bg-white border-plum/15'
                            }`}
                        >
                            <div className="text-sm font-black">{BOT_LEVELS[key].label}</div>
                            <div className="text-[11px] text-plum/60 font-medium leading-snug">{BOT_LEVELS[key].description}</div>
                        </button>
                    ))}
                </div>
            </section>

            <button
                onClick={beginSelection}
                className="w-full min-h-[48px] rounded-xl bg-berry text-white font-black text-sm uppercase tracking-wider shadow-md active:scale-[0.98] transition-transform"
            >
                Start
            </button>
        </div>
    );

    const gameView = (
        <div className="h-full w-full flex flex-col md:flex-row items-center md:items-start justify-start md:justify-center gap-2 md:gap-6 p-2 md:p-4">
            <div className={`${BOARD_WIDTH} flex flex-col gap-1.5 shrink-0`}>
                {/* Opponent row */}
                <div className="flex items-center justify-between min-h-[24px] px-1">
                    <span className="text-xs font-black text-plum">{opponentName}</span>
                    <CapturedStrip pieces={captured[botColor]} />
                </div>

                <div className="relative w-full aspect-square">
                    <div
                        className="w-full h-full rounded-xl overflow-hidden shadow-xl border-2 border-plum/20 bg-white select-none touch-none relative"
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <Chessboard options={boardOptions} />

                        {pendingPromotion && (
                            <div className="absolute inset-0 bg-slate-900/60 z-40 flex items-center justify-center p-3">
                                <div className="bg-cream border-2 border-plum/20 rounded-2xl shadow-2xl p-3 w-full max-w-[16rem] space-y-2 text-center">
                                    <div className="text-sm font-black text-plum">Promote to</div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {(['q', 'r', 'b', 'n'] as PromotionPiece[]).map((t) => {
                                            const Svg = (defaultPieces as Record<string, (props?: { svgStyle?: CSSProperties }) => ReactElement>)[`${playerColor}${t.toUpperCase()}`];
                                            return (
                                                <button
                                                    key={t}
                                                    aria-label={PIECE_NAMES[t]}
                                                    onClick={() => tryHumanMove(pendingPromotion.from, pendingPromotion.to, t)}
                                                    className="aspect-square rounded-xl bg-white border-2 border-plum/15 flex items-center justify-center active:scale-95 transition-transform"
                                                >
                                                    {Svg && <Svg svgStyle={{ width: '80%', height: '80%' }} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setPendingPromotion(null);
                                            setSelected(null);
                                        }}
                                        className="text-xs font-black text-plum/60 min-h-[32px]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Player row */}
                <div className="flex items-center justify-between min-h-[24px] px-1">
                    <span className="text-xs font-black text-plum">You ({playerColor === 'w' ? 'White' : 'Black'})</span>
                    <CapturedStrip pieces={captured[playerColor]} />
                </div>

                {/* Mobile status, moves and actions */}
                <div className="md:hidden space-y-1.5">
                    <p className="text-center text-xs font-bold text-plum/80 min-h-[18px]" aria-live="polite">{statusText}</p>
                    {phase === 'playing' && (
                        <div className="overflow-x-auto whitespace-nowrap text-[11px] font-mono text-plum/70 bg-white/70 rounded-lg border border-plum/10 px-2 py-1 min-h-[26px]">
                            {movePairs.length === 0 ? (
                                <span className="text-plum/40">No moves yet</span>
                            ) : (
                                movePairs.map((pair) => (
                                    <span key={pair.n} className="mr-2">
                                        {pair.n}. {pair.w} {pair.b ?? ''}
                                    </span>
                                ))
                            )}
                            <div ref={movesEndRef} className="inline-block" />
                        </div>
                    )}
                    {phase === 'select' ? (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setPhase('setup')}
                                className="min-h-[46px] rounded-xl bg-white border-2 border-plum/15 text-plum text-sm font-black active:scale-95 transition-transform"
                            >
                                Back
                            </button>
                            <button
                                onClick={startGame}
                                disabled={pickedImposter === null}
                                className="min-h-[46px] rounded-xl bg-berry text-white text-sm font-black active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none"
                            >
                                Confirm
                            </button>
                        </div>
                    ) : (
                        actionButtons
                    )}
                </div>
            </div>

            {/* Desktop side panel */}
            <aside className="hidden md:flex w-[300px] shrink-0 flex-col gap-3 max-h-[calc(100dvh-140px)]">
                <div className="rounded-2xl bg-white border-2 border-plum/15 p-4 space-y-1">
                    <h2 className="font-serif font-black text-lg text-plum">Imposter Chess</h2>
                    <p className="text-sm font-bold text-plum/80" aria-live="polite">{statusText}</p>
                    <p className="text-xs text-plum/60 font-medium leading-snug">
                        {phase === 'select'
                            ? 'Your choice stays hidden until that pawn captures or is captured.'
                            : 'Capture the enemy king to win. Moving into attack is allowed.'}
                    </p>
                </div>

                {phase === 'select' ? (
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setPhase('setup')}
                            className="min-h-[46px] rounded-xl bg-white border-2 border-plum/15 text-plum text-sm font-black"
                        >
                            Back
                        </button>
                        <button
                            onClick={startGame}
                            disabled={pickedImposter === null}
                            className="min-h-[46px] rounded-xl bg-berry text-white text-sm font-black disabled:opacity-40 disabled:pointer-events-none"
                        >
                            Confirm
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 min-h-0 rounded-2xl bg-white border-2 border-plum/15 p-3 overflow-y-auto">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-plum/50 mb-2">Moves</h3>
                            {movePairs.length === 0 ? (
                                <p className="text-xs text-plum/40 font-medium">No moves yet</p>
                            ) : (
                                <ol className="grid grid-cols-[2rem_1fr_1fr] gap-x-2 gap-y-0.5 text-xs font-mono text-plum/80">
                                    {movePairs.map((pair) => (
                                        <li key={pair.n} className="contents">
                                            <span className="text-plum/40">{pair.n}.</span>
                                            <span>{pair.w}</span>
                                            <span>{pair.b ?? ''}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                        {actionButtons}
                    </>
                )}
            </aside>

            {showResult && gameOver && (
                <div className="fixed inset-0 z-[10000] bg-slate-950/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Game result">
                    <div className="w-full max-w-sm bg-cream rounded-3xl border-2 border-plum/20 shadow-2xl p-5 space-y-3 text-center">
                        <h2 className="font-serif font-black text-3xl text-plum">{resultText(result, playerColor).title}</h2>
                        <p className="text-sm font-medium text-plum/70">{resultText(result, playerColor).detail}</p>
                        <div className="rounded-xl bg-white border border-plum/10 p-3 text-left space-y-1 text-xs font-medium text-plum/80">
                            <div className="flex items-center gap-2">
                                <Crown size={14} className="text-berry shrink-0" />
                                <span>Your imposter: <strong>{revealInfo(playerColor)}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Crown size={14} className="text-berry shrink-0" />
                                <span>Opponent imposter: <strong>{revealInfo(botColor)}</strong></span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                onClick={beginSelection}
                                className="min-h-[46px] rounded-xl bg-berry text-white text-sm font-black active:scale-95 transition-transform"
                            >
                                Play again
                            </button>
                            <button
                                onClick={backToSetup}
                                className="min-h-[46px] rounded-xl bg-white border-2 border-plum/15 text-plum text-sm font-black active:scale-95 transition-transform"
                            >
                                Change settings
                            </button>
                            <button
                                onClick={() => setShowResult(false)}
                                className="min-h-[40px] rounded-xl text-plum/70 text-xs font-black"
                            >
                                View board
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="h-screen h-[100dvh] flex flex-col bg-cream font-sans text-plum overflow-hidden">
            <Navbar />
            <main className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden pb-[env(safe-area-inset-bottom)]">
                {phase === 'setup' ? setupView : gameView}
            </main>
        </div>
    );
}
