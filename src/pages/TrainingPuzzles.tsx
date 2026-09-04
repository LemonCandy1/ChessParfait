import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    CheckCircle2,
    ChevronLeft,
    Calendar,
    RotateCcw,
    Trophy,
    Sparkles,
    LogIn,
    Lightbulb,
    ArrowRight,
    HelpCircle,
    PartyPopper
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import Navbar from '../components/Navbar/Navbar';
import { supabase } from '../lib/supabaseClient';
import { ChessCakeSliceIcon, PieIcon, CherryBombIcon } from '../components/Icons';
import { playMoveSound, playCaptureSound, playWinSound, playLoseSound } from '../lib/soundEffects';
import localPuzzlesData from '../data/puzzles.json';
import { useAuth } from '../context/AuthContext';
import { DIFFICULTY_POINTS } from '../lib/levelSystem';

type Difficulty = 'Piece of Cake' | 'Hard Tart' | 'Cherry Bomb';

interface Puzzle {
    title: string;
    fen: string;
    question: string;
    answer?: string;
}

type PuzzlesData = Record<string, Puzzle[]>;

interface SolutionStep {
    san: string;
    from: string;
    to: string;
    promotion?: string;
    fenAfter: string;
}

/**
 * Parses raw answer string into verified sequential chess moves using chess.js
 */
function parseSolutionMoves(startFen: string, rawAnswer?: string): SolutionStep[] {
    if (!rawAnswer || !rawAnswer.trim()) return [];

    const tokens = rawAnswer
        .replace(/\d+\.{1,3}/g, ' ') // strip 1., 1...
        .replace(/[,;]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const steps: SolutionStep[] = [];
    try {
        const testGame = new Chess(startFen);
        for (const token of tokens) {
            let move = null;
            try {
                move = testGame.move(token);
            } catch {
                if (token.length >= 4 && token.length <= 5) {
                    const from = token.slice(0, 2);
                    const to = token.slice(2, 4);
                    const promotion = token.length === 5 ? token[4] : 'q';
                    try {
                        move = testGame.move({ from, to, promotion });
                    } catch { }
                }
            }

            if (move) {
                steps.push({
                    san: move.san,
                    from: move.from,
                    to: move.to,
                    promotion: move.promotion,
                    fenAfter: testGame.fen(),
                });
            } else {
                break;
            }
        }
    } catch (e) {
        console.warn('Error parsing puzzle solution:', e);
    }

    return steps;
}

export default function TrainingPuzzles() {
    const { user, updateUserStats } = useAuth();
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('Puzzle Solved!');
    const [game, setGame] = useState(new Chess());

    // Interactive puzzle gameplay states
    const [stepIndex, setStepIndex] = useState(0);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [puzzleStatus, setPuzzleStatus] = useState<'solving' | 'opponent_turn' | 'solved' | 'failed'>('solving');
    const [statusFeedback, setStatusFeedback] = useState<{ type: 'info' | 'success' | 'error' | 'celebrate'; message: string }>({
        type: 'info',
        message: 'Make your move on the board.'
    });
    const [showHint, setShowHint] = useState(false);
    const [showSolvedOverlay, setShowSolvedOverlay] = useState(false);
    const opponentTimerRef = useRef<number | null>(null);
    const solveRedirectTimerRef = useRef<number | null>(null);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
            if (solveRedirectTimerRef.current) clearTimeout(solveRedirectTimerRef.current);
        };
    }, []);

    // ── Puzzle data fetched from the Cloudflare Worker → Google Sheets ──
    const [puzzlesData, setPuzzlesData] = useState<PuzzlesData>(() => {
        try {
            const cached = localStorage.getItem('chessparfait_puzzles_data');
            if (cached) {
                return JSON.parse(cached) as PuzzlesData;
            }
        } catch (e) {
            console.error('Failed to parse cached puzzles:', e);
        }
        return localPuzzlesData as PuzzlesData;
    });

    useEffect(() => {
        fetch('/api/puzzles')
            .then(async (res) => {
                if (!res.ok) {
                    let errorMessage = `Failed to load puzzles (${res.status})`;
                    try {
                        const errData = await res.json();
                        if (errData.error) errorMessage += `: ${errData.error}`;
                    } catch (parseErr) {
                        console.warn('Failed to parse error response:', parseErr);
                    }
                    throw new Error(errorMessage);
                }
                return res.json() as Promise<PuzzlesData>;
            })
            .then((data) => {
                setPuzzlesData(data);
                try {
                    localStorage.setItem('chessparfait_puzzles_data', JSON.stringify(data));
                } catch (e) {
                    console.error('Failed to cache puzzles:', e);
                }
            })
            .catch((err: Error) => {
                console.error('Background puzzle fetch failed:', err.message);
            });
    }, []);

    /**
     * Logic to determine the puzzle week.
     * We use a reference Monday (March 2, 2026) as the start of "Week 1".
     * Puzzles refresh every Monday at 12:00 AM.
     */
    const puzzleInfo = useMemo(() => {
        if (!puzzlesData) return null;

        const now = new Date();
        const referenceDate = new Date('2026-03-02T00:00:00');
        const diffInMs = now.getTime() - referenceDate.getTime();
        const msInWeek = 1000 * 60 * 60 * 24 * 7;
        const weekIndex = diffInMs < 0 ? 0 : Math.floor(diffInMs / msInWeek);
        const currentWeekNumber = weekIndex + 1;

        const select = (diff: Difficulty) => {
            const pool = puzzlesData[diff] || (diff === 'Cherry Bomb' ? puzzlesData['Challenge'] : undefined) || [];
            if (!pool || pool.length === 0) return { title: `${diff} Puzzle`, fen: '8/8/8/8/8/8/8/8 w - - 0 1', question: 'Find the best move.' };
            return pool[weekIndex % pool.length];
        };

        return {
            weekNumber: currentWeekNumber,
            puzzles: {
                'Piece of Cake': select('Piece of Cake'),
                'Hard Tart': select('Hard Tart'),
                'Cherry Bomb': select('Cherry Bomb')
            }
        };
    }, [puzzlesData]);

    const weeklyPuzzles = puzzleInfo?.puzzles ?? null;
    const activePuzzle = selectedDifficulty && weeklyPuzzles ? weeklyPuzzles[selectedDifficulty] : null;
    const initialTurn = activePuzzle ? activePuzzle.fen.split(' ')[1] : 'w';
    const puzzleOrientation = initialTurn === 'b' ? 'black' : 'white';

    // Parse solution steps for the active puzzle
    const solutionSteps = useMemo(() => {
        if (!activePuzzle) return [];
        return parseSolutionMoves(activePuzzle.fen, activePuzzle.answer);
    }, [activePuzzle]);

    // Reset board and state when difficulty changes
    useEffect(() => {
        if (opponentTimerRef.current) {
            clearTimeout(opponentTimerRef.current);
            opponentTimerRef.current = null;
        }
        if (solveRedirectTimerRef.current) {
            clearTimeout(solveRedirectTimerRef.current);
            solveRedirectTimerRef.current = null;
        }
        setShowSolvedOverlay(false);
        setWrongAttempts(0);

        if (selectedDifficulty && weeklyPuzzles && weeklyPuzzles[selectedDifficulty]) {
            setGame(new Chess(weeklyPuzzles[selectedDifficulty].fen));
            setStepIndex(0);
            setPuzzleStatus('solving');
            setShowHint(false);
            setStatusFeedback({
                type: 'info',
                message: `${initialTurn === 'w' ? 'White' : 'Black'} to move. Find the best move!`
            });
        }
    }, [selectedDifficulty, weeklyPuzzles, initialTurn]);

    // Reset current puzzle to beginning
    const handleResetPuzzle = useCallback(() => {
        if (opponentTimerRef.current) {
            clearTimeout(opponentTimerRef.current);
            opponentTimerRef.current = null;
        }
        if (solveRedirectTimerRef.current) {
            clearTimeout(solveRedirectTimerRef.current);
            solveRedirectTimerRef.current = null;
        }
        setShowSolvedOverlay(false);

        if (activePuzzle) {
            setGame(new Chess(activePuzzle.fen));
            setStepIndex(0);
            setPuzzleStatus('solving');
            setShowHint(false);
            setStatusFeedback({
                type: 'info',
                message: 'Board reset. Give it another shot!'
            });
        }
    }, [activePuzzle]);

    // Award points on successful completion
    const handleAwardSolve = useCallback(async () => {
        if (!selectedDifficulty || !puzzleInfo) return;

        setShowSolvedOverlay(true);
        if (solveRedirectTimerRef.current) {
            clearTimeout(solveRedirectTimerRef.current);
        }
        // Dismiss the green tint after 3 seconds so the user can see the final position of the puzzle
        solveRedirectTimerRef.current = window.setTimeout(() => {
            setShowSolvedOverlay(false);
        }, 3000);

        // If user made 3 or more wrong moves, no points are added
        if (wrongAttempts >= 3) {
            setSuccessMessage('Puzzle Solved! (0 points awarded - maximum mistakes exceeded)');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
            return;
        }

        try {
            if (user) {
                const res = await fetch('/api/puzzles/solve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        week: puzzleInfo.weekNumber,
                        difficulty: selectedDifficulty,
                        title: weeklyPuzzles?.[selectedDifficulty]?.title,
                        answer: 'Interactive Board Solve'
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.totalPoints !== undefined && data.solvedPuzzles) {
                        updateUserStats(data.totalPoints, data.solvedPuzzles);
                    }
                    if (data.alreadySolved) {
                        setSuccessMessage('Puzzle Solved! (Points already claimed this week)');
                    } else {
                        const earned = data.pointsAwarded || DIFFICULTY_POINTS[selectedDifficulty] || 25;
                        setSuccessMessage(`+${earned} Points Earned! Level progress updated.`);
                    }
                }
            } else {
                // Guest fallback: record answer in ChallengeAnswers
                await supabase.from('ChallengeAnswers').insert([
                    {
                        user_name: 'Guest Player',
                        difficulty: selectedDifficulty,
                        answer: 'Interactive Board Solve',
                        week: puzzleInfo.weekNumber,
                        created_at: new Date().toISOString()
                    }
                ]);
                setSuccessMessage('Puzzle Solved! Sign in to save permanent points & level up.');
            }

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
        } catch (err) {
            console.error('Error recording solve:', err);
        }
    }, [selectedDifficulty, puzzleInfo, user, weeklyPuzzles, updateUserStats, wrongAttempts]);

    // Board Drop Handler
    const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string, targetSquare: string | null }) => {
        if (!targetSquare) return false;
        if (puzzleStatus === 'opponent_turn' || puzzleStatus === 'solved') return false;

        try {
            const gameCopy = new Chess(game.fen());
            const move = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q',
            });

            if (move === null) return false;

            // Check if solution steps exist for validation
            if (solutionSteps.length > 0) {
                const expected = solutionSteps[stepIndex];
                const isMatch = expected && (
                    (expected.from === sourceSquare && expected.to === targetSquare) ||
                    (expected.san === move.san)
                );

                if (!isMatch) {
                    playLoseSound();
                    const newWrongCount = wrongAttempts + 1;
                    setWrongAttempts(newWrongCount);
                    setPuzzleStatus('failed');

                    if (newWrongCount >= 3) {
                        setStatusFeedback({
                            type: 'error',
                            message: 'Try to calculate the whole line before you move! Maximum attempts reached for points. You can still solve for practice!'
                        });
                    } else {
                        const remaining = 3 - newWrongCount;
                        setStatusFeedback({
                            type: 'error',
                            message: `Not quite! ${remaining} attempt${remaining === 1 ? '' : 's'} remaining for points.`
                        });
                    }
                    return false;
                }

                // Correct player move!
                if (move.captured) {
                    playCaptureSound();
                } else {
                    playMoveSound();
                }

                setGame(gameCopy);
                setShowHint(false);

                const nextStep = stepIndex + 1;

                // If there is an opponent reply in the line
                if (nextStep < solutionSteps.length) {
                    const opponentStep = solutionSteps[nextStep];
                    setStepIndex(nextStep);
                    setPuzzleStatus('opponent_turn');
                    setStatusFeedback({
                        type: 'success',
                        message: 'Great move! Opponent is responding...'
                    });

                    // Auto-play opponent response after 450ms
                    opponentTimerRef.current = window.setTimeout(() => {
                        try {
                            const oppGame = new Chess(gameCopy.fen());
                            const oppMove = oppGame.move({
                                from: opponentStep.from,
                                to: opponentStep.to,
                                promotion: opponentStep.promotion || 'q'
                            }) || oppGame.move(opponentStep.san);

                            if (oppMove) {
                                if (oppMove.captured) {
                                    playCaptureSound();
                                } else {
                                    playMoveSound();
                                }
                                setGame(oppGame);

                                const stepAfterOpponent = nextStep + 1;
                                if (stepAfterOpponent < solutionSteps.length) {
                                    setStepIndex(stepAfterOpponent);
                                    setPuzzleStatus('solving');
                                    setStatusFeedback({
                                        type: 'info',
                                        message: 'Your turn! Find the next winning move.'
                                    });
                                } else {
                                    // Finished after opponent move
                                    playWinSound();
                                    setPuzzleStatus('solved');
                                    setStatusFeedback({
                                        type: 'celebrate',
                                        message: 'Puzzle Solved! Parfait tactical calculation!'
                                    });
                                    handleAwardSolve();
                                }
                            }
                        } catch (e) {
                            console.error('Error auto-playing opponent move:', e);
                        }
                    }, 450);

                    return true;
                } else {
                    // Final player move completed the puzzle!
                    playWinSound();
                    setPuzzleStatus('solved');
                    setStatusFeedback({
                        type: 'celebrate',
                        message: 'Puzzle Solved! Parfait tactical calculation!'
                    });
                    handleAwardSolve();
                    return true;
                }
            } else {
                // Free play fallback if no solution steps were specified
                if (move.captured) {
                    playCaptureSound();
                } else {
                    playMoveSound();
                }
                setGame(gameCopy);
                playWinSound();
                setPuzzleStatus('solved');
                setStatusFeedback({
                    type: 'celebrate',
                    message: 'Move played! Solution submitted.'
                });
                handleAwardSolve();
                return true;
            }
        } catch {
            return false;
        }
    };

    // Hint generator
    const currentHint = useMemo(() => {
        if (!solutionSteps || solutionSteps.length === 0) {
            return 'Look for checks, captures, and unprotected pieces!';
        }
        const expected = solutionSteps[stepIndex];
        if (!expected) return 'Find the best continuation.';

        // Identify piece type from starting square
        const piece = game.get(expected.from as any);
        const pieceNames: Record<string, string> = {
            p: 'Pawn',
            n: 'Knight',
            b: 'Bishop',
            r: 'Rook',
            q: 'Queen',
            k: 'King'
        };
        const pieceName = piece ? pieceNames[piece.type.toLowerCase()] || 'Piece' : 'Piece';
        return `Hint: Move your ${pieceName} from ${expected.from.toUpperCase()}.`;
    }, [solutionSteps, stepIndex, game]);

    // ── Early return if puzzleInfo is not available ──
    if (!puzzleInfo) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center text-plum font-sans">
                <Navbar />
                <div className="flex flex-col items-center gap-4 text-center">
                    <p className="text-berry font-black text-lg">Failed to load puzzles</p>
                    <p className="text-plum/50 text-sm">Puzzle data is currently unavailable.</p>
                </div>
            </div>
        );
    }

    const themes: Record<Difficulty, { bg: string; text: string; icon: (size?: number) => React.ReactNode }> = {
        'Piece of Cake': { bg: 'bg-emerald-50/30', text: 'text-emerald-600', icon: (size = 24) => <ChessCakeSliceIcon size={size} /> },
        'Hard Tart': { bg: 'bg-amber-50/30', text: 'text-amber-600', icon: (size = 24) => <PieIcon size={size} /> },
        'Cherry Bomb': { bg: 'bg-berry/5', text: 'text-berry', icon: (size = 24) => <CherryBombIcon size={size} /> }
    };

    const isCurrentDifficultySolved = selectedDifficulty && user?.solvedPuzzles?.some(
        (p) => p.week === puzzleInfo.weekNumber && (p.difficulty === selectedDifficulty || (selectedDifficulty === 'Cherry Bomb' && p.difficulty === 'Challenge'))
    );

    return (
        <div className="min-h-screen bg-cream flex flex-col relative overflow-x-clip text-plum font-sans">
            <div className="absolute top-0 left-0 w-250 h-250 bg-berry/5 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            <Navbar />

            <main className={`flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col relative z-10 py-4 ${!selectedDifficulty ? 'justify-center' : 'justify-start'}`}>

                {!selectedDifficulty ? (
                    <>
                        {/* Landing View Header */}
                        <header className="text-center mb-12 max-w-3xl mx-auto">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-berry uppercase bg-berry/10 rounded-full">
                                Puzzle Week {puzzleInfo.weekNumber}
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black text-plum mb-6 tracking-tight leading-tight">
                                Training <span className="text-berry italic">Puzzles</span>
                            </h1>
                            <div className="space-y-4">
                                <p className="text-xl text-plum/60 leading-relaxed">
                                    Select the difficulty to begin this week's chess puzzle and earn points!
                                </p>
                                <div className="flex items-center justify-center gap-2 text-plum/40 text-sm font-bold uppercase tracking-widest">
                                    <Calendar size={16} />
                                    <span>Puzzles refresh every Monday</span>
                                </div>
                            </div>
                        </header>

                        {/* Difficulty Selection View */}
                        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full pb-12">
                            {(['Piece of Cake', 'Hard Tart', 'Cherry Bomb'] as Difficulty[]).map((level) => {
                                const isSolved = user?.solvedPuzzles?.some(
                                    (p) => p.week === puzzleInfo.weekNumber && (p.difficulty === level || (level === 'Cherry Bomb' && p.difficulty === 'Challenge'))
                                );
                                const points = DIFFICULTY_POINTS[level] || 25;

                                return (
                                    <button
                                        key={level}
                                        onClick={() => setSelectedDifficulty(level)}
                                        className="soft-card soft-card-hover rounded-[3rem] p-12 flex flex-col items-center gap-6 group relative overflow-hidden text-left"
                                    >
                                        {/* Status / Points Pill */}
                                        <div className="flex items-center gap-1.5">
                                            {isSolved ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                    <CheckCircle2 size={12} className="text-emerald-600" />
                                                    Solved (+{points} pts)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-berry/10 text-berry text-[10px] font-black uppercase tracking-wider">
                                                    <Trophy size={11} className="text-amber-500" />
                                                    +{points} Points
                                                </span>
                                            )}
                                        </div>

                                        <div className={`p-5 rounded-[2.5rem] bg-white shadow-sm group-hover:scale-115 transition-transform duration-500 ${themes[level].text} w-fit`}>
                                            {themes[level].icon(48)}
                                        </div>
                                        <div className="text-center w-full">
                                            <h3 className="text-3xl font-serif font-black tracking-tight mb-2">{level}</h3>
                                            <span className="font-black uppercase tracking-[0.2em] text-[10px] text-plum/30">Difficulty</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    /* Puzzle Detail View */
                    <div className="w-full max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                        <div className="flex justify-between items-center mb-4">
                            <button
                                onClick={() => setSelectedDifficulty(null)}
                                className="inline-flex items-center gap-2 text-plum/50 hover:text-berry font-bold uppercase text-[10px] tracking-widest transition-colors py-2 px-3 rounded-xl hover:bg-white/50"
                            >
                                <ChevronLeft size={16} /> Back to selection
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-plum/40 bg-white/60 px-3 py-1.5 rounded-full border border-plum/10">
                                    Week {puzzleInfo.weekNumber} • {selectedDifficulty}
                                </span>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start mt-2">
                            {/* Board Column */}
                            <div className="lg:col-span-6 flex flex-col items-center w-full">
                                <div className="flex items-center justify-between w-full max-w-[440px] mb-3 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur-sm border-2 border-plum/15 shadow-sm">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-3.5 h-3.5 rounded-full ${initialTurn === 'w' ? 'bg-white border-[1.5px] border-plum/30 shadow-inner' : 'bg-plum shadow-inner'}`} />
                                        <span className="font-black text-xs uppercase tracking-wider text-plum/80">
                                            {initialTurn === 'w' ? 'White to move' : 'Black to move'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title={`${Math.max(0, 3 - wrongAttempts)} attempt${3 - wrongAttempts === 1 ? '' : 's'} remaining for points`}>
                                        {[0, 1, 2].map((i) => (
                                            <div
                                                key={i}
                                                className={`w-2.5 h-2.5 rounded-full border transition-all ${i < wrongAttempts
                                                        ? 'bg-rose-500 border-rose-600 scale-90'
                                                        : 'bg-emerald-400 border-emerald-500'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="w-full aspect-square max-w-[440px] mx-auto relative group">
                                    <div className="p-4 soft-card shadow-2xl h-full flex flex-col relative overflow-hidden">
                                        <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner border-2 border-plum/15 bg-white translate-z-0 relative">
                                            <Chessboard
                                                options={{
                                                    position: game.fen(),
                                                    boardOrientation: puzzleOrientation,
                                                    onPieceDrop: onDrop,
                                                    darkSquareStyle: { backgroundColor: '#b58863' },
                                                    lightSquareStyle: { backgroundColor: '#f0d9b5' },
                                                    animationDurationInMs: 250
                                                }}
                                            />

                                            {/* Solved Overlay animation */}
                                            {showSolvedOverlay && (
                                                <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                                                    <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-xl animate-bounce">
                                                        <PartyPopper size={32} />
                                                    </div>
                                                    <h3 className="font-serif font-black text-2xl text-white mb-1">Puzzle Solved!</h3>
                                                    <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider">
                                                        {wrongAttempts >= 3
                                                            ? '0 Points (3 Mistakes Exceeded)'
                                                            : `+${DIFFICULTY_POINTS[selectedDifficulty]} Points Awarded`}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Board Controls */}
                                <div className="flex items-center gap-3 w-full max-w-[440px] mt-4">
                                    <button
                                        onClick={handleResetPuzzle}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-plum/15 bg-white/70 hover:bg-white text-plum font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
                                    >
                                        <RotateCcw size={15} />
                                        <span>Reset Position</span>
                                    </button>
                                    <button
                                        onClick={() => setShowHint(!showHint)}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-amber-300/80 bg-amber-50/80 hover:bg-amber-100 text-amber-900 font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
                                    >
                                        <Lightbulb size={15} className="text-amber-600" />
                                        <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Puzzle Info & Actions Column */}
                            <div className="lg:col-span-6 space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-plum/10 ${themes[selectedDifficulty].bg}`}>
                                            <span className={themes[selectedDifficulty].text}>
                                                {themes[selectedDifficulty].icon(18)}
                                            </span>
                                            <span className="font-black uppercase tracking-widest text-[11px] text-plum/70">{selectedDifficulty}</span>
                                        </div>

                                        {(puzzleStatus === 'solved' || isCurrentDifficultySolved) ? (
                                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider border border-emerald-300/50">
                                                <CheckCircle2 size={14} className="text-emerald-600" />
                                                Completed (+{DIFFICULTY_POINTS[selectedDifficulty]} pts)
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-berry/10 text-berry text-xs font-black uppercase tracking-wider border border-berry/20">
                                                <Trophy size={14} className="text-amber-500" />
                                                +{DIFFICULTY_POINTS[selectedDifficulty]} Points on Solve
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-plum">
                                        {weeklyPuzzles?.[selectedDifficulty]?.title}
                                    </h2>
                                    <p className="text-lg text-plum/70 font-medium italic leading-relaxed">
                                        "{weeklyPuzzles?.[selectedDifficulty]?.question}"
                                    </p>
                                </div>

                                {/* Status & Actions Card */}
                                <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border-2 border-plum/15 shadow-sm space-y-4">
                                    {/* Feedback Status Alert */}
                                    <div className={`p-4 rounded-2xl border-2 flex items-center gap-3.5 transition-all ${statusFeedback.type === 'celebrate'
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm'
                                        : statusFeedback.type === 'success'
                                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                                            : statusFeedback.type === 'error'
                                                ? 'bg-rose-50 border-rose-300 text-rose-900 animate-shake'
                                                : 'bg-plum/5 border-plum/15 text-plum'
                                        }`}>
                                        {statusFeedback.type === 'celebrate' ? (
                                            <Sparkles className="text-amber-500 shrink-0" size={20} />
                                        ) : statusFeedback.type === 'error' ? (
                                            <HelpCircle className="text-rose-500 shrink-0" size={20} />
                                        ) : (
                                            <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
                                        )}
                                        <p className="text-sm font-black leading-snug">
                                            {statusFeedback.message}
                                        </p>
                                    </div>

                                    {/* Hint Card (Smooth Grid Accordion) */}
                                    <div
                                        className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                                            showHint ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                                        }`}
                                    >
                                        <div className="overflow-hidden">
                                            <div
                                                className={`p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-900 text-xs font-bold leading-relaxed flex items-start gap-2.5 transition-opacity duration-160 ${
                                                    showHint ? 'opacity-100 delay-50' : 'opacity-0'
                                                }`}
                                            >
                                                <Lightbulb className="text-amber-600 shrink-0 mt-0.5" size={16} />
                                                <div>
                                                    <span className="block font-black uppercase tracking-wider text-[10px] text-amber-700 mb-0.5">Tactical Clue</span>
                                                    <span>{currentHint}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Solve Action summary */}
                                    {puzzleStatus === 'solved' && (
                                        <div className="pt-2 flex flex-col gap-3">
                                            <div className="flex items-center justify-between text-xs font-bold text-plum/70 px-1">
                                                <span>Calculation complete!</span>
                                                <span className="text-emerald-600 font-black">All moves verified ✓</span>
                                            </div>
                                            <button
                                                onClick={() => setSelectedDifficulty(null)}
                                                className="w-full py-3.5 soft-button-berry flex items-center justify-center gap-2 text-sm font-bold shadow-lg"
                                            >
                                                <span>Try Another Puzzle</span>
                                                <ArrowRight size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {!user && (
                                    <div className="p-4 bg-white/70 border-2 border-plum/15 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold text-plum/70 shadow-sm">
                                        <span>Sign in to permanently save your puzzle points & rank up!</span>
                                        <Link to="/login" className="text-berry font-black underline flex items-center gap-1 shrink-0 hover:text-plum transition-colors">
                                            <LogIn size={14} />
                                            <span>Sign In</span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Success Toast */}
            <div
                className={`fixed bottom-12 left-1/2 -translate-x-1/2 bg-plum text-cream px-8 py-4 rounded-3xl font-black shadow-2xl flex items-center gap-3.5 z-100 border border-white/10 text-sm transition-[transform,opacity] ${
                    showSuccess
                        ? 'opacity-100 translate-y-0 scale-100 duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]'
                        : 'opacity-0 translate-y-4 scale-[0.96] duration-150 ease-[cubic-bezier(0.4,0,1,1)] pointer-events-none'
                }`}
            >
                <Sparkles size={20} className="text-amber-300" />
                <span>{successMessage}</span>
            </div>
        </div>
    );
}
