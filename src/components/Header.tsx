import React from 'react';
import { RotateCcw, Users, Play, Compass, Square, Upload } from 'lucide-react';
import { usePlayerPhotos } from '../utils/playerPhotos';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLoadDemo: () => void;
  onClearCache: () => void;
  onOpenPhotoManager: () => void;
  onOpenPhotoAnimator?: () => void;
  onReplayIntro: () => void;
  isProcessing: boolean;
  totalDeliveries: number;
  isPitchTourActive?: boolean;
  onTogglePitchTour?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onClearCache,
  onOpenPhotoManager,
  onReplayIntro,
  isProcessing,
  totalDeliveries,
  isPitchTourActive = false,
  onTogglePitchTour,
}) => {
  const { photoEntries } = usePlayerPhotos();

  const tabs = [
    { id: 'validation', label: 'Validation' },
    { id: 'retention', label: 'RR Retention' },
    { id: 'auction', label: 'Auction Targets' },
    { id: 'batters', label: 'Batters' },
    { id: 'bowlers', label: 'Bowlers' },
    { id: 'xray', label: 'Player X-Ray' },
    { id: 'superover', label: 'Super Over' },
    { id: 'methodology', label: 'Report' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 lg:px-6">
        {/* Zone 1: Wordmark with official Rajasthan Royals logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden border border-slate-200 bg-[#EA1A85] shadow-2xs">
            <img
              src="/assets/aistudio/image_d9367e45.png"
              alt="Rajasthan Royals"
              className="h-full w-full object-contain p-0.5"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex flex-col">
            <span className="font-condensed text-xl font-extrabold tracking-tight text-slate-900 leading-none whitespace-nowrap">
              SupeRR <span className="text-[#EA1A85]">Selector</span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
              Franchise Pressure Intelligence
            </span>
          </div>
        </div>

        {/* Zone 2: Centered Primary Tabs */}
        <nav className="hidden md:flex items-center justify-center gap-3 lg:gap-4 text-[13px] font-medium text-slate-600">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`transition-colors whitespace-nowrap cursor-pointer py-1 border-b-2 ${
                  isActive
                    ? 'text-[#EA1A85] border-[#EA1A85] font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Compact Utility Cluster (Tour, Intro, Photos, Reset) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {totalDeliveries === 0 ? (
            <button
              type="button"
              onClick={() => onTabChange('validation')}
              disabled={isProcessing}
              className="flex items-center gap-1.5 rounded-lg bg-[#EA1A85] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#D81478] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload CSVs</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-50/80 p-1">
              {onTogglePitchTour && (
                <button
                  type="button"
                  onClick={onTogglePitchTour}
                  title="War-Room Tour: Auto-advance walkthrough across all modules"
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    isPitchTourActive
                      ? 'bg-[#EA1A85] text-white shadow-2xs'
                      : 'text-slate-700 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  {isPitchTourActive ? (
                    <>
                      <Square className="h-3 w-3 fill-current" />
                      <span>Stop Tour</span>
                    </>
                  ) : (
                    <>
                      <Compass className="h-3.5 w-3.5 text-[#EA1A85]" />
                      <span>Tour</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={onReplayIntro}
                title="Replay Rajasthan Royals Team Intro"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="h-3 w-3 fill-[#EA1A85] text-[#EA1A85]" />
                <span>Intro</span>
              </button>

              <button
                type="button"
                onClick={onOpenPhotoManager}
                title="Manage player headshots and squad banner"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Users className="h-3.5 w-3.5 text-slate-500" />
                <span>Photos</span>
                {photoEntries.length > 0 && (
                  <span className="font-mono text-[10px] font-bold text-[#EA1A85]">
                    {photoEntries.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onClearCache}
                title="Reset dataset cache and return to file upload"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="h-3 w-3 text-slate-500" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
