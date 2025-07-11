import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TITLE = 'EduSync';
const SUBTITLE = 'by Shan';
const BG_COLOR = 'bg-[#0e0e0e]';
const STAR_COUNT = 18;

// Generate random star positions and animation delays
const generateStars = () => {
  return Array.from({ length: STAR_COUNT }).map(() => ({
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: 1.5 + Math.random() * 2.5,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 3,
    blur: Math.random() > 0.5 ? 'blur-sm' : 'blur',
    opacity: 0.3 + Math.random() * 0.4,
  }));
};

export const IntroSplash: React.FC<{ onFinish?: () => void }> = ({ onFinish }) => {
  const [show, setShow] = useState(false);
  const [stars] = useState(generateStars());

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => {
      setShow(false);
      if (onFinish) onFinish();
    }, 4000); // Increased from 3000ms to 4000ms
    return () => clearTimeout(timer);
  }, [onFinish]);

  // Letter animation variants
  const letterVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { delay: 0.15 + i * 0.08, duration: 0.38 },
    }),
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`fixed inset-0 z-50 flex items-center justify-center ${BG_COLOR}`}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7 } }}
          style={{ minHeight: '100dvh' }}
        >
          {/* Star background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {stars.map((star, i) => (
              <motion.div
                key={i}
                className={`absolute rounded-full ${star.blur}`}
                style={{
                  top: `${star.top}%`,
                  left: `${star.left}%`,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  background: 'white',
                  opacity: star.opacity,
                }}
                animate={{
                  y: [0, -8, 0],
                  x: [0, 6 * (Math.random() - 0.5), 0],
                  opacity: [star.opacity, star.opacity * 0.7, star.opacity],
                }}
                transition={{
                  repeat: Infinity,
                  repeatType: 'mirror',
                  duration: star.duration,
                  delay: star.delay,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="relative flex flex-col items-center justify-center w-full">
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-100 mb-2"
              style={{ letterSpacing: '0.04em' }}
              initial="hidden"
              animate="visible"
            >
              {TITLE.split('').map((char, i) => (
                <motion.span
                  key={i}
                  custom={i}
                  variants={letterVariants}
                  initial="hidden"
                  animate="visible"
                  className="inline-block"
                >
                  {char === ' ' ? '\u00A0' : char}
                </motion.span>
              ))}
            </motion.h1>
            <motion.div
              className="text-lg sm:text-xl font-semibold text-emerald-200 mt-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.7, ease: 'easeOut' }}
            >
              {SUBTITLE}
            </motion.div>

            {/* Loading bar */}
            <div className="w-40 sm:w-56 h-1 mt-8 bg-gray-800 bg-opacity-30 rounded overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 3.7, ease: 'linear' }}
                className="h-full bg-emerald-400"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
