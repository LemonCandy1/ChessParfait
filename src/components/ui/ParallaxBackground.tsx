import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export default function ParallaxBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { scrollY } = useScroll();

  // Smooth scroll
  const smoothScrollY = useSpring(scrollY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates from -1 to 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const pieces = [
    { symbol: '♘', top: '5%', left: '2%', size: 'text-[16rem]', depth: 30, scrollSpeed: 0.15, rotate: -15 },
    { symbol: '♛', top: '3%', right: '12%', size: 'text-[18rem]', depth: 45, scrollSpeed: 0.1, rotate: 15 },
    { symbol: '♚', top: '15%', right: '2%', size: 'text-[24rem]', depth: -40, scrollSpeed: -0.1, rotate: 10 },
    { symbol: '♜', top: '25%', left: '8%', size: 'text-[20rem]', depth: 50, scrollSpeed: 0.2, rotate: -5 },
    { symbol: '♛', top: '38%', right: '12%', size: 'text-[22rem]', depth: 25, scrollSpeed: -0.15, rotate: 25 },
    { symbol: '♝', top: '50%', left: '20%', size: 'text-[18rem]', depth: -35, scrollSpeed: 0.25, rotate: -20 },
    { symbol: '♙', top: '65%', right: '8%', size: 'text-[14rem]', depth: 20, scrollSpeed: -0.05, rotate: 15 },
    { symbol: '♘', top: '78%', left: '12%', size: 'text-[20rem]', depth: 40, scrollSpeed: 0.1, rotate: 20 },
    { symbol: '♚', top: '90%', right: '18%', size: 'text-[26rem]', depth: -50, scrollSpeed: -0.2, rotate: -10 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Subtle Chess Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_50%,#000_80%,transparent_110%)]"></div>

      {pieces.map((piece, i) => {
        // Vertical parallax offset based on scroll
        const yOffset = useTransform(smoothScrollY, v => v * piece.scrollSpeed);
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: piece.top,
              left: piece.left,
              right: piece.right,
              y: yOffset,
            }}
          >
            <motion.div
              className={`font-serif text-plum/5 blur-[2px] select-none leading-none ${piece.size}`}
              style={{ rotate: piece.rotate }}
              animate={{
                x: mousePosition.x * piece.depth,
                y: mousePosition.y * piece.depth,
              }}
              transition={{ type: "spring", stiffness: 35, damping: 15, mass: 1.5 }}
            >
              {piece.symbol}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
