import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Users,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BatterRating, BowlerRating } from '../types/cricket';
import {
  usePlayerPhotos,
  KNOWN_CRICKET_STARS,
  DEFAULT_TEAM_BANNER,
} from '../utils/playerPhotos';
import { PlayerAvatar } from './PlayerAvatar';

interface PlayerPhotoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allBatters: BatterRating[];
  allBowlers: BowlerRating[];
}

export const PlayerPhotoManagerModal: React.FC<PlayerPhotoManagerModalProps> = ({
  isOpen,
  onClose,
  allBatters,
  allBowlers,
}) => {
  const {
    photoEntries,
    teamBannerUrl,
    getPlayerPhoto,
    uploadPlayerFiles,
    assignPhotoToPlayer,
    removePhotoEntry,
    uploadTeamBanner,
    resetTeamBanner,
    clearAllPhotos,
  } = usePlayerPhotos();

  const playerFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [recentUploadCount, setRecentUploadCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Build master list of player names from loaded dataset + known cricket stars
  const dynamicNames = Array.from(
    new Set([
      ...allBatters.map((b) => b.name),
      ...allBowlers.map((bw) => bw.name),
    ])
  );

  const allSelectablePlayers = Array.from(
    new Set([...dynamicNames, ...KNOWN_CRICKET_STARS])
  ).sort((a, b) => a.localeCompare(b));

  const top10Batters = allBatters
    .filter((b) => b.unstopRank <= 10)
    .sort((a, b) => a.unstopRank - b.unstopRank);

  const top10Bowlers = allBowlers
    .filter((bw) => bw.unstopRank <= 10)
    .sort((a, b) => a.unstopRank - b.unstopRank);

  const handleDropPlayerPhotos = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const count = await uploadPlayerFiles(e.dataTransfer.files, dynamicNames);
      setRecentUploadCount(count);
      setTimeout(() => setRecentUploadCount(null), 3500);
    }
  };

  const handleSelectPlayerFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const count = await uploadPlayerFiles(e.target.files, dynamicNames);
      setRecentUploadCount(count);
      setTimeout(() => setRecentUploadCount(null), 3500);
      e.target.value = '';
    }
  };

  const handleSelectBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadTeamBanner(e.target.files[0]);
      e.target.value = '';
    }
  };

  const filteredEntries = photoEntries.filter(
    (entry) =>
      entry.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-5xl rounded-3xl border border-pink-200 bg-white p-6 md:p-8 shadow-2xl my-8 max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-pink-100 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EA1A85] to-[#9D174D] text-white shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EA1A85]">
                <span>Executive Broadcast Studio</span>
                <span>·</span>
                <span>IndexedDB Persistent Storage</span>
              </div>
              <h2 className="font-condensed text-2xl md:text-3xl font-extrabold uppercase text-slate-900">
                Bulk Player &amp; Team Photo Manager
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {photoEntries.length > 0 && (
              <button
                type="button"
                onClick={clearAllPhotos}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All ({photoEntries.length})
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-pink-100 p-2 text-slate-400 hover:bg-pink-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 py-5 flex flex-col gap-6">
          {/* Grid Row 1: Bulk Player Dropzone + Rajasthan Royals Squad Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Bulk Player Headshot Drag & Drop (7 cols) */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropPlayerPhotos}
              onClick={() => playerFileInputRef.current?.click()}
              className="lg:col-span-7 group relative cursor-pointer rounded-2xl border-2 border-dashed border-pink-300 bg-gradient-to-b from-pink-50/60 to-white p-6 flex flex-col items-center justify-center text-center transition-all hover:border-[#EA1A85] hover:bg-pink-50/80"
            >
              <input
                ref={playerFileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
                className="hidden"
                onChange={handleSelectPlayerFiles}
              />

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EA1A85] text-white shadow-md shadow-pink-300/60 group-hover:scale-105 transition-transform mb-3">
                <Upload className="h-6 w-6" />
              </div>

              <h3 className="font-condensed text-xl font-extrabold uppercase text-slate-900">
                Drag &amp; Drop Multiple Player Headshots
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-md leading-relaxed">
                Drop any number of <code className="font-mono text-[#EA1A85] font-bold">PNG / JPG / WEBP</code> portraits at once. Filenames like{' '}
                <code className="font-mono text-slate-800">suryakumar_yadav.png</code> or{' '}
                <code className="font-mono text-slate-800">Jos Buttler.jpg</code> map automatically to the right player.
              </p>

              <AnimatePresence>
                {recentUploadCount !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Mapped &amp; saved {recentUploadCount} player portrait{recentUploadCount === 1 ? '' : 's'} to IndexedDB!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Rajasthan Royals Team Squad Banner Card (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-pink-200 bg-slate-900 overflow-hidden relative flex flex-col justify-between min-h-[210px] shadow-md">
              <img
                src={teamBannerUrl}
                alt="Rajasthan Royals Squad Banner"
                className="absolute inset-0 w-full h-full object-cover object-center opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />

              <div className="relative z-10 p-4 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D4AF37] bg-slate-950/75 px-2.5 py-1 rounded-lg border border-[#D4AF37]/40">
                  Rajasthan Royals Squad Backdrop
                </span>
                {teamBannerUrl !== DEFAULT_TEAM_BANNER && (
                  <button
                    type="button"
                    onClick={resetTeamBanner}
                    title="Restore Royal Palace Squad Banner"
                    className="flex items-center gap-1 rounded-lg bg-slate-900/80 border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3 text-[#EA1A85]" />
                    Default
                  </button>
                )}
              </div>

              <div className="relative z-10 p-4 pt-8 flex items-end justify-between gap-3">
                <div>
                  <h4 className="font-condensed text-xl font-extrabold uppercase text-white leading-tight">
                    Royal Palace Squad Banner
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Featured across the Executive Podium &amp; Player X-Ray scouting header.
                  </p>
                </div>

                <input
                  ref={bannerFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleSelectBannerFile}
                />
                <button
                  type="button"
                  onClick={() => bannerFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl bg-[#EA1A85] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#D81478] transition-colors whitespace-nowrap cursor-pointer shrink-0"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Change Banner
                </button>
              </div>
            </div>
          </div>

          {/* Quick Top 10 Qualifiers Portrait Status Strip */}
          {(top10Batters.length > 0 || top10Bowlers.length > 0) && (
            <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#EA1A85]" />
                  <span className="text-xs font-semibold text-slate-800">
                    Top Qualifiers Broadcast Portrait Preview
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  Players without photos automatically render Royal Pink &amp; Gold Monograms
                </span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {[...top10Batters.slice(0, 5), ...top10Bowlers.slice(0, 5)].map((p) => {
                  const hasPhoto = Boolean(getPlayerPhoto(p.name));
                  return (
                    <div
                      key={`${p.playerId}-${p.name}`}
                      className="flex items-center gap-2.5 rounded-xl border border-pink-200/80 bg-white px-3 py-2 shrink-0 shadow-2xs"
                    >
                      <PlayerAvatar name={p.name} rank={p.unstopRank} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight whitespace-nowrap">
                          #{p.unstopRank} {p.name}
                        </p>
                        <span
                          className={`text-[10px] font-mono font-semibold ${
                            hasPhoto ? 'text-emerald-600' : 'text-[#EA1A85]'
                          }`}
                        >
                          {hasPhoto ? '✓ Custom Portrait' : 'RR Monogram Badge'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Uploaded Player Portraits Management Grid */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-condensed text-xl font-bold uppercase text-slate-900">
                  Uploaded Player Portraits ({photoEntries.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Verify automatic filename matching or reassign any portrait to a specific player via the dropdown.
                </p>
              </div>

              {photoEntries.length > 0 && (
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter uploaded photos..."
                    className="rounded-xl border border-pink-200 bg-pink-50/40 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#EA1A85] focus:outline-none w-56"
                  />
                </div>
              )}
            </div>

            {photoEntries.length === 0 ? (
              <div className="rounded-2xl border border-pink-100 bg-slate-50/70 p-8 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  No custom player portraits uploaded yet
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Drop player headshots above to replace the default Royal Pink &amp; Gold broadcast monograms with real player cutout photos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-pink-200 bg-white p-3.5 shadow-2xs flex items-center gap-3.5 justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-[#EA1A85] shrink-0 bg-slate-900">
                        <img
                          src={entry.dataUrl}
                          alt={entry.playerName}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <label className="block text-[10px] font-mono uppercase text-slate-400 truncate">
                          File: {entry.fileName}
                        </label>
                        <select
                          value={
                            allSelectablePlayers.includes(entry.playerName)
                              ? entry.playerName
                              : '__custom__'
                          }
                          onChange={(e) => {
                            if (e.target.value !== '__custom__') {
                              assignPhotoToPlayer(entry.id, e.target.value);
                            }
                          }}
                          className="mt-1 w-full rounded-lg border border-pink-200 bg-pink-50/50 px-2 py-1 text-xs font-bold text-slate-900 focus:border-[#EA1A85] focus:outline-none cursor-pointer"
                        >
                          {!allSelectablePlayers.includes(entry.playerName) && (
                            <option value="__custom__">{entry.playerName}</option>
                          )}
                          {allSelectablePlayers.map((pName) => (
                            <option key={pName} value={pName}>
                              {pName}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={entry.playerName}
                          onChange={(e) => assignPhotoToPlayer(entry.id, e.target.value)}
                          placeholder="Or type exact player name..."
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 focus:border-[#EA1A85] focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removePhotoEntry(entry.id)}
                      title="Remove portrait"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-pink-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            All uploaded portraits &amp; squad banners persist locally in IndexedDB across browser sessions.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#EA1A85] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#D81478] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
