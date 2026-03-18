import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, RotateCcw, ChevronLeft, Cpu, User, Info } from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import { Link } from 'react-router-dom';

// Constants
const BOARD_SIZE = 8;
const WHITE = 'W';
const BLACK = 'B';
const EMPTY = '.';

type Piece = 'W' | 'B' | '.';
type Board = Piece[][];
type Move = [number, number, number, number]; // [r1, c1, r2, c2]

// AI Constants & Zobrist Hashing
const random32 = () => Math.floor(Math.random() * 0xFFFFFFFF);
const ZOBRIST = {
    W: Array.from({length: 8}, () => Array.from({length: 8}, random32)),
    B: Array.from({length: 8}, () => Array.from({length: 8}, random32)),
    turnW: random32(),
    turnB: random32(),
    ep: Array.from({length: 8}, random32)
};

const EVAL_WEIGHTS = {
    material: 1000,
    advancement: [0, 5, 10, 20, 40, 80, 160, 0], 
    passedPawn: [0, 10, 30, 60, 100, 150, 200, 0], 
    doubled: -20,
    isolated: -15,
    blockaded: -25
};

const TT_EXACT = 0;
const TT_LOWERBOUND = 1;
const TT_UPPERBOUND = 2;

const PawnGame: React.FC = () => {
    const [board, setBoard] = useState<Board>([]);
    const [turn, setTurn] = useState<typeof WHITE | typeof BLACK>(WHITE);
    const [userColor, setUserColor] = useState<typeof WHITE | typeof BLACK | null>(null);
    const [enPassantTarget, setEnPassantTarget] = useState<[number, number] | null>(null);
    const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
    const [winner, setWinner] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [lastMove, setLastMove] = useState<Move | null>(null);
    const [history, setHistory] = useState<{ board: Board, turn: typeof WHITE | typeof BLACK, ep: [number, number] | null, lastMove: Move | null }[]>([]);
    const [loadedPieces, setLoadedPieces] = useState<Record<string, boolean>>({});

    // Initialize board
    const initBoard = useCallback(() => {
        const newBoard: Board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
        for (let i = 0; i < BOARD_SIZE; i++) {
            newBoard[1][i] = BLACK;
            newBoard[6][i] = WHITE;
        }
        setBoard(newBoard);
        setTurn(WHITE);
        setEnPassantTarget(null);
        setSelectedSquare(null);
        setLastMove(null);
        setWinner(null);
        setHistory([]);
        setLoadedPieces({});
    }, []);

    useEffect(() => {
        initBoard();
    }, [initBoard]);

    const getPieceImg = (piece: Piece) => {
        if (piece === EMPTY) return null;
        const color = piece === WHITE ? 'w' : 'b';
        return `https://lichess1.org/assets/piece/cburnett/${color}P.svg`;
    };

    const getPieceFallback = (piece: Piece) => {
        const color = piece === WHITE ? 'w' : 'b';
        return `https://chessboardjs.com/img/chesspieces/wikipedia/${color}P.png`;
    };

    const getLegalMoves = (currentBoard: Board, color: string, epTarget: [number, number] | null): Move[] => {
        const moves: Move[] = [];
        const direction = color === WHITE ? -1 : 1;
        const startRank = color === WHITE ? 6 : 1;
        const enemy = color === WHITE ? BLACK : WHITE;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (currentBoard[r][c] === color) {
                    // 1. Forward Move
                    const nr = r + direction;
                    const nc = c;
                    if (nr >= 0 && nr < BOARD_SIZE && currentBoard[nr][nc] === EMPTY) {
                        moves.push([r, c, nr, nc]);
                        // 2. Initial Two-Square Move
                        if (r === startRank) {
                            const nnr = r + 2 * direction;
                            if (currentBoard[nnr][nc] === EMPTY) {
                                moves.push([r, c, nnr, nc]);
                            }
                        }
                    }

                    // 3. Captures
                    for (const dc of [-1, 1]) {
                        const capR = r + direction;
                        const capC = c + dc;
                        if (capR >= 0 && capR < BOARD_SIZE && capC >= 0 && capC < BOARD_SIZE) {
                            if (currentBoard[capR][capC] === enemy) {
                                moves.push([r, c, capR, capC]);
                            }
                            // 4. En Passant
                            else if (epTarget && capR === epTarget[0] && capC === epTarget[1]) {
                                moves.push([r, c, capR, capC]);
                            }
                        }
                    }
                }
            }
        }
        return moves;
    };

    const makeMove = (currentBoard: Board, move: Move, epTarget: [number, number] | null): { board: Board, ep: [number, number] | null } => {
        const [r1, c1, r2, c2] = move;
        const newBoard = currentBoard.map(row => [...row]);
        const piece = newBoard[r1][c1];

        let newEpTarget: [number, number] | null = null;

        // Handle En Passant Capture
        if (piece === WHITE && epTarget && r2 === epTarget[0] && c2 === epTarget[1]) {
            newBoard[r2 + 1][c2] = EMPTY;
        } else if (piece === BLACK && epTarget && r2 === epTarget[0] && c2 === epTarget[1]) {
            newBoard[r2 - 1][c2] = EMPTY;
        }

        // Set new EP target if double move
        if (Math.abs(r2 - r1) === 2) {
            newEpTarget = [(r1 + r2) / 2, c1];
        }

        newBoard[r2][c2] = piece;
        newBoard[r1][c1] = EMPTY;

        return { board: newBoard, ep: newEpTarget };
    };

    const checkWin = (currentBoard: Board, color: string): boolean => {
        const targetRank = color === WHITE ? 0 : 7;
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (currentBoard[targetRank][c] === color) return true;
        }

        const enemy = color === WHITE ? BLACK : WHITE;
        let enemyExists = false;
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (currentBoard[r].includes(enemy as Piece)) {
                enemyExists = true;
                break;
            }
        }
        return !enemyExists;
    };

    // AI Logic
    const isIsolated = (currentBoard: Board, c: number, color: string): boolean => {
        const left = c > 0 ? c - 1 : -1;
        const right = c < 7 ? c + 1 : -1;
        for (let r = 0; r < BOARD_SIZE; r++) {
            if ((left !== -1 && currentBoard[r][left] === color) || 
                (right !== -1 && currentBoard[r][right] === color)) {
                return false;
            }
        }
        return true;
    };

    const isDoubled = (currentBoard: Board, c: number, color: string): boolean => {
        let count = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (currentBoard[r][c] === color) count++;
        }
        return count > 1;
    };

    const isBlockaded = (currentBoard: Board, r: number, c: number, color: string): boolean => {
        const direction = color === WHITE ? -1 : 1;
        const enemy = color === WHITE ? BLACK : WHITE;
        const frontR = r + direction;
        if (frontR >= 0 && frontR < BOARD_SIZE) {
            return currentBoard[frontR][c] === enemy;
        }
        return false;
    };

    const isPassedPawn = (currentBoard: Board, r: number, c: number, color: string): boolean => {
        const direction = color === WHITE ? -1 : 1;
        const enemy = color === WHITE ? BLACK : WHITE;
        for (const dc of [-1, 0, 1]) {
            const nc = c + dc;
            if (nc >= 0 && nc < BOARD_SIZE) {
                let currR = r + direction;
                while (currR >= 0 && currR < BOARD_SIZE) {
                    if (currentBoard[currR][nc] === enemy) return false;
                    currR += direction;
                }
            }
        }
        return true;
    };

    const evaluate = (currentBoard: Board): number => {
        let score = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (currentBoard[r][c] === WHITE) {
                    const rankAdvance = 7 - r;
                    score += EVAL_WEIGHTS.material;
                    score += EVAL_WEIGHTS.advancement[rankAdvance];
                    if (isPassedPawn(currentBoard, r, c, WHITE)) score += EVAL_WEIGHTS.passedPawn[rankAdvance];
                    if (isIsolated(currentBoard, c, WHITE)) score += EVAL_WEIGHTS.isolated;
                    if (isDoubled(currentBoard, c, WHITE)) score += EVAL_WEIGHTS.doubled;
                    if (isBlockaded(currentBoard, r, c, WHITE)) score += EVAL_WEIGHTS.blockaded;
                } else if (currentBoard[r][c] === BLACK) {
                    const rankAdvance = r;
                    score -= EVAL_WEIGHTS.material;
                    score -= EVAL_WEIGHTS.advancement[rankAdvance];
                    if (isPassedPawn(currentBoard, r, c, BLACK)) score -= EVAL_WEIGHTS.passedPawn[rankAdvance];
                    if (isIsolated(currentBoard, c, BLACK)) score -= EVAL_WEIGHTS.isolated;
                    if (isDoubled(currentBoard, c, BLACK)) score -= EVAL_WEIGHTS.doubled;
                    if (isBlockaded(currentBoard, r, c, BLACK)) score -= EVAL_WEIGHTS.blockaded;
                }
            }
        }
        return score;
    };

    const computeHash = (currentBoard: Board, color: string, epTarget: [number, number] | null): number => {
        let h = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (currentBoard[r][c] === WHITE) h ^= ZOBRIST.W[r][c];
                else if (currentBoard[r][c] === BLACK) h ^= ZOBRIST.B[r][c];
            }
        }
        h ^= (color === WHITE ? ZOBRIST.turnW : ZOBRIST.turnB);
        if (epTarget) h ^= ZOBRIST.ep[epTarget[1]];
        return h;
    };

    const orderMoves = (currentBoard: Board, moves: Move[], color: string): Move[] => {
        const enemy = color === WHITE ? BLACK : WHITE;
        return moves.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;
            if (currentBoard[a[2]][a[3]] === enemy) scoreA += 100; // Capture
            if (currentBoard[b[2]][b[3]] === enemy) scoreB += 100;
            if (isPassedPawn(currentBoard, a[0], a[1], color)) scoreA += 50; // Moving passed pawn
            if (isPassedPawn(currentBoard, b[0], b[1], color)) scoreB += 50;
            return scoreB - scoreA;
        });
    };

    const quiesce = (currentBoard: Board, alpha: number, beta: number, color: string, epTarget: [number, number] | null): number => {
        const standPat = evaluate(currentBoard);
        if (color === WHITE) {
            if (standPat >= beta) return beta;
            if (alpha < standPat) alpha = standPat;
        } else {
            if (standPat <= alpha) return alpha;
            if (beta > standPat) beta = standPat;
        }

        let moves = getLegalMoves(currentBoard, color, epTarget);
        // Only consider captures in quiescence
        const enemy = color === WHITE ? BLACK : WHITE;
        moves = moves.filter(m => currentBoard[m[2]][m[3]] === enemy);
        if (moves.length === 0) return standPat;
        moves = orderMoves(currentBoard, moves, color);

        if (color === WHITE) {
            for (const move of moves) {
                const { board: nb, ep: nep } = makeMove(currentBoard, move, epTarget);
                const score = quiesce(nb, alpha, beta, BLACK, nep);
                if (score >= beta) return beta;
                if (score > alpha) alpha = score;
            }
            return alpha;
        } else {
            for (const move of moves) {
                const { board: nb, ep: nep } = makeMove(currentBoard, move, epTarget);
                const score = quiesce(nb, alpha, beta, WHITE, nep);
                if (score <= alpha) return alpha;
                if (score < beta) beta = score;
            }
            return beta;
        }
    };

    let nodes = 0;

    const minimax = (currentBoard: Board, depth: number, alpha: number, beta: number, maximizing: boolean, epTarget: [number, number] | null, tt: Map<number, {depth: number, flag: number, value: number, bestMove?: Move}>, startTime: number, timeLimit: number): number => {
        nodes++;
        if (nodes % 1000 === 0 && performance.now() - startTime > timeLimit) {
            throw new Error("TIME_OUT");
        }

        const color = maximizing ? WHITE : BLACK;
        if (checkWin(currentBoard, WHITE)) return 10000 + depth;
        if (checkWin(currentBoard, BLACK)) return -10000 - depth;
        if (depth <= 0) return quiesce(currentBoard, alpha, beta, color, epTarget);

        const hash = computeHash(currentBoard, color, epTarget);
        const ttEntry = tt.get(hash);
        if (ttEntry && ttEntry.depth >= depth) {
            if (ttEntry.flag === TT_EXACT) return ttEntry.value;
            if (ttEntry.flag === TT_LOWERBOUND && ttEntry.value >= beta) return ttEntry.value;
            if (ttEntry.flag === TT_UPPERBOUND && ttEntry.value <= alpha) return ttEntry.value;
        }

        let moves = getLegalMoves(currentBoard, color, epTarget);
        if (moves.length === 0) return maximizing ? -5000 : 5000;
        
        // Put TT best move first
        if (ttEntry && ttEntry.bestMove) {
            const hasTTMove = moves.findIndex(m => m[0] === ttEntry.bestMove![0] && m[1] === ttEntry.bestMove![1] && m[2] === ttEntry.bestMove![2] && m[3] === ttEntry.bestMove![3]);
            if (hasTTMove !== -1) {
                moves.splice(hasTTMove, 1);
                moves.unshift(ttEntry.bestMove!);
            }
        } else {
            moves = orderMoves(currentBoard, moves, color);
        }

        const origAlpha = alpha;
        const origBeta = beta;
        let bestMove: Move | undefined;

        if (maximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                const { board: nb, ep: nep } = makeMove(currentBoard, move, epTarget);
                const ev = minimax(nb, depth - 1, alpha, beta, false, nep, tt, startTime, timeLimit);
                if (ev > maxEval) {
                    maxEval = ev;
                    bestMove = move;
                }
                alpha = Math.max(alpha, ev);
                if (beta <= alpha) break;
            }
            
            let flag = TT_EXACT;
            if (maxEval <= origAlpha) flag = TT_UPPERBOUND;
            else if (maxEval >= beta) flag = TT_LOWERBOUND;
            tt.set(hash, { depth, flag, value: maxEval, bestMove });
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                const { board: nb, ep: nep } = makeMove(currentBoard, move, epTarget);
                const ev = minimax(nb, depth - 1, alpha, beta, true, nep, tt, startTime, timeLimit);
                if (ev < minEval) {
                    minEval = ev;
                    bestMove = move;
                }
                beta = Math.min(beta, ev);
                if (beta <= alpha) break;
            }

            let flag = TT_EXACT;
            if (minEval >= origBeta) flag = TT_LOWERBOUND;
            else if (minEval <= alpha) flag = TT_UPPERBOUND;
            tt.set(hash, { depth, flag, value: minEval, bestMove });
            return minEval;
        }
    };

    const getBestMove = (currentBoard: Board, color: string, epTarget: [number, number] | null): Move | null => {
        const moves = getLegalMoves(currentBoard, color, epTarget);
        if (moves.length === 0) return null;
        if (moves.length === 1) return moves[0]; // Instant if only 1 legal move

        const tt = new Map<number, {depth: number, flag: number, value: number, bestMove?: Move}>();
        const startTime = performance.now();
        const MAX_TIME = 500; // ms
        let bestMoveOverall: Move | null = null;
        nodes = 0;

        try {
            for (let depth = 1; depth <= 20; depth++) {
                let bestMoveForDepth: Move | null = null;
                
                const hash = computeHash(currentBoard, color, epTarget);
                const ttEntry = tt.get(hash);
                let currentMoves = [...moves];
                if (ttEntry && ttEntry.bestMove) {
                    const idx = currentMoves.findIndex(m => m[0] === ttEntry.bestMove![0] && m[1] === ttEntry.bestMove![1] && m[2] === ttEntry.bestMove![2] && m[3] === ttEntry.bestMove![3]);
                    if (idx !== -1) {
                        currentMoves.splice(idx, 1);
                        currentMoves.unshift(ttEntry.bestMove);
                    }
                } else {
                    currentMoves = orderMoves(currentBoard, currentMoves, color);
                }

                if (color === WHITE) {
                    let maxEval = -Infinity;
                    let alpha = -Infinity;
                    let beta = Infinity;
                    for (const move of currentMoves) {
                        const { board: nb, ep: nep } = makeMove(currentBoard, move, epTarget);
                        const ev = minimax(nb, depth - 1, alpha, beta, false, nep, tt, startTime, MAX_TIME);
                        if (ev > maxEval) {
                            maxEval = ev;
                            bestMoveForDepth = move;
                        }
                        alpha = Math.max(alpha, ev);
                    }
                    tt.set(hash, { depth, flag: TT_EXACT, value: maxEval, bestMove: bestMoveForDepth! });
                } else {
                    let minEval = Infinity;
                    let alpha = -Infinity;
                    let beta = Infinity;
                    for (const move of currentMoves) {
                        const { board: nb, ep: nep } = makeMove(currentBoard, move, epTarget);
                        const ev = minimax(nb, depth - 1, alpha, beta, true, nep, tt, startTime, MAX_TIME);
                        if (ev < minEval) {
                            minEval = ev;
                            bestMoveForDepth = move;
                        }
                        beta = Math.min(beta, ev);
                    }
                    tt.set(hash, { depth, flag: TT_EXACT, value: minEval, bestMove: bestMoveForDepth! });
                }
                
                if (bestMoveForDepth) {
                    bestMoveOverall = bestMoveForDepth;
                }
                
                // Break early if we found a mate in X (so we don't just waste time searching deep into pointless forcing lines when mate is guaranteed)
                const score = tt.get(hash)?.value;
                if (score !== undefined && Math.abs(score) > 9000) {
                    break;
                }
            }
        } catch (e: any) {
            if (e.message !== "TIME_OUT") throw e;
            // timeout caught, we just use the bestMoveOverall from the last fully completed depth
        }

        return bestMoveOverall || moves[0];
    };

    // Human Interaction
    const handleSquareClick = (r: number, c: number) => {
        if (winner || isThinking || turn !== userColor) return;

        if (selectedSquare) {
            const [sr, sc] = selectedSquare;
            const moves = getLegalMoves(board, userColor, enPassantTarget);
            const move = moves.find(m => m[0] === sr && m[1] === sc && m[2] === r && m[3] === c);

            if (move) {
                executeMove(move);
                setSelectedSquare(null);
            } else {
                if (board[r][c] === userColor) {
                    setSelectedSquare([r, c]);
                } else {
                    setSelectedSquare(null);
                }
            }
        } else {
            if (board[r][c] === userColor) {
                setSelectedSquare([r, c]);
            }
        }
    };

    const executeMove = (move: Move) => {
        setHistory(prev => [...prev, { board: board.map(row => [...row]), turn, ep: enPassantTarget, lastMove }]);
        const { board: nb, ep: nep } = makeMove(board, move, enPassantTarget);
        setBoard(nb);
        setEnPassantTarget(nep);
        setLastMove(move);
        
        const nextTurn = turn === WHITE ? BLACK : WHITE;
        if (checkWin(nb, turn)) {
            setWinner(turn === WHITE ? 'White' : 'Black');
        } else {
            setTurn(nextTurn);
        }
    };

    // AI Turn Trigger
    useEffect(() => {
        if (!winner && userColor && turn !== userColor) {
            setIsThinking(true);
            const timer = setTimeout(() => {
                const move = getBestMove(board, turn, enPassantTarget);
                if (move) {
                    executeMove(move);
                } else {
                    setWinner(userColor === WHITE ? 'White' : 'Black');
                }
                setIsThinking(false);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [turn, winner, board, enPassantTarget, userColor]);

    const undoMove = () => {
        if (history.length === 0) return;
        const last = history[history.length - 1];
        setBoard(last.board);
        setTurn(last.turn);
        setEnPassantTarget(last.ep);
        setLastMove(last.lastMove);
        setWinner(null);
        setHistory(prev => prev.slice(0, -1));
    };

    const legalMovesForSelected = useMemo(() => {
        if (!selectedSquare || !userColor) return [];
        const [r, c] = selectedSquare;
        return getLegalMoves(board, userColor, enPassantTarget).filter(m => m[0] === r && m[1] === c);
    }, [selectedSquare, board, enPassantTarget, userColor]);

    const handleReset = () => {
        setUserColor(null);
        initBoard();
    };

    const handleDragStart = (r: number, c: number) => {
        if (winner || isThinking || turn !== userColor) return;
        if (board[r][c] === userColor) {
            setSelectedSquare([r, c]);
        }
    };

    const handleDrop = (r: number, c: number) => {
        if (winner || isThinking || turn !== userColor || !selectedSquare) return;
        
        const [sr, sc] = selectedSquare;
        const moves = getLegalMoves(board, userColor, enPassantTarget);
        const move = moves.find(m => m[0] === sr && m[1] === sc && m[2] === r && m[3] === c);

        if (move) {
            executeMove(move);
            setSelectedSquare(null);
        } else {
            // If dropping on an illegal square, we still want to keep or clear selection
            // Lichess clears it usually if it's not another of your pieces
            if (board[r][c] !== userColor) {
                setSelectedSquare(null);
            }
        }
    };

    return (
        <div className="min-h-screen bg-cream flex flex-col font-sans text-plum overflow-x-hidden">
            <Navbar />

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 pt-4 pb-8 flex flex-col items-center overflow-hidden">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                        Pawn <span className="text-berry italic">Game</span>
                    </h1>
                </div>

                {!userColor ? (
                    /* Side Selection View */
                    <div className="glass p-12 rounded-[3rem] border-plum/5 shadow-2xl max-w-3xl w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-berry/10 text-berry text-[10px] font-bold uppercase tracking-widest mb-6">
                            <Trophy size={12} />
                            Classic Mini-Game
                        </div>
                        <h2 className="text-3xl font-serif font-black mb-4 text-plum">Choose Your Side</h2>
                        <p className="text-plum/60 text-center max-w-xl mx-auto font-medium mb-12">
                            The objective of the pawn game is to be the first one to push your pawn to the opponent's side. You can find out more about it <Link to="/PawnGameStrategy" className="text-berry hover:underline font-bold">here</Link>.
                        </p>
                        <div className="grid grid-cols-2 gap-10 w-full">
                            {/* White Side Option */}
                            <button 
                                onClick={() => setUserColor(WHITE)}
                                className="group flex flex-col items-center gap-8 p-12 rounded-[4rem] bg-white border-2 border-transparent hover:border-berry transition-all hover:-translate-y-2 shadow-xl"
                            >
                                <div className="h-44 w-44 rounded-[3rem] bg-cream flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                    <svg viewBox="0 0 45 45" className="w-32 h-32 drop-shadow-2xl">
                                        <g fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinecap="round">
                                            <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" />
                                        </g>
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <span className="block font-black uppercase tracking-widest text-[10px] text-plum/40 mb-4">Move First</span>
                                    <div className="bg-berry/10 px-6 py-2 rounded-full">
                                        <span className="text-berry font-black uppercase tracking-widest text-xs">White</span>
                                    </div>
                                </div>
                            </button>

                            {/* Black Side Option */}
                            <button 
                                onClick={() => setUserColor(BLACK)}
                                className="group flex flex-col items-center gap-8 p-12 rounded-[4rem] bg-white border-2 border-transparent hover:border-plum transition-all hover:-translate-y-2 shadow-xl"
                            >
                                <div className="h-44 w-44 rounded-[3rem] bg-plum/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                    <svg viewBox="0 0 45 45" className="w-32 h-32 drop-shadow-2xl">
                                        <g fill="#000" stroke="#000" strokeWidth="1.5" strokeLinecap="round">
                                            <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" />
                                        </g>
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <span className="block font-black uppercase tracking-widest text-[10px] text-plum/40 mb-4">Move Second</span>
                                    <div className="bg-plum/10 px-6 py-2 rounded-full">
                                        <span className="text-plum font-black uppercase tracking-widest text-xs">Black</span>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Game View */
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 w-full max-w-7xl items-start animate-in fade-in duration-700">
                        
                        {/* Board - Left/Center */}
                        <div className="order-1 flex flex-col items-center w-full">
                            <div className="mb-4 flex items-center justify-between w-full max-w-[min(800px,calc(100vh-250px))] gap-4">
                                <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl justify-center border-2 transition-all ${turn === userColor ? 'bg-berry border-berry text-white shadow-lg scale-105' : 'bg-white border-plum/5 text-plum/30'}`}>
                                    <User size={18} />
                                    <span className="font-black text-xs uppercase tracking-widest whitespace-nowrap">You ({userColor === WHITE ? 'White' : 'Black'})</span>
                                </div>
                                <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl justify-center border-2 transition-all ${turn !== userColor ? 'bg-plum border-plum text-white shadow-lg scale-105' : 'bg-white border-plum/5 text-plum/30'}`}>
                                    <Cpu size={18} />
                                    <span className="font-black text-xs uppercase tracking-widest whitespace-nowrap">{isThinking ? 'Thinking...' : `AI (${userColor === WHITE ? 'Black' : 'White'})`}</span>
                                </div>
                            </div>

                            <div className="relative aspect-square w-full max-w-[min(800px,calc(100vh-250px))] shadow-2xl rounded-sm overflow-hidden border border-plum/10">
                                <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
                                    {board.map((_row, ri) => {
                                        // If user is Black, we flip the rows (visual only)
                                        const displayRi = userColor === BLACK ? 7 - ri : ri;
                                        const currentRow = board[displayRi];
                                        
                                        return currentRow.map((_square, ci) => {
                                            // If user is Black, we also flip the columns (visual only)
                                            const displayCi = userColor === BLACK ? 7 - ci : ci;
                                            const currentSquare = currentRow[displayCi];
                                            
                                            const isDark = (displayRi + displayCi) % 2 === 1;
                                            const isSelected = selectedSquare?.[0] === displayRi && selectedSquare?.[1] === displayCi;
                                            const isLastMove = lastMove && (
                                                (lastMove[0] === displayRi && lastMove[1] === displayCi) ||
                                                (lastMove[2] === displayRi && lastMove[3] === displayCi)
                                            );
                                            const isTarget = legalMovesForSelected.some(m => m[2] === displayRi && m[3] === displayCi);
                                            const hasPiece = currentSquare !== EMPTY;
                                            const pieceKey = `${currentSquare}-${displayRi}-${displayCi}`;
                                            const isPieceLoaded = loadedPieces[pieceKey];
                                            
                                            return (
                                                <div 
                                                    key={`${displayRi}-${displayCi}`}
                                                    onClick={() => handleSquareClick(displayRi, displayCi)}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={() => handleDrop(displayRi, displayCi)}
                                                    className={`relative flex items-center justify-center cursor-pointer select-none
                                                        ${isDark ? 'bg-[#b58863]' : 'bg-[#f0d9b5]'}
                                                    `}
                                                >
                                                    {/* Last Move Highlight */}
                                                    {isLastMove && (
                                                        <div className="absolute inset-0 bg-[rgba(155,199,0,0.41)]" />
                                                    )}

                                                    {/* Selected Square Highlight */}
                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-[rgba(20,85,30,0.5)]" />
                                                    )}

                                                    {/* Capture/Move Indicators */}
                                                    {isTarget && (
                                                        <div className={`absolute inset-0 flex items-center justify-center z-30 pointer-events-none`}>
                                                            {hasPiece ? (
                                                                <div className="w-[85%] h-[85%] rounded-full border-[6px] border-[rgba(0,0,0,0.1)]" />
                                                            ) : (
                                                                <div className="w-[25%] h-[25%] rounded-full bg-[rgba(0,0,0,0.1)]" />
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Rank/File Coordinates */}
                                                    {(userColor === BLACK ? displayCi === 7 : displayCi === 0) && (
                                                        <span className={`absolute top-0.5 left-0.5 text-[10px] font-bold leading-none ${isDark ? 'text-[#f0d9b5]' : 'text-[#b58863]'}`}>
                                                            {8 - displayRi}
                                                        </span>
                                                    )}
                                                    {(userColor === BLACK ? displayRi === 0 : displayRi === 7) && (
                                                        <span className={`absolute bottom-0.5 right-0.5 text-[10px] font-bold leading-none ${isDark ? 'text-[#f0d9b5]' : 'text-[#b58863]'}`}>
                                                            {String.fromCharCode(97 + displayCi)}
                                                        </span>
                                                    )}

                                                    {hasPiece && (
                                                        <img 
                                                            key={pieceKey}
                                                            src={getPieceImg(currentSquare)!} 
                                                            alt=""
                                                            aria-label={currentSquare === WHITE ? "White Pawn" : "Black Pawn"}
                                                            draggable={!winner && !isThinking && turn === userColor && currentSquare === userColor}
                                                            onDragStart={() => handleDragStart(displayRi, displayCi)}
                                                            onDragEnd={() => setSelectedSquare(null)}
                                                            onLoad={() => {
                                                                setLoadedPieces(prev => ({ ...prev, [pieceKey]: true }));
                                                            }}
                                                            className={`w-full h-full z-20 select-none transition-opacity duration-200 ${isPieceLoaded ? 'opacity-100' : 'opacity-0'} ${turn === userColor && currentSquare === userColor ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                                                            onError={(e) => {
                                                                e.currentTarget.src = getPieceFallback(currentSquare);
                                                                setLoadedPieces(prev => ({ ...prev, [pieceKey]: true }));
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        });
                                    })}
                                </div>

                                {/* Winner Overlay */}
                                {winner && (
                                    <div className="absolute inset-0 bg-plum/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 rounded-lg">
                                        <div className="w-20 h-20 bg-berry rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-berry/40 text-white animate-bounce">
                                            <Trophy size={40} />
                                        </div>
                                        <h2 className="text-4xl font-serif font-black text-white mb-2">{winner} Wins!</h2>
                                        <p className="text-white/60 font-bold mb-8 uppercase tracking-widest text-xs">Game Over</p>
                                        <button 
                                            onClick={handleReset}
                                            className="bg-white text-plum px-10 py-4 rounded-2xl font-black hover:bg-berry hover:text-white transition-all shadow-xl active:scale-95"
                                        >
                                            Play Again
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar - Right */}
                        <div className="order-2 space-y-8">
                            <div className="glass p-8 rounded-[2.5rem] border-plum/5 shadow-xl space-y-6">
                                <h3 className="font-serif text-2xl font-black flex items-center gap-3">
                                    <Info className="text-berry" size={24} />
                                    How to Play
                                </h3>
                                <ul className="space-y-4 text-plum/70 font-medium">
                                    <li className="flex gap-4">
                                        <span className="h-6 w-6 rounded-full bg-berry/10 text-berry flex items-center justify-center shrink-0 text-xs font-bold">1</span>
                                        <span>Pawns move 1 square forward (or 2 on their first move).</span>
                                    </li>
                                    <li className="flex gap-4">
                                        <span className="h-6 w-6 rounded-full bg-berry/10 text-berry flex items-center justify-center shrink-0 text-xs font-bold">2</span>
                                        <span>Capture diagonally. En Passant is allowed!</span>
                                    </li>
                                    <li className="flex gap-4">
                                        <span className="h-6 w-6 rounded-full bg-berry/10 text-berry flex items-center justify-center shrink-0 text-xs font-bold">3</span>
                                        <span>Win by reaching the opponent's back rank.</span>
                                    </li>
                                </ul>

                                <div className="pt-4 space-y-3">
                                    <button 
                                        onClick={undoMove}
                                        disabled={history.length === 0}
                                        className="w-full flex items-center justify-center gap-2 bg-white border-2 border-plum/10 text-plum py-4 rounded-2xl font-black hover:border-berry hover:text-berry transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                                    >
                                        <RotateCcw size={18} />
                                        Undo Last Move
                                    </button>
                                    <button 
                                        onClick={handleReset}
                                        className="w-full flex items-center justify-center gap-2 bg-plum text-cream py-4 rounded-2xl font-black hover:bg-berry transition-all shadow-lg active:scale-95"
                                    >
                                        Change Side
                                    </button>
                                </div>
                            </div>

                            <Link 
                                to="/"
                                className="flex items-center justify-center gap-2 text-plum/40 hover:text-berry font-bold uppercase text-xs tracking-widest transition-all py-4 hover:translate-x-[-4px]"
                            >
                                <ChevronLeft size={16} /> Back to Dashboard
                            </Link>
                        </div>
                    </div>
                )}
            </main>

            <footer className="py-12 text-center border-t border-plum/5">
                <p className="text-plum/40 font-medium tracking-wide">© 2026 Chess Parfait. Pawn Game Engine.</p>
            </footer>
        </div>
    );
};

export default PawnGame;
