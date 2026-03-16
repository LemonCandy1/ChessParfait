import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, RotateCcw, ChevronLeft, Cpu, User, Info, Check } from 'lucide-react';
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

const PawnGame: React.FC = () => {
    const [board, setBoard] = useState<Board>([]);
    const [turn, setTurn] = useState<typeof WHITE | typeof BLACK>(WHITE);
    const [userColor, setUserColor] = useState<typeof WHITE | typeof BLACK | null>(null);
    const [enPassantTarget, setEnPassantTarget] = useState<[number, number] | null>(null);
    const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
    const [winner, setWinner] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [history, setHistory] = useState<{ board: Board, turn: typeof WHITE | typeof BLACK, ep: [number, number] | null }[]>([]);
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
        return `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/wikipedia/${color}P.svg`;
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
    const evaluate = (currentBoard: Board): number => {
        let score = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (currentBoard[r][c] === WHITE) {
                    score += 100;
                    score += (7 - r) * 10;
                    if (isPassedPawn(currentBoard, r, c, WHITE)) score += 20;
                } else if (currentBoard[r][c] === BLACK) {
                    score -= 100;
                    score -= r * 10;
                    if (isPassedPawn(currentBoard, r, c, BLACK)) score -= 20;
                }
            }
        }
        return score;
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

    const minimax = (currentBoard: Board, depth: number, alpha: number, beta: number, maximizing: boolean, epTarget: [number, number] | null): number => {
        if (checkWin(currentBoard, WHITE)) return 10000 + depth;
        if (checkWin(currentBoard, BLACK)) return -10000 - depth;
        if (depth === 0) return evaluate(currentBoard);

        if (maximizing) {
            let maxEval = -Infinity;
            const moves = getLegalMoves(currentBoard, WHITE, epTarget);
            if (moves.length === 0) return -5000;
            for (const move of moves) {
                const { board: nb, ep: nep } = makeMove(currentBoard, move, epTarget);
                const ev = minimax(nb, depth - 1, alpha, beta, false, nep);
                maxEval = Math.max(maxEval, ev);
                alpha = Math.max(alpha, ev);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            const moves = getLegalMoves(currentBoard, BLACK, epTarget);
            if (moves.length === 0) return 5000;
            for (const move of moves) {
                const { board: nb, ep: nep } = makeMove(currentBoard, move, epTarget);
                const ev = minimax(nb, depth - 1, alpha, beta, true, nep);
                minEval = Math.min(minEval, ev);
                beta = Math.min(beta, ev);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    };

    const getBestMove = (currentBoard: Board, color: string, epTarget: [number, number] | null): Move | null => {
        const moves = getLegalMoves(currentBoard, color, epTarget);
        if (moves.length === 0) return null;

        let bestMove = null;
        if (color === WHITE) {
            let maxEval = -Infinity;
            for (const move of moves) {
                const { board: nb, ep: nep } = makeMove(currentBoard, move, epTarget);
                const ev = minimax(nb, 3, -Infinity, Infinity, false, nep);
                if (ev > maxEval) {
                    maxEval = ev;
                    bestMove = move;
                }
            }
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                const { board: nb, ep: nep } = makeMove(currentBoard, move, epTarget);
                const ev = minimax(nb, 3, -Infinity, Infinity, true, nep);
                if (ev < minEval) {
                    minEval = ev;
                    bestMove = move;
                }
            }
        }
        return bestMove;
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
        setHistory(prev => [...prev, { board: board.map(row => [...row]), turn, ep: enPassantTarget }]);
        const { board: nb, ep: nep } = makeMove(board, move, enPassantTarget);
        setBoard(nb);
        setEnPassantTarget(nep);
        
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

    return (
        <div className="min-h-screen bg-cream flex flex-col font-sans text-plum overflow-x-hidden">
            <Navbar />

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-24 flex flex-col items-center">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-berry/10 text-berry text-xs font-bold uppercase tracking-widest mb-6">
                        <Trophy size={14} />
                        Classic Mini-Game
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
                        Pawn <span className="text-berry italic">Game</span>
                    </h1>
                    <p className="text-plum/60 max-w-xl mx-auto font-medium">
                        The objective is simple: be the first to reach the opponent's back rank or capture all enemy pawns. 
                    </p>
                </div>

                {!userColor ? (
                    /* Side Selection View */
                    <div className="glass p-12 rounded-[3rem] border-plum/5 shadow-2xl max-w-2xl w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                        <h2 className="text-3xl font-serif font-black mb-12 text-plum">Choose Your Side</h2>
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
                    <div className="grid lg:grid-cols-3 gap-12 w-full max-w-6xl items-start animate-in fade-in duration-700">
                        
                        {/* Game Info - Left */}
                        <div className="order-2 lg:order-1 space-y-6">
                            <div className="glass p-6 rounded-[2rem] border-plum/5 shadow-xl space-y-4">
                                <h3 className="font-serif text-2xl font-black flex items-center gap-2">
                                    <Info className="text-berry" size={20} />
                                    How to Play
                                </h3>
                                <ul className="space-y-3 text-sm text-plum/70 font-medium">
                                    <li className="flex gap-3">
                                        <span className="h-5 w-5 rounded-full bg-berry/10 text-berry flex items-center justify-center shrink-0 text-[10px] font-bold">1</span>
                                        <span>Pawns move 1 square forward (or 2 on their first move).</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="h-5 w-5 rounded-full bg-berry/10 text-berry flex items-center justify-center shrink-0 text-[10px] font-bold">2</span>
                                        <span>Capture diagonally. En Passant is allowed!</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="h-5 w-5 rounded-full bg-berry/10 text-berry flex items-center justify-center shrink-0 text-[10px] font-bold">3</span>
                                        <span>Win by reaching the opponent's back rank.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={handleReset}
                                    className="flex-1 flex items-center justify-center gap-2 bg-plum text-cream py-4 rounded-2xl font-black hover:bg-berry transition-all shadow-lg active:scale-95"
                                >
                                    <RotateCcw size={18} />
                                    Change Side
                                </button>
                                <button 
                                    onClick={undoMove}
                                    disabled={history.length === 0}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-plum/10 text-plum py-4 rounded-2xl font-black hover:border-berry transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Undo
                                </button>
                            </div>
                        </div>

                        {/* Board - Center */}
                        <div className="order-1 lg:order-2 flex flex-col items-center">
                            <div className="mb-6 flex items-center justify-between w-full max-w-[450px] px-2">
                                <div className={`flex items-center gap-3 px-6 py-3 rounded-xl min-w-[160px] justify-center border-2 transition-colors ${turn === userColor ? 'bg-berry border-berry text-white shadow-lg' : 'bg-white border-plum/5 text-plum/30'}`}>
                                    <User size={18} />
                                    <span className="font-black text-sm uppercase tracking-widest">You ({userColor === WHITE ? 'White' : 'Black'})</span>
                                </div>
                                <div className={`flex items-center gap-3 px-6 py-3 rounded-xl min-w-[160px] justify-center border-2 transition-colors ${turn !== userColor ? 'bg-plum border-plum text-white shadow-lg' : 'bg-white border-plum/5 text-plum/30'}`}>
                                    <Cpu size={18} />
                                    <span className="font-black text-sm uppercase tracking-widest">{isThinking ? 'Thinking...' : `AI (${userColor === WHITE ? 'Black' : 'White'})`}</span>
                                </div>
                            </div>

                            <div className="relative aspect-square w-full max-w-[450px] bg-plum p-2 rounded-2xl shadow-2xl border-4 border-plum/10">
                                <div className="grid grid-cols-8 grid-rows-8 h-full w-full rounded-lg overflow-hidden border border-plum/20">
                                    {board.map((row, ri) => {
                                        // If user is Black, we flip the rows (visual only)
                                        const displayRi = userColor === BLACK ? 7 - ri : ri;
                                        const currentRow = board[displayRi];
                                        
                                        return currentRow.map((square, ci) => {
                                            // If user is Black, we also flip the columns (visual only)
                                            const displayCi = userColor === BLACK ? 7 - ci : ci;
                                            const currentSquare = currentRow[displayCi];
                                            
                                            const isDark = (displayRi + displayCi) % 2 === 1;
                                            const isSelected = selectedSquare?.[0] === displayRi && selectedSquare?.[1] === displayCi;
                                            const isTarget = legalMovesForSelected.some(m => m[2] === displayRi && m[3] === displayCi);
                                            const hasPiece = currentSquare !== EMPTY;
                                            const pieceKey = `${currentSquare}-${displayRi}-${displayCi}`;
                                            const isPieceLoaded = loadedPieces[pieceKey];
                                            
                                            return (
                                                <div 
                                                    key={`${displayRi}-${displayCi}`}
                                                    onClick={() => handleSquareClick(displayRi, displayCi)}
                                                    className={`relative flex items-center justify-center cursor-pointer transition-colors duration-200
                                                        ${isDark ? 'bg-[#B58863]' : 'bg-[#F0D9B5]'}
                                                        ${isSelected ? 'ring-4 ring-inset ring-berry/60 z-10' : ''}
                                                        hover:brightness-110
                                                    `}
                                                >
                                                    {/* Capture/Move Indicators */}
                                                    {isTarget && (
                                                        <div className={`absolute inset-0 flex items-center justify-center z-30 pointer-events-none`}>
                                                            {hasPiece ? (
                                                                <div className="w-12 h-12 rounded-full border-4 border-berry/40 shadow-inner" />
                                                            ) : (
                                                                <div className="w-4 h-4 rounded-full bg-berry/30" />
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Rank/File Coordinates */}
                                                    {(userColor === BLACK ? displayCi === 7 : displayCi === 0) && (
                                                        <span className={`absolute top-0.5 left-0.5 text-[8px] font-bold ${isDark ? 'text-[#F0D9B5]' : 'text-[#B58863]'}`}>
                                                            {8 - displayRi}
                                                        </span>
                                                    )}
                                                    {(userColor === BLACK ? displayRi === 0 : displayRi === 7) && (
                                                        <span className={`absolute bottom-0.5 right-0.5 text-[8px] font-bold ${isDark ? 'text-[#F0D9B5]' : 'text-[#B58863]'}`}>
                                                            {String.fromCharCode(97 + displayCi)}
                                                        </span>
                                                    )}

                                                    {hasPiece && (
                                                        <img 
                                                            key={pieceKey}
                                                            src={getPieceImg(currentSquare)!} 
                                                            alt=""
                                                            aria-label={currentSquare === WHITE ? "White Pawn" : "Black Pawn"}
                                                            onLoad={() => {
                                                                setLoadedPieces(prev => ({ ...prev, [pieceKey]: true }));
                                                            }}
                                                            className={`w-[85%] h-[85%] z-20 drop-shadow-md select-none pointer-events-none transition-all duration-300 ${isPieceLoaded ? 'opacity-100' : 'opacity-0 scale-50'} ${isSelected ? 'scale-110' : ''}`}
                                                            onError={(e) => {
                                                                e.currentTarget.src = getPieceFallback(currentSquare);
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

                        {/* Stats/History - Right */}
                        <div className="order-3 space-y-6">
                            <div className="glass p-6 rounded-[2rem] border-plum/5 shadow-xl">
                                <h3 className="font-serif text-2xl font-black mb-4">Board Stats</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/50 p-4 rounded-2xl border border-plum/5 text-center">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-plum/40 mb-1">White Pawns</div>
                                        <div className="text-2xl font-serif font-black">{board.flat().filter(p => p === WHITE).length}</div>
                                    </div>
                                    <div className="bg-white/50 p-4 rounded-2xl border border-plum/5 text-center">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-plum/40 mb-1">Black Pawns</div>
                                        <div className="text-2xl font-serif font-black">{board.flat().filter(p => p === BLACK).length}</div>
                                    </div>
                                </div>
                            </div>

                            <Link 
                                to="/"
                                className="flex items-center justify-center gap-2 text-plum/40 hover:text-berry font-bold uppercase text-xs tracking-widest transition-colors py-4"
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
