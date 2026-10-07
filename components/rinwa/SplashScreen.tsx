"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";


export function SplashScreen() {
  const [showSplash, setShowSplash] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const doorEase = [0.4, 0, 0.2, 1] as const;
  const textEase = [0.25, 0.46, 0.45, 0.94] as const;

  useEffect(() => {
    // Check if we've already shown the splash in this session
    const hasShownSplash = sessionStorage.getItem("rinwa-splash-shown");

    if (!hasShownSplash) {
      setShowSplash(true);
    //   sessionStorage.setItem("rinwa-splash-shown", "true");

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setIsAnimatingOut(true);
        // Allow animation to complete before hiding
        setTimeout(() => {
          setShowSplash(false);
        }, 1000);
      }, 3000);

      return () => clearTimeout(timer);
    }

    // DEBUG: Uncomment the line below to always show splash screen for testing
    // setShowSplash(true);
  }, []);

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 1000);
  };

  // Door animation variants
  const doorVariants = {
    initial: { width: "50%" },
    animate: { width: "50%" },
    exit: {
      width: 0,
      transition: { duration: 1, ease: doorEase },
    },
  };

  const textVariants = {
    initial: shouldReduceMotion
      ? { opacity: 1 }
      : { opacity: 0, y: 24, scale: 0.98 },
    animate: shouldReduceMotion
      ? { opacity: 1 }
      : {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.95,
            ease: textEase,
            delay: 0.3,
          },
        },
    exit: {
      opacity: 0,
      y: -12,
      scale: 0.98,
      transition: { duration: 0.8, ease: doorEase },
    },
  };

  return (
    <AnimatePresence mode="wait">
      {showSplash && (
        <motion.div
          initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: doorEase }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          onClick={handleDismiss}
          role="presentation"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-page/50" />

          {/* Left door */}
          <motion.div
            variants={doorVariants}
            initial="initial"
            animate={isAnimatingOut ? "exit" : "animate"}
            className="absolute inset-y-0 left-0 bg-page"
            style={{ originX: 0 }}
          />

          {/* Right door */}
          <motion.div
            variants={doorVariants}
            initial="initial"
            animate={isAnimatingOut ? "exit" : "animate"}
            className="absolute inset-y-0 right-0 bg-page"
            style={{ originX: 1 }}
          />

          {/* Content - positioned above doors */}
          <div className="relative z-10 flex items-center justify-center px-8 text-center">
            <motion.div
              variants={textVariants}
              initial="initial"
              animate={isAnimatingOut ? "exit" : "animate"}
              className="relative flex h-[min(72vw,24rem)] w-[min(72vw,24rem)] items-center justify-center md:h-[min(58vw,30rem)] md:w-[min(58vw,30rem)]"
            >
                <Image
                  src="/images/logo.png"
                  alt="RÌNWÁ logo"
                  fill
                  priority
                  sizes="(max-width: 768px) 72vw, 30rem"
                  className="theme-logo object-contain"
                />
              </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}