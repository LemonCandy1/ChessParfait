import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject, type ReactNode } from 'react';
import type { Chess } from 'chess.js';
import { Chessboard, defaultArrowOptions, defaultPieces } from 'react-chessboard';

/**
 * The interactive endgame board shared by Endgame Practice and the Endgame Trainer, so both behave the same:
 * click or drag to move, legal-move dots, last-move highlight, right-click circles and drawn arrows, moves
 * queued while the opponent is thinking, and a promotion picker (Q/R/B/N keys, Esc to cancel).
 * The page owns the game: it plays moves through `onMove` and handles sounds, the opponent and results.
 */

const customArrowOptions = {
    ...defaultArrowOptions,
    color: '#0284c7',
    secondaryColor: '#ea580c',
    tertiaryColor: '#059669',
    opacity: 0.65,
    activeOpacity: 0.55,
};

/** Piece animation length on the board; a queued move waits for the opponent's move to finish animating. */
export const BOARD_ANIMATION_MS = 180;

const notationStyle: CSSProperties = { fontSize: '9.5px', fontWeight: 'bold', lineHeight: 1, zIndex: 15, pointerEvents: 'none', userSelect: 'none' };

function isPromotionMove(game: Chess, from: string, to: string): boolean {
    try {
        const piece = game.get(from as never);
        if (!piece || piece.type !== 'p') return false;
        const isPromoRank = (piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1');
        if (!isPromoRank) return false;
        return game.moves({ square: from as never, verbose: true }).some(m => m.to === to && Boolean(m.promotion));
    } catch {
        return false;
    }
}

export interface EndgameBoardProps {
    game: Chess;
    playerColor: 'w' | 'b';
    lastMove: { from: string; to: string } | null;
    /** False once the position is over: no moves at all. */
    canMove: boolean;
    /** False to stop pieces being selected too (Practice allows selecting after a fail, not after a solve). */
    canSelect?: boolean;
    /** True while the opponent is thinking; the player's moves are queued until it is their turn. */
    opponentBusy: MutableRefObject<boolean>;
    /** Plays a legal move for the player. Returns true if it was played. */
    onMove: (from: string, to: string, promotion?: string) => boolean;
    onMoveQueued?: () => void;
    /** A queued move turned out to be illegal once the opponent had moved. */
    onQueuedMoveIllegal?: () => void;
    /** Change this to clear selections, circles, queued moves and the promotion picker (new position or reset). */
    resetKey?: unknown;
    /** Fixed arrows to show, e.g. the right move after a mistake. Leave out to let the player draw their own. */
    arrows?: { startSquare: string; endSquare: string; color: string }[];
    /** Overlays drawn on top of the board (e.g. a "solved" celebration). */
    children?: ReactNode;
}

export default function EndgameBoard({
    game, playerColor, lastMove, canMove, canSelect = true, opponentBusy, onMove, onMoveQueued, onQueuedMoveIllegal, resetKey, arrows, children
}: EndgameBoardProps) {
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [circledSquares, setCircledSquares] = useState<string[]>([]);
    // While the player holds a piece, the board keeps showing the position they picked it up in. Redrawing
    // for the opponent's reply mid-drag would drop the piece; the move is played on the latest position on release.
    const [heldFen, setHeldFen] = useState<string | null>(null);
    const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string; color: 'w' | 'b' } | null>(null);
    const pendingMoveRef = useRef<{ from: string; to: string; promotion?: string } | null>(null);
    const queuedMoveTimerRef = useRef<number | null>(null);
    const gameRef = useRef(game);
    useEffect(() => { gameRef.current = game; }, [game]);

    // A new position or reset clears everything the player had in progress on the board.
    useEffect(() => {
        if (queuedMoveTimerRef.current) clearTimeout(queuedMoveTimerRef.current);
        queuedMoveTimerRef.current = null;
        pendingMoveRef.current = null;
        setPendingPromotion(null);
        setSelectedSquare(null);
        setCircledSquares([]);
    }, [resetKey]);

    useEffect(() => () => { if (queuedMoveTimerRef.current) clearTimeout(queuedMoveTimerRef.current); }, []);

    // Shared move executor for Click-to-Move and Drag-and-Drop
    const executeMove = useCallback((sourceSquare: string, targetSquare: string, chosenPromotion?: string): boolean => {
        if (!canMove) return false;
        const currentGame = gameRef.current;

        // If the opponent is calculating or it's not the player's turn, queue the move (premove)
        // so it executes as soon as the opponent's move lands.
        if (opponentBusy.current || currentGame.turn() !== playerColor) {
            const movingPiece = currentGame.get(sourceSquare as never);
            if (movingPiece && movingPiece.color === playerColor) {
                pendingMoveRef.current = { from: sourceSquare, to: targetSquare, promotion: chosenPromotion };
                setSelectedSquare(sourceSquare);
                onMoveQueued?.();
                return true;
            }
            return false;
        }

        // A pawn promotion where the player hasn't chosen a piece yet
        if (!chosenPromotion && isPromotionMove(currentGame, sourceSquare, targetSquare)) {
            setPendingPromotion({ from: sourceSquare, to: targetSquare, color: playerColor });
            setSelectedSquare(sourceSquare);
            return false;
        }

        if (!onMove(sourceSquare, targetSquare, chosenPromotion)) return false;
        setSelectedSquare(null);
        pendingMoveRef.current = null;
        return true;
    }, [canMove, onMove, onMoveQueued, opponentBusy, playerColor]);

    // When the opponent's move lands, keep the player's selection if it is still their piece, and play
    // a queued move once the opponent's move has finished animating.
    useEffect(() => {
        setSelectedSquare(prev => {
            if (!prev) return null;
            const piece = game.get(prev as never);
            return piece && piece.color === playerColor ? prev : null;
        });
        // The opponent's move ended the game: drop the queued move quietly.
        if (!canMove) pendingMoveRef.current = null;
        if (!pendingMoveRef.current || game.turn() !== playerColor || opponentBusy.current) return;
        queuedMoveTimerRef.current = window.setTimeout(() => {
            queuedMoveTimerRef.current = null;
            const pending = pendingMoveRef.current;
            pendingMoveRef.current = null;
            const latestGame = gameRef.current;
            if (!pending || latestGame.turn() !== playerColor) return;

            if (!pending.promotion && isPromotionMove(latestGame, pending.from, pending.to)) {
                setPendingPromotion({ from: pending.from, to: pending.to, color: playerColor });
            } else if (!executeMove(pending.from, pending.to, pending.promotion)) {
                setSelectedSquare(null);
                onQueuedMoveIllegal?.();
            }
        }, BOARD_ANIMATION_MS + 40);
        // Only reacts to a new position from the opponent's move; executeMove is read at fire time.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game]);

    const handleSelectPromotion = useCallback((promoPiece: 'q' | 'r' | 'b' | 'n') => {
        if (!pendingPromotion) return;
        const { from, to } = pendingPromotion;
        setPendingPromotion(null);
        executeMove(from, to, promoPiece);
    }, [executeMove, pendingPromotion]);

    const handleCancelPromotion = useCallback(() => {
        setPendingPromotion(null);
        setSelectedSquare(null);
    }, []);

    // Keyboard shortcuts for promotion selection
    useEffect(() => {
        if (!pendingPromotion) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            const pick = ({ q: 'q', '1': 'q', r: 'r', '2': 'r', b: 'b', '3': 'b', n: 'n', '4': 'n' } as const)[key as 'q'];
            if (pick) {
                e.preventDefault();
                handleSelectPromotion(pick);
            } else if (key === 'escape') {
                e.preventDefault();
                handleCancelPromotion();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pendingPromotion, handleSelectPromotion, handleCancelPromotion]);

    // Click handler for Click-to-Move (clicking piece then clicking target square)
    const handleSquareOrPieceClick = useCallback((square: string) => {
        // Left click removes all circled squares
        setCircledSquares([]);
        if (!canSelect) return;
        const currentGame = gameRef.current;

        if (selectedSquare) {
            // Clicking the same square toggles/deselects
            if (square === selectedSquare) {
                setSelectedSquare(null);
                pendingMoveRef.current = null;
                return;
            }
            // Clicking another friendly piece switches selection
            const pieceOnSquare = currentGame.get(square as never);
            if (pieceOnSquare && pieceOnSquare.color === playerColor) {
                setSelectedSquare(square);
                pendingMoveRef.current = null;
                return;
            }
            // If the opponent is calculating or it's not the player's turn, queue the move
            if (opponentBusy.current || currentGame.turn() !== playerColor) {
                executeMove(selectedSquare, square);
                return;
            }
            const isLegal = currentGame.moves({ square: selectedSquare as never, verbose: true }).some(m => m.to === square);
            if (isLegal) executeMove(selectedSquare, square);
            else setSelectedSquare(null);
            return;
        }

        // No piece selected: allow selecting the player's piece (even during the opponent's move)
        const pieceOnSquare = currentGame.get(square as never);
        if (pieceOnSquare && pieceOnSquare.color === playerColor) setSelectedSquare(square);
    }, [canSelect, executeMove, opponentBusy, playerColor, selectedSquare]);

    // A drag that ends without a drop (released off the board, cancelled) must still unfreeze the board.
    useEffect(() => {
        if (heldFen === null) return;
        const release = () => window.setTimeout(() => setHeldFen(null), 0);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') release(); };
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('pointerup', release);
            window.removeEventListener('pointercancel', release);
            window.removeEventListener('keydown', onKey);
        };
    }, [heldFen]);

    // Show legal moves as soon as a piece is picked up
    const onPieceDrag = useCallback(({ square }: { square: string | null }) => {
        setCircledSquares([]);
        setHeldFen(gameRef.current.fen());
        if (!square || !canSelect) return;
        const pieceOnSquare = gameRef.current.get(square as never);
        if (pieceOnSquare && pieceOnSquare.color === playerColor) setSelectedSquare(square);
    }, [canSelect, playerColor]);

    const onPieceDrop = useCallback(({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }): boolean => {
        setCircledSquares([]);
        setHeldFen(null);
        if (!targetSquare || !canSelect) {
            setSelectedSquare(null);
            return false;
        }
        const success = executeMove(sourceSquare, targetSquare);
        if (!pendingMoveRef.current) setSelectedSquare(null);
        return success;
    }, [canSelect, executeMove]);

    const handleSquareRightClick = useCallback((square: string) => {
        setCircledSquares(prev => (prev.includes(square) ? prev.filter(s => s !== square) : [...prev, square]));
    }, []);

    // Last move + right-click circles + selected piece and ONLY its current legal moves
    const squareStyles = useMemo(() => {
        const styles: Record<string, CSSProperties> = {};
        if (lastMove) {
            styles[lastMove.from] = { backgroundColor: 'rgba(205, 210, 106, 0.45)' };
            styles[lastMove.to] = { backgroundColor: 'rgba(205, 210, 106, 0.45)' };
        }
        circledSquares.forEach(sq => {
            const existingBg = styles[sq]?.backgroundColor || 'transparent';
            styles[sq] = {
                ...styles[sq],
                background: `radial-gradient(circle, transparent 58%, rgba(235, 87, 87, 0.85) 59%, rgba(235, 87, 87, 0.85) 78%, transparent 79%), ${existingBg}`
            };
        });
        if (selectedSquare) {
            styles[selectedSquare] = { backgroundColor: 'rgba(92, 140, 92, 0.6)' };
            try {
                game.moves({ square: selectedSquare as never, verbose: true }).forEach(move => {
                    const isCapture = move.captured || Boolean(game.get(move.to as never)) || move.flags.includes('e');
                    styles[move.to] = isCapture
                        ? { background: 'radial-gradient(circle, transparent 52%, rgba(82, 116, 68, 0.6) 53%, rgba(82, 116, 68, 0.6) 72%, transparent 73%)', cursor: 'pointer' }
                        : { background: 'radial-gradient(circle, rgba(92, 126, 78, 0.65) 19%, transparent 20%)', cursor: 'pointer' };
                });
            } catch (e) {
                console.error('Error generating legal moves:', e);
            }
        }
        return styles;
    }, [game, selectedSquare, lastMove, circledSquares]);

    return (
        <div
            className="w-full h-full rounded-xl overflow-hidden shadow-xl border-2 border-slate-300/80 bg-white select-none touch-none relative"
            onContextMenu={e => e.preventDefault()}
            onClick={() => setCircledSquares([])}
        >
            <Chessboard
                options={{
                    position: heldFen ?? game.fen(),
                    boardOrientation: playerColor === 'w' ? 'white' : 'black',
                    canDragPiece: ({ piece }: { piece: { pieceType?: string; color?: string } }) => {
                        if (!canMove) return false;
                        const pieceColor = piece?.pieceType?.[0] || piece?.color;
                        return pieceColor === playerColor;
                    },
                    onPieceDrop,
                    onPieceDrag,
                    onPieceClick: ({ square }: { square: string | null }) => square && handleSquareOrPieceClick(square),
                    onSquareClick: ({ square }: { square: string }) => handleSquareOrPieceClick(square),
                    onSquareRightClick: ({ square }: { square: string }) => handleSquareRightClick(square),
                    squareStyles,
                    darkSquareStyle: { backgroundColor: '#b58863' },
                    lightSquareStyle: { backgroundColor: '#f0d9b5' },
                    allowDrawingArrows: true,
                    clearArrowsOnClick: true,
                    arrowOptions: customArrowOptions,
                    ...(arrows ? { arrows } : {}),
                    alphaNotationStyle: { ...notationStyle, bottom: 2, right: 3 },
                    numericNotationStyle: { ...notationStyle, top: 2, left: 3 },
                    animationDurationInMs: BOARD_ANIMATION_MS
                }}
            />

            {pendingPromotion && (
                <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-[#FAF1DB] border-2 border-plum/20 rounded-2xl shadow-2xl p-5 max-w-xs sm:max-w-sm w-full mx-auto text-center space-y-3.5 animate-in zoom-in-95 duration-150">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-plum/60 font-mono">Pawn Promotion</div>
                            <h3 className="font-serif font-black text-xl text-plum mt-0.5">Choose Promotion Piece</h3>
                            <p className="text-xs text-plum/70 font-medium mt-0.5">
                                Click piece or press <kbd className="font-mono bg-white/70 px-1 py-0.5 rounded border border-plum/20 text-[10px]">Q</kbd> <kbd className="font-mono bg-white/70 px-1 py-0.5 rounded border border-plum/20 text-[10px]">R</kbd> <kbd className="font-mono bg-white/70 px-1 py-0.5 rounded border border-plum/20 text-[10px]">B</kbd> <kbd className="font-mono bg-white/70 px-1 py-0.5 rounded border border-plum/20 text-[10px]">N</kbd>
                            </p>
                        </div>

                        <div className="grid grid-cols-4 gap-2 pt-1">
                            {[
                                { type: 'q' as const, name: 'Queen', key: 'Q' },
                                { type: 'r' as const, name: 'Rook', key: 'R' },
                                { type: 'b' as const, name: 'Bishop', key: 'B' },
                                { type: 'n' as const, name: 'Knight', key: 'N' }
                            ].map(item => {
                                const PieceSvg = (defaultPieces as Record<string, (props: { svgStyle?: CSSProperties }) => ReactNode>)[`${pendingPromotion.color}${item.type.toUpperCase()}`];
                                return (
                                    <button
                                        key={item.type}
                                        onClick={() => handleSelectPromotion(item.type)}
                                        className="group flex flex-col items-center justify-center p-2 rounded-xl bg-white border-2 border-plum/15 hover:border-berry hover:bg-berry/5 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                                    >
                                        <div className="w-11 h-11 flex items-center justify-center">
                                            {PieceSvg ? <PieceSvg svgStyle={{ width: 42, height: 42 }} /> : <span className="text-3xl">{item.key}</span>}
                                        </div>
                                        <span className="text-xs font-black text-plum group-hover:text-berry mt-1">{item.name}</span>
                                        <span className="text-[10px] font-mono text-slate-400 font-bold">[{item.key}]</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-1 flex justify-center">
                            <button
                                onClick={handleCancelPromotion}
                                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors py-1.5 px-4 rounded-lg hover:bg-black/5 cursor-pointer"
                            >
                                Cancel Move
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {children}
        </div>
    );
}
