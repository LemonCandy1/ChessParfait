import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const TOTAL_IMAGE_FRAMES = 145;
const BLACK_FRAMES = 10;
const TOTAL_FRAMES = TOTAL_IMAGE_FRAMES + BLACK_FRAMES;

const frameArray = Array.from({ length: TOTAL_IMAGE_FRAMES }, (_, i) => {
  const paddedIndex = (i + 1).toString().padStart(3, '0');
  return `/video_frames_webp/ffout${paddedIndex}.webp`;
});

export default function ParfaitScrollSequence() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Texts (Fades out directly when traversing past the 10 black frames)
  const text1Opacity = useTransform(scrollYProgress, [0, 0.06, 0.10], [1, 1, 0]);
  const text1Y = useTransform(scrollYProgress, [0, 0.10], [0, -50]);

  const text4Opacity = useTransform(scrollYProgress, [0.65, 0.8, 1], [0, 1, 1]);
  const text4Y = useTransform(scrollYProgress, [0.65, 0.8], [50, 0]);

  // Preload images
  useEffect(() => {
    let loaded = 0;
    const imgArray: HTMLImageElement[] = [];

    frameArray.forEach((url) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        loaded++;
        setLoadedCount(loaded);
      };
      imgArray.push(img);
    });

    setImages(imgArray);
  }, []);

  // Draw frame on scroll
  useEffect(() => {
    if (loadedCount < TOTAL_IMAGE_FRAMES || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // 1. Bulletproof Canvas Resizing inside the render loop (Physical Pixels)
      const dpr = window.devicePixelRatio || 1;
      const physicalWidth = Math.floor(canvas.clientWidth * dpr);
      const physicalHeight = Math.floor(canvas.clientHeight * dpr);

      // If screen or DPR changed, update canvas buffer exactly to physical pixels
      if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
        canvas.width = physicalWidth;
        canvas.height = physicalHeight;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }

      // Map progress to frame index
      // Finish animation at 80% scroll to leave a "pause" at the end for reading
      // and to prevent mobile browser bottom-bar issues cutting off the last frames
      const currentProgress = Math.min(1, scrollYProgress.get() / 0.8);
      const frameIndex = Math.min(
        TOTAL_FRAMES - 1,
        Math.max(0, Math.floor(currentProgress * TOTAL_FRAMES))
      );

      // Clear frame with physical dimensions
      // Use cream background (#FAF2E1) for the first 10 frames instead of black
      ctx.fillStyle = frameIndex < BLACK_FRAMES ? "#FAF2E1" : "#050505";
      ctx.fillRect(0, 0, physicalWidth, physicalHeight);

      if (frameIndex >= BLACK_FRAMES) {
        let imageIndex = frameIndex - BLACK_FRAMES;
        let img = images[imageIndex];

        // Progressive Preloading Fallback: If current frame isn't ready, scan backwards for the most recently loaded frame
        while (imageIndex >= 0 && (!img || !img.complete)) {
          imageIndex--;
          img = images[imageIndex];
        }

        if (img && img.complete) {
          // Calculate aspect ratios completely mathematically in Physical space
          const hRatio = physicalWidth / img.width;
          const vRatio = physicalHeight / img.height;
          const ratio = Math.max(hRatio, vRatio);

          // Center shift in physical space
          const centerShiftX = Math.floor((physicalWidth - img.width * ratio) / 2);
          const centerShiftY = Math.floor((physicalHeight - img.height * ratio) / 2);

          // Draw flawlessly scaled image
          ctx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height,
            centerShiftX,
            centerShiftY,
            Math.floor(img.width * ratio),
            Math.floor(img.height * ratio)
          );
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [loadedCount, images, scrollYProgress]);

  const MIN_FRAMES_TO_START = 10;
  
  if (loadedCount < MIN_FRAMES_TO_START) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-plum"></div>
        <p className="font-sans mt-4 text-plum font-semibold">Loading sequence {Math.floor((loadedCount / MIN_FRAMES_TO_START) * 100)}%</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-[400vh] h-[400dvh] w-full bg-[#050505]">
      <div className="sticky top-0 h-screen h-[100dvh] w-full overflow-hidden">
        {/* The Image Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />

        {/* Text Overlays */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10 px-6">

          {/* 0% Scroll Text */}
          <motion.div
            style={{ opacity: text1Opacity, y: text1Y }}
            className="absolute flex flex-col items-center text-center gap-6"
          >

            <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight drop-shadow-xl">
              <span className="text-plum">Chess</span><span className="text-berry italic">Parfait</span>
            </h1>
          </motion.div>



          {/* 90% Scroll Text */}
          <motion.div
            style={{ opacity: text4Opacity, y: text4Y }}
            className="absolute flex flex-col items-center text-center"
          >
            <h2 className="font-serif text-4xl md:text-6xl font-bold tracking-tight text-white/90 drop-shadow-2xl leading-tight">
              Refined Accuracy: Start Coaching with Luis Chan.
            </h2>
            <div className="mt-8 pointer-events-auto">
              <a href="#contact" className="px-8 py-4 bg-white/10 border border-white/20 text-white/90 font-bold rounded-xl hover:bg-white/20 transition-all shadow-lg backdrop-blur-sm inline-block">
                Book a Session
              </a>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
