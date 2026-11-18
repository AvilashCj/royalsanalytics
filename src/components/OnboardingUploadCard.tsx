import React, { useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, ShieldAlert, Play, Users, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import { IngestionHealth } from '../types/cricket';
import { usePlayerPhotos } from '../utils/playerPhotos';

interface OnboardingUploadCardProps {
  health: IngestionHealth;
  onFilesSelected: (files: FileList) => void;
  onReplayIntro?: () => void;
  onOpenPhotoManager?: () => void;
}

export const OnboardingUploadCard: React.FC<OnboardingUploadCardProps> = ({
  health,
  onFilesSelected,
  onReplayIntro,
  onOpenPhotoManager,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { teamBannerUrl } = usePlayerPhotos();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const requiredFiles = [
    {
      name: 'ball_by_ball.csv',
      desc: '200,999 Deliveries, runs, dismissals, & extras',
      loaded: health.ballByBallLoaded,
      count: health.ballByBallCount,
    },
    {
      name: 'matches.csv',
      desc: '883 Matches, targets, revised overs, & stages',
      loaded: health.matchesLoaded,
      count: health.matchesCount,
    },
    {
      name: 'competitions.csv',
      desc: 'IPL & T20I tournament metadata',
      loaded: health.competitionsLoaded,
      count: health.competitionsCount,
    },
    {
      name: 'playing_eleven.csv',
      desc: 'Lineups, batting order, & playing XIs',
      loaded: health.playingElevenLoaded,
      count: health.playingElevenCount,
    },
    {
      name: 'teams.csv',
      desc: 'Franchise & international team mappings',
      loaded: health.teamsLoaded,
      count: health.teamsCount,
    },
    {
      name: 'competition_team_player_mapping.csv',
      desc: 'Player IDs, verified names, & skill roles',
      loaded: health.playerMappingLoaded,
      count: health.playerMappingCount,
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full overflow-hidden rounded-3xl border border-pink-200 bg-white shadow-xl shadow-pink-100/80 flex flex-col items-center text-center"
      >
        {/* Starting Screen Rajasthan Royals Team Squad Hero Banner */}
        <div className="relative w-full overflow-hidden bg-[#0A0E1A]">
          <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden">
            <motion.img
              src={teamBannerUrl || '/assets/aistudio/image_4aa7e332.png'}
              alt="Rajasthan Royals Official Squad"
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="h-full w-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A0E1A] via-[#0A0E1A]/35 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0A0E1A]/60 via-transparent to-[#0A0E1A]/60" />

            {/* Top Action Strip on Team Banner */}
            <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/60 bg-[#0A0E1A]/80 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#D4AF37]">
                <Crown className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>Rajasthan Royals · Official Team Showcase</span>
              </div>

              <div className="flex items-center gap-2">
                {onReplayIntro && (
                  <button
                    type="button"
                    onClick={onReplayIntro}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#EA1A85]/60 bg-[#EA1A85] px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-[#d41577] transition-colors cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-white" />
                    <span>Play Team Intro</span>
                  </button>
                )}
                {onOpenPhotoManager && (
                  <button
                    type="button"
                    onClick={onOpenPhotoManager}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-[#0A0E1A]/80 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <Users className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>Team &amp; Player Photos</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Overlay Title inside the Team Photo Hero */}
            <div className="absolute bottom-5 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-left z-10">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-[#D4AF37] bg-[#EA1A85] p-2 shadow-lg">
                  <img
                    src="/assets/aistudio/image_d9367e45.png"
                    alt="Rajasthan Royals"
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#D4AF37]">
                    <span>SupeRR Selector Season 2</span>
                    <span>·</span>
                    <span>Round 1 Challenge</span>
                  </div>
                  <h1 className="font-condensed text-2xl sm:text-4xl font-black uppercase tracking-tight text-white mt-0.5 drop-shadow">
                    Rajasthan Royals Pressure Intelligence War Room
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full p-8 md:p-10 flex flex-col items-center text-center">
          <h2 className="font-condensed text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900">
            Upload Your 6 Competition CSV Files to Begin
          </h2>

          <p className="mt-2.5 text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">
            To run the live pressure intelligence platform and identify the most reliable players under crunch situations, drop all 6 official challenge datasets simultaneously into the dropzone below.
          </p>

        {/* Dropzone Area */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="mt-8 w-full group relative cursor-pointer rounded-2xl border-2 border-dashed border-pink-300 bg-pink-50/40 p-8 md:p-10 text-center transition-colors hover:border-[#EA1A85] hover:bg-pink-50"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
          />

          <div className="flex flex-col items-center justify-center gap-3">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EA1A85] text-white shadow-md shadow-pink-300 group-hover:scale-105 transition-transform"
            >
              <Upload className="h-7 w-7" />
            </motion.div>

            <div>
              <p className="text-lg font-bold text-slate-900">
                Drop all 6 challenge CSV files here, or click to browse
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Accepts <code className="font-mono text-[#EA1A85]">ball_by_ball.csv</code>, <code className="font-mono text-slate-800">matches.csv</code>, <code className="font-mono text-slate-800">competitions.csv</code>, <code className="font-mono text-slate-800">playing_eleven.csv</code>, <code className="font-mono text-slate-800">teams.csv</code>, and <code className="font-mono text-slate-800">competition_team_player_mapping.csv</code>.
              </p>
            </div>

            {health.isProcessing && (
              <div className="w-full max-w-md mt-4">
                <div className="flex justify-between text-xs font-mono text-slate-600 mb-1">
                  <span>Streaming Ingestion via Web Worker...</span>
                  <span className="font-bold text-[#EA1A85]">{health.progressPercent}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-pink-100 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${health.progressPercent}%` }}
                    transition={{ duration: 0.25 }}
                    className="h-full bg-[#EA1A85]"
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* 6 Required CSV Files Checklist Grid */}
        <div className="mt-8 w-full">
          <div className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Required Relational Tables
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
            {requiredFiles.map((rf, idx) => (
              <motion.div
                key={rf.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 + idx * 0.06 }}
                whileHover={{ y: -2 }}
                className={`p-3.5 rounded-xl border transition-all ${
                  rf.loaded
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-pink-100 bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className={`h-4 w-4 ${rf.loaded ? 'text-emerald-600' : 'text-[#EA1A85]'}`} />
                    <span className="font-mono text-xs font-bold text-slate-900 truncate max-w-[180px]">
                      {rf.name}
                    </span>
                  </div>
                  {rf.loaded ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">Waiting</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">{rf.desc}</p>
                {rf.loaded && (
                  <span className="text-[10px] font-mono font-bold text-emerald-700 mt-1.5 block">
                    ✓ {rf.count.toLocaleString()} rows ingested
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Live Zero-Lag Guarantee */}
        <div className="mt-8 flex items-center gap-2 text-xs text-slate-500 bg-pink-50/60 px-4 py-2 rounded-xl border border-pink-100">
          <ShieldAlert className="h-4 w-4 text-[#EA1A85] shrink-0" />
          <span>
            Datasets are cached client-side in browser IndexedDB. Zero UI freeze and zero data loss on page refresh.
          </span>
        </div>
        </div>
      </motion.div>
    </div>
  );
};
