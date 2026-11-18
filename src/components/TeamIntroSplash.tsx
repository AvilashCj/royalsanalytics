import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Play, Activity, FastForward } from 'lucide-react';
import { usePlayerPhotos } from '../utils/playerPhotos';

interface TeamIntroSplashProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const TeamIntroSplash: React.FC<TeamIntroSplashProps> = ({
  isOpen,
  onComplete,
}) => {
  const { teamBannerUrl } = usePlayerPhotos();
  const [phase, setPhase] = useState<'telemetry' | 'showcase' | 'fade'>('telemetry');
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    setPhase('telemetry');
    setProgress(0);

    const startTime = performance.now();
    const totalDuration = 4800; // 4.8 seconds cinematic intro

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
      setProgress(pct);

      if (elapsed >= 1500 && elapsed < 3900) {
        setPhase('showcase');
      } else if (elapsed >= 3900) {
        setPhase('fade');
      }

      if (elapsed >= totalDuration) {
        clearInterval(interval);
        onComplete();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isOpen, onComplete]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="rr-team-intro-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex flex-col justify-between overflow-hidden bg-[#0A0E1A] text-white select-none"
        >
          {/* Layer 1: Full-Screen Cinematic Ken Burns Pan/Zoom of the Rajasthan Royals Team Photo */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.img
              src={teamBannerUrl || '/assets/aistudio/image_4aa7e332.png'}
              alt="Rajasthan Royals Team Squad"
              initial={{ scale: 1.16, y: 12, filter: 'brightness(0.45) saturate(1.15)' }}
              animate={{
                scale: phase === 'telemetry' ? 1.1 : 1.02,
                y: 0,
                filter:
                  phase === 'telemetry'
                    ? 'brightness(0.65) saturate(1.2)'
                    : 'brightness(0.88) saturate(1.25)',
              }}
              transition={{ duration: 4.6, ease: 'easeOut' }}
              className="h-full w-full object-cover object-top"
              referrerPolicy="no-referrer"
            />

            {/* Broadcast Vignette & Royal Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E1A] via-[#0A0E1A]/45 to-[#0A0E1A]/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E1A]/80 via-transparent to-[#0A0E1A]/80" />

            {/* Animated Royal Pink & Gold Broadcast Light Sweeps */}
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: '200%', opacity: [0, 0.55, 0] }}
              transition={{ duration: 3.2, ease: 'easeInOut', repeat: Infinity }}
              className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-[#EA1A85]/25 to-transparent"
            />
          </div>

          {/* Layer 2: Animated Cricket Ball Trajectory Arcs SVG Overlay */}
          <svg
            viewBox="0 0 1440 900"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-75"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="pinkArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#EA1A85" stopOpacity="0" />
                <stop offset="50%" stopColor="#EA1A85" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#D4AF37" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="goldArcGrad" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
                <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* Left-to-Center Trajectory Arc */}
            <motion.path
              d="M -60 780 Q 420 220 720 420"
              fill="none"
              stroke="url(#pinkArcGrad)"
              strokeWidth="3.5"
              strokeDasharray="12 6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 1, 0.4] }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
            />

            {/* Right-to-Center Trajectory Arc */}
            <motion.path
              d="M 1500 760 Q 1020 200 720 420"
              fill="none"
              stroke="url(#goldArcGrad)"
              strokeWidth="3.5"
              strokeDasharray="12 6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 1, 0.4] }}
              transition={{ duration: 2.2, delay: 0.2, ease: 'easeOut' }}
            />

            {/* High Lofted Six Arc */}
            <motion.path
              d="M 180 860 Q 720 -80 1260 860"
              fill="none"
              stroke="url(#pinkArcGrad)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.75, 0.25] }}
              transition={{ duration: 2.8, delay: 0.15, ease: 'easeInOut' }}
            />
          </svg>

          {/* Top Broadcast Header Strip */}
          <div className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D4AF37]/60 bg-[#EA1A85] p-1 shadow-lg shadow-[#EA1A85]/40">
                <img
                  src="/assets/aistudio/image_d9367e45.png"
                  alt="Rajasthan Royals"
                  className="h-full w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#EA1A85] animate-ping" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#D4AF37]">
                    Rajasthan Royals Official Broadcast Feed
                  </span>
                </div>
                <p className="font-condensed text-lg font-extrabold uppercase tracking-wider text-white">
                  SupeRR Selector · Season 2 Round 1
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="hidden sm:flex items-center gap-2 rounded-full border border-white/15 bg-[#0A0E1A]/70 backdrop-blur-md px-4 py-1.5"
            >
              <Crown className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-pink-200">
                Executive Owner&apos;s War Room
              </span>
            </motion.div>
          </div>

          {/* Center / Lower-Third Framed Squad Showcase & Broadcast Title */}
          <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-col items-center justify-end px-6 pb-4 text-center md:pb-8">
            {/* Framed Team Squad Window so the entire squad photo is crystal clear */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.75, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-6 w-full max-w-4xl overflow-hidden rounded-3xl border-2 border-[#D4AF37]/70 bg-[#131A2E]/90 shadow-[0_0_70px_rgba(234,26,133,0.45)]"
            >
              {/* Top Royal Gold & Pink Ribbon */}
              <div className="flex items-center justify-between border-b border-white/15 bg-gradient-to-r from-[#0A0E1A] via-[#EA1A85]/40 to-[#0A0E1A] px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-[#D4AF37]" />
                  <span className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-[#D4AF37]">
                    Rajasthan Royals · Royal Palace Squad Showcase
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-pink-200">
                  Halla Bol · Pressure Intelligence
                </span>
              </div>

              {/* Crisp Uncropped Squad Photo Frame */}
              <div className="relative aspect-[16/9] max-h-[44vh] w-full overflow-hidden bg-[#0A0E1A]">
                <motion.img
                  src={teamBannerUrl || '/assets/aistudio/image_4aa7e332.png'}
                  alt="Rajasthan Royals Squad"
                  initial={{ scale: 1.08 }}
                  animate={{ scale: 1.0 }}
                  transition={{ duration: 4.5, ease: 'easeOut' }}
                  className="h-full w-full object-cover object-center"
                  referrerPolicy="no-referrer"
                />
                {/* Shimmer Sweep over the Squad Photo */}
                <motion.div
                  initial={{ x: '-120%' }}
                  animate={{ x: '220%' }}
                  transition={{ duration: 2.6, delay: 0.8, ease: 'easeInOut' }}
                  className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0A0E1A] via-[#0A0E1A]/60 to-transparent" />

                {/* Floating Royal Badge inside Squad Frame */}
                <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 rounded-xl border border-[#EA1A85]/60 bg-[#0A0E1A]/85 backdrop-blur-md px-3.5 py-1.5">
                    <img
                      src="/assets/aistudio/image_d9367e45.png"
                      alt="RR Crest"
                      className="h-6 w-6 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <span className="font-condensed text-sm font-extrabold uppercase tracking-wider text-white">
                      Rajasthan Royals Franchise Analytics
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#0A0E1A]/85 backdrop-blur-md px-3 py-1.5 font-mono text-[11px] font-bold text-[#D4AF37]">
                    <Activity className="h-3.5 w-3.5 text-[#EA1A85]" />
                    <span>200,999 Deliveries · 883 Matches</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Broadcast Title & Telemetry Status */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-[11px] font-semibold tracking-wider text-pink-200 mb-2">
                <Play className="h-3 w-3 fill-[#EA1A85] text-[#EA1A85]" />
                <span>
                  {phase === 'telemetry'
                    ? 'Initializing ball-by-ball engine and calibrating pressure context...'
                    : 'SupeRR Selector · Franchise Pressure Intelligence Platform'}
                </span>
              </div>

              <h1 className="font-condensed text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
                SupeRR <span className="text-[#EA1A85]">Selector</span>{' '}
                <span className="text-[#D4AF37]">·</span> Pressure Intelligence
              </h1>
            </motion.div>
          </div>

          {/* Bottom Telemetry Progress Bar & Skip Intro Button */}
          <div className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 bg-[#0A0E1A]/90 backdrop-blur-md px-6 py-4 md:px-12">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-full sm:w-64 h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#EA1A85] to-[#D4AF37]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="font-mono text-xs font-bold text-[#D4AF37] shrink-0">
                {progress}%
              </span>
            </div>

            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center gap-2 rounded-xl border border-[#EA1A85]/60 bg-[#EA1A85] px-5 py-2 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-[#EA1A85]/30 hover:bg-[#d41577] transition-all cursor-pointer shrink-0"
            >
              <span>Enter War Room</span>
              <FastForward className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
