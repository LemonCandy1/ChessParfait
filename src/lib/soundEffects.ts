let audioCtx: AudioContext | null = null;
const buffers: Record<string, AudioBuffer | null> = {
    move: null,
    capture: null,
    win: null,
    lose: null
};

/**
 * Lazily gets or creates the AudioContext.
 */
function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

/**
 * Fetches and decodes an MP3 file into a raw PCM AudioBuffer for pop-free, low-latency playback.
 */
async function loadSound(name: string, url: string) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        
        const ctx = getAudioContext();
        ctx.decodeAudioData(
            arrayBuffer,
            (decodedBuffer) => {
                buffers[name] = decodedBuffer;
            },
            (err) => {
                console.warn(`Failed to decode audio data for ${url}:`, err);
            }
        );
    } catch (e) {
        console.warn(`Failed to preload sound from ${url}:`, e);
    }
}

// Start loading the assets immediately so they are ready when the user plays
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            loadSound('move', '/piece movement 1s.mp3');
            loadSound('capture', '/piece capture 1s.mp3');
            loadSound('win', '/soundshelfstudio-mission-complete-chime-534595.mp3');
            loadSound('lose', '/freesound_community-negative_beeps-6008.mp3');
        }, 100);
    });
}

/**
 * Plays a pre-decoded AudioBuffer.
 */
function playBuffer(buffer: AudioBuffer) {
    try {
        const ctx = getAudioContext();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    } catch (e) {
        console.warn("Failed to play audio buffer:", e);
    }
}

/**
 * Plays the piece movement sound.
 */
export function playMoveSound() {
    if (buffers.move) {
        playBuffer(buffers.move);
    } else {
        try {
            new Audio('/piece movement 1s.mp3').play().catch(() => {});
        } catch (e) {}
    }
}

/**
 * Plays the piece capture sound.
 */
export function playCaptureSound() {
    if (buffers.capture) {
        playBuffer(buffers.capture);
    } else {
        try {
            new Audio('/piece capture 1s.mp3').play().catch(() => {});
        } catch (e) {}
    }
}

/**
 * Plays the victory screen sound.
 */
export function playWinSound() {
    if (buffers.win) {
        playBuffer(buffers.win);
    } else {
        try {
            new Audio('/soundshelfstudio-mission-complete-chime-534595.mp3').play().catch(() => {});
        } catch (e) {}
    }
}

/**
 * Plays the defeat screen sound.
 */
export function playLoseSound() {
    if (buffers.lose) {
        playBuffer(buffers.lose);
    } else {
        try {
            new Audio('/freesound_community-negative_beeps-6008.mp3').play().catch(() => {});
        } catch (e) {}
    }
}
