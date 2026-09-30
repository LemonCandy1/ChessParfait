import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import './TrueFocus.css';

export interface TrueFocusProps {
  sentence?: string;
  separator?: string;
  manualMode?: boolean;
  blurAmount?: number;
  borderColor?: string;
  glowColor?: string;
  animationDuration?: number;
  pauseBetweenAnimations?: number;
  className?: string;
  wordClassName?: string;
  activeWordClassName?: string;
  wordClassNames?: string[];
  getWordClassName?: (word: string, index: number) => string;
}

interface FocusRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const TrueFocus: React.FC<TrueFocusProps> = ({
  sentence = 'True Focus',
  separator = ' ',
  manualMode = false,
  blurAmount = 5,
  borderColor = '#D23157',
  glowColor,
  animationDuration = 1,
  pauseBetweenAnimations = 0.5,
  className = '',
  wordClassName = '',
  activeWordClassName = '',
  wordClassNames,
  getWordClassName
}) => {
  const words = sentence.split(separator);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [lastActiveIndex, setLastActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [focusRect, setFocusRect] = useState<FocusRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });

  const resolvedGlowColor =
    glowColor ||
    (borderColor === 'red' || borderColor === '#D23157'
      ? 'rgba(210, 49, 87, 0.6)'
      : borderColor === 'green'
      ? 'rgba(34, 197, 94, 0.6)'
      : borderColor.startsWith('#')
      ? `${borderColor}99`
      : 'rgba(210, 49, 87, 0.6)');

  // Cycle automatically if not in manualMode
  useEffect(() => {
    if (!manualMode && words.length > 0) {
      const interval = setInterval(
        () => {
          setCurrentIndex(prev => (prev + 1) % words.length);
        },
        (animationDuration + pauseBetweenAnimations) * 1000
      );

      return () => clearInterval(interval);
    }
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length]);

  // Update target focus frame coordinates
  const updateFocusRect = useCallback(() => {
    if (currentIndex === null || currentIndex === -1) return;
    const activeEl = wordRefs.current[currentIndex];
    const containerEl = containerRef.current;

    if (!activeEl || !containerEl) return;

    const parentRect = containerEl.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();

    setFocusRect({
      x: activeRect.left - parentRect.left,
      y: activeRect.top - parentRect.top,
      width: activeRect.width,
      height: activeRect.height
    });
  }, [currentIndex]);

  useEffect(() => {
    updateFocusRect();

    // Listen to resize and fonts ready to ensure pixel-perfect alignment
    window.addEventListener('resize', updateFocusRect);
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(updateFocusRect);
    }

    return () => {
      window.removeEventListener('resize', updateFocusRect);
    };
  }, [updateFocusRect]);

  const handleMouseEnter = (index: number) => {
    if (manualMode) {
      setLastActiveIndex(index);
      setCurrentIndex(index);
    }
  };

  const handleMouseLeave = () => {
    if (manualMode) {
      setCurrentIndex(lastActiveIndex ?? 0);
    }
  };

  return (
    <div
      className={`focus-container ${className}`}
      ref={containerRef}
      style={{ outline: 'none', userSelect: 'none' }}
    >
      {words.map((word, index) => {
        const isActive = index === currentIndex;
        const specificWordClass = wordClassNames
          ? wordClassNames[index] || ''
          : getWordClassName
          ? getWordClassName(word, index)
          : '';

        return (
          <span
            key={index}
            ref={el => {
              wordRefs.current[index] = el;
            }}
            className={`focus-word ${wordClassName} ${specificWordClass} ${
              isActive ? `active ${activeWordClassName}` : ''
            }`}
            style={
              {
                filter: isActive ? 'blur(0px)' : `blur(${blurAmount}px)`,
                transition: `filter ${Math.min(animationDuration * 0.35, 0.3)}s ease`,
                '--border-color': borderColor,
                '--glow-color': resolvedGlowColor
              } as React.CSSProperties
            }
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            {word}
          </span>
        );
      })}

      <motion.div
        className="focus-frame"
        initial={false}
        animate={{
          x: focusRect.x,
          y: focusRect.y,
          width: focusRect.width,
          height: focusRect.height,
          opacity: currentIndex >= 0 && focusRect.width > 0 ? 1 : 0
        }}
        transition={{
          type: 'spring',
          stiffness: 220,
          damping: 22,
          mass: 0.6
        }}
        style={
          {
            '--border-color': borderColor,
            '--glow-color': resolvedGlowColor
          } as React.CSSProperties
        }
      >
        <span className="corner top-left"></span>
        <span className="corner top-right"></span>
        <span className="corner bottom-left"></span>
        <span className="corner bottom-right"></span>
      </motion.div>
    </div>
  );
};

export default TrueFocus;
