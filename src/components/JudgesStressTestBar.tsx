import React from 'react';
import { ShieldCheck, Flame, TrendingUp, Trophy, Zap } from 'lucide-react';
import { PressureModelConfig, StressTestPreset } from '../types/cricket';

interface JudgesStressTestBarProps {
  config: PressureModelConfig;
  onChangeConfig: (newConfig: PressureModelConfig) => void;
  recalcTimeMs?: number;
}

const PRESETS: {
  id: StressTestPreset;
  label: string;
  subtitle: string;
  competitionFilter: 'ALL' | 'IPL' | 'T20I';
  seasonMin: number;
  seasonMax: number;
  pressureThreshold: number;
  knockoutMultiplier: number;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'unified',
    label: 'Unified (2022–2026 IPL + T20I)',
    subtitle: 'Full multi-season sample across IPL and International T20 fixtures',
    competitionFilter: 'ALL',
    seasonMin: 2022,
    seasonMax: 2026,
    pressureThreshold: 65,
    knockoutMultiplier: 1.25,
    icon: ShieldCheck,
  },
  {
    id: 'strict_ipl',
    label: 'Strict IPL-Only',
    subtitle: 'Isolates Indian Premier League franchise pressure matchups',
    competitionFilter: 'IPL',
    seasonMin: 2022,
    seasonMax: 2026,
    pressureThreshold: 65,
    knockoutMultiplier: 1.3,
    icon: Trophy,
  },
  {
    id: 'recent_form',
    label: 'Recent Form (2025–2026 Weighted)',
    subtitle: 'Prioritizes 2025–2026 tactical roles and current scoring velocity',
    competitionFilter: 'ALL',
    seasonMin: 2024,
    seasonMax: 2026,
    pressureThreshold: 65,
    knockoutMultiplier: 1.25,
    icon: TrendingUp,
  },
  {
    id: 'playoffs_death',
    label: 'Playoffs & Death Crunch',
    subtitle: 'Elevates Qualifier/Final stakes and Overs 16–20 execution',
    competitionFilter: 'ALL',
    seasonMin: 2022,
    seasonMax: 2026,
    pressureThreshold: 68,
    knockoutMultiplier: 1.45,
    icon: Flame,
  },
];

export const JudgesStressTestBar: React.FC<JudgesStressTestBarProps> = ({
  config,
  onChangeConfig,
  recalcTimeMs = 34,
}) => {
  const activePreset: StressTestPreset = config.stressPreset || 'unified';

  const handleSelectPreset = (preset: (typeof PRESETS)[number]) => {
    onChangeConfig({
      ...config,
      stressPreset: preset.id,
      competitionFilter: preset.competitionFilter,
      seasonMin: preset.seasonMin,
      seasonMax: preset.seasonMax,
      pressureThreshold: preset.pressureThreshold,
      knockoutMultiplier: preset.knockoutMultiplier,
    });
  };

  const currentMeta = PRESETS.find((p) => p.id === activePreset) || PRESETS[0];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0A0E1A] p-6 text-white shadow-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37]">
            <Zap className="h-3.5 w-3.5 text-[#EA1A85]" />
            <span>Cohort Stress-Test Presets</span>
            <span className="text-white/25">·</span>
            <span className="font-mono text-slate-400 tabular-nums">
              Recalculated in {recalcTimeMs} ms
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {currentMeta.subtitle} — rankings and stability badges update immediately on selection.
          </p>
        </div>

        {/* 4 One-Click Stress-Test Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-[#EA1A85] text-white shadow-sm border border-[#EA1A85]'
                    : 'bg-white/[0.05] text-slate-200 border border-white/[0.08] hover:bg-white/[0.1] hover:text-white'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
