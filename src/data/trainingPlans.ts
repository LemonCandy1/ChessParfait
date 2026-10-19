/**
 * Daily training plan templates. Users pick one on the Training page and can switch at any time.
 * Shared by the page and the /api/training endpoints, so the checklist a user ticks and the
 * checklist the server rewards are always the same.
 *
 * To add your own files (e.g. Google Drive ChessBase folders), add a resource with kind 'file'
 * and its share link to the relevant item.
 */

export type ResourceKind = 'site' | 'external' | 'file' | 'book';

export interface TrainingResource {
    label: string;
    kind: ResourceKind;
    /** Site pages start with "/"; books may have no link. */
    url?: string;
}

export interface TrainingItem {
    id: string;
    /** Minutes for the activity; optional items still show their suggested time. */
    minutes: number;
    activity: string;
    focus: string;
    notes: string;
    /** Required items must all be ticked to finish the day and earn its points. */
    required: boolean;
    resources: TrainingResource[];
}

export interface TrainingPlan {
    id: string;
    name: string;
    level: string;
    summary: string;
    goals: string[];
    items: TrainingItem[];
}

const LICHESS_PUZZLES: TrainingResource = { label: 'Lichess puzzles', kind: 'external', url: 'https://lichess.org/training' };
const CHESSCOM_PUZZLES: TrainingResource = { label: 'Chess.com puzzles', kind: 'external', url: 'https://www.chess.com/puzzles' };
const CHESSTEMPO_TACTICS: TrainingResource = { label: 'ChessTempo tactics', kind: 'external', url: 'https://chesstempo.com/chess-tactics/' };
const CHESSTEMPO_OPENINGS: TrainingResource = { label: 'ChessTempo opening trainer', kind: 'external', url: 'https://chesstempo.com/opening-training/' };
const LICHESS_PLAY: TrainingResource = { label: 'Play on Lichess', kind: 'external', url: 'https://lichess.org/' };
const CHESSCOM_PLAY: TrainingResource = { label: 'Play on Chess.com', kind: 'external', url: 'https://www.chess.com/play/online' };
const LICHESS_ANALYSIS: TrainingResource = { label: 'Lichess analysis board', kind: 'external', url: 'https://lichess.org/analysis' };
const LICHESS_PRACTICE: TrainingResource = { label: 'Lichess practice', kind: 'external', url: 'https://lichess.org/practice' };
const PARFAIT_PUZZLES: TrainingResource = { label: 'ChessParfait weekly puzzles', kind: 'site', url: '/TrainingPuzzles' };
const PARFAIT_ENDGAMES: TrainingResource = { label: 'Endgame Practice', kind: 'site', url: '/EndgamePractice' };
const PARFAIT_STRATEGY: TrainingResource = { label: 'Endgame Strategy diagrams', kind: 'site', url: '/EndgameStrategy' };

export const TRAINING_PLANS: TrainingPlan[] = [
    {
        id: 'quick',
        name: 'Quick',
        level: 'Any level',
        summary: 'About half an hour a day: a short burst of tactics and one rapid game you check yourself.',
        goals: [
            'Keep your tactical eye sharp every day',
            'Play one game a day and find a mistake before an engine does'
        ],
        items: [
            {
                id: 'warmup',
                minutes: 10,
                activity: 'Warm-up Tactics',
                focus: 'This week\'s puzzles, then a few more at your level.',
                notes: 'Start with the ChessParfait weekly puzzles, then keep going on Lichess or Chess.com until the 10 minutes are up.',
                required: true,
                resources: [PARFAIT_PUZZLES, LICHESS_PUZZLES, CHESSCOM_PUZZLES]
            },
            {
                id: 'games',
                minutes: 20,
                activity: 'Quick Game',
                focus: 'One 10+5 game.',
                notes: 'Afterwards, find one mistake on your own before checking with an engine.',
                required: true,
                resources: [LICHESS_PLAY, CHESSCOM_PLAY, LICHESS_ANALYSIS]
            }
        ]
    },
    {
        id: 'beginner',
        name: 'Beginner',
        level: 'Under 1200',
        summary: 'About an hour a day: basic tactics, essential endgames and one game you review yourself.',
        goals: [
            'Spot forks, pins and mates in one or two moves quickly',
            'Win the basic endgames: king and pawn, and the queen and rook mates',
            'Play one serious game a day and find your own mistakes before checking with an engine'
        ],
        items: [
            {
                id: 'warmup',
                minutes: 15,
                activity: 'Warm-up Tactics',
                focus: 'Basic patterns: forks, pins, skewers and short mates.',
                notes: 'Keep the puzzles easy and aim for accuracy over speed.',
                required: true,
                resources: [PARFAIT_PUZZLES, LICHESS_PUZZLES, CHESSCOM_PUZZLES]
            },
            {
                id: 'endgames',
                minutes: 15,
                activity: 'Endgame Basics',
                focus: 'Opposition, the rule of the square and key squares.',
                notes: 'Learn one position in the Strategy diagrams, then play it against the bots until you complete it.',
                required: true,
                resources: [PARFAIT_STRATEGY, PARFAIT_ENDGAMES]
            },
            {
                id: 'games',
                minutes: 30,
                activity: 'Rapid Game',
                focus: 'One 15+10 game.',
                notes: 'Afterwards spend a few minutes finding your own mistakes without an engine, then check them.',
                required: true,
                resources: [LICHESS_PLAY, CHESSCOM_PLAY, LICHESS_ANALYSIS]
            },
            {
                id: 'openings',
                minutes: 15,
                activity: 'Opening Principles',
                focus: 'Develop, castle and fight for the centre.',
                notes: 'Optional. Review the opening of today\'s game against these principles.',
                required: false,
                resources: [LICHESS_PRACTICE]
            }
        ]
    },
    {
        id: 'club',
        name: 'Club Player',
        level: '1200 to 1800',
        summary: 'Just over two hours a day: tactics for quantity, calculation for quality, positional study and rapid games.',
        goals: [
            'Recognise common tactical patterns at a glance',
            'Calculate forcing lines deeply and accurately without moving the pieces',
            'Assess positions by their imbalances',
            'Review every game yourself before using an engine'
        ],
        items: [
            {
                id: 'warmup',
                minutes: 20,
                activity: 'Warm-up Tactics',
                focus: 'Pattern recognition (quantity).',
                notes: 'Set puzzles to easy on Chess.com, Lichess or ChessTempo.',
                required: true,
                resources: [LICHESS_PUZZLES, CHESSCOM_PUZZLES, CHESSTEMPO_TACTICS, PARFAIT_PUZZLES]
            },
            {
                id: 'calculation',
                minutes: 40,
                activity: 'Deep Calculation',
                focus: 'Visualisation and discipline (quality).',
                notes: 'Work through difficult calculations from grandmaster preparation books or ChessBase files from Drive.',
                required: true,
                resources: [{ label: 'Jacob Aagaard: Grandmaster Preparation, Calculation', kind: 'book' }]
            },
            {
                id: 'positional',
                minutes: 30,
                activity: 'Positional Study',
                focus: 'Imbalances and "reassessing" concepts.',
                notes: 'Books, puzzles and courses.',
                required: true,
                resources: [{ label: 'Jeremy Silman: How to Reassess Your Chess', kind: 'book' }, PARFAIT_STRATEGY]
            },
            {
                id: 'games',
                minutes: 40,
                activity: 'Rapid Games',
                focus: '10+5 or 15+10 time controls.',
                notes: 'Limit the session to 2 or 3 rapid games. After each one, spend 2 minutes analysing it WITHOUT an engine first: this builds discipline and understanding. Then look at what to change in your openings using master games or opening files. Finally, look at the blunders and big decisions you made.',
                required: true,
                resources: [LICHESS_PLAY, CHESSCOM_PLAY, LICHESS_ANALYSIS]
            },
            {
                id: 'openings',
                minutes: 30,
                activity: 'Review / Openings',
                focus: 'Use the optional 30 minutes to check your opening preparation.',
                notes: 'Optional. Build opening understanding with spaced repetition trainers in ChessBase or the ChessTempo opening trainer.',
                required: false,
                resources: [CHESSTEMPO_OPENINGS]
            }
        ]
    },
    {
        id: 'advanced',
        name: 'Advanced',
        level: '1800 and above',
        summary: 'About three hours a day: harder tactics, long calculation sessions, technique and longer games.',
        goals: [
            'Solve hard tactics under time pressure',
            'Calculate complex lines to the end and check them for opponent resources',
            'Convert winning endgames with precise technique',
            'Analyse every game in depth and update your repertoire'
        ],
        items: [
            {
                id: 'warmup',
                minutes: 20,
                activity: 'Warm-up Tactics',
                focus: 'Speed and pattern recognition at a harder level.',
                notes: 'Medium-difficulty puzzles against the clock.',
                required: true,
                resources: [CHESSTEMPO_TACTICS, LICHESS_PUZZLES, PARFAIT_PUZZLES]
            },
            {
                id: 'calculation',
                minutes: 60,
                activity: 'Deep Calculation',
                focus: 'Long, branching lines and candidate moves.',
                notes: 'Work through the hardest exercises from grandmaster preparation books or ChessBase files from Drive. Write your lines down before checking.',
                required: true,
                resources: [
                    { label: 'Jacob Aagaard: Grandmaster Preparation, Calculation', kind: 'book' },
                    { label: 'Alexander Kotov: Think Like a Grandmaster', kind: 'book' },
                    { label: 'Universal Chess Training', kind: 'book' },
                    { label: 'Mastering Chess Defense', kind: 'book' },
                    { label: 'Sam Shankland: Calculation', kind: 'book' },
                    { label: 'John Watson: Mastering the Chess Openings', kind: 'book' }
                ]
            },
            {
                id: 'technique',
                minutes: 40,
                activity: 'Endgame Technique',
                focus: 'Theoretical rook endings and converting advantages.',
                notes: 'Complete the Cherry Bomb endgames against Stockfish, then study master games that reach similar endings.',
                required: true,
                resources: [PARFAIT_ENDGAMES, PARFAIT_STRATEGY]
            },
            {
                id: 'games',
                minutes: 60,
                activity: 'Rapid / Classical Games',
                focus: '15+10 or longer.',
                notes: 'Two serious games. Annotate both without an engine first, then check your annotations and note any opening changes.',
                required: true,
                resources: [LICHESS_PLAY, CHESSCOM_PLAY, LICHESS_ANALYSIS]
            },
            {
                id: 'openings',
                minutes: 30,
                activity: 'Repertoire Review',
                focus: 'Spaced repetition of your opening files.',
                notes: 'Optional. Drill your repertoire in ChessBase or the ChessTempo opening trainer.',
                required: false,
                resources: [CHESSTEMPO_OPENINGS]
            }
        ]
    }
];

export const DEFAULT_PLAN_ID = 'quick';

export function findPlan(id: string | null | undefined): TrainingPlan | undefined {
    return TRAINING_PLANS.find(p => p.id === id);
}
