import React from 'react';
import { Sliders, RotateCcw, Zap, Filter } from 'lucide-react';
import { PressureModelConfig } from '../types/cricket';

interface ControlSidebarProps {
  config: PressureModelConfig;
  onChange: (newConfig: PressureModelConfig) => void;
  onReset: () => void;
  recalcTimeMs: number;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  config,
  onChange,
  onReset,
  recalcTimeMs,
}) => {
  const updateField = <K extends keyof PressureModelConfig>(
    field: K,
    value: PressureModelConfig[K]
  ) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  return (
    <aside className="w-80 shrink-0 border-r border-slate-200/80 bg-white p-6 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-[#EA1A85]" />
          <h2 className="font-condensed text-base font-bold tracking-tight text-slate-900">
            Pressure Model Parameters
          </h2>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
          <Zap className="h-3 w-3 text-[#EA1A85]" />
          <span>{recalcTimeMs}ms</span>
        </div>
      </div>

      {/* Primary Pressure Threshold */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-800">
            Clutch Delivery Cutoff
          </label>
          <span className="font-numeric text-sm font-bold text-[#EA1A85] bg-pink-50/80 px-2 py-0.5 rounded border border-pink-200/60">
            BPI &ge; {config.pressureThreshold}
          </span>
        </div>
        <input
          type="range"
          min={45}
          max={85}
          step={1}
          value={config.pressureThreshold}
          onChange={(e) => updateField('pressureThreshold', Number(e.target.value))}
          className="w-full accent-[#EA1A85] cursor-pointer"
        />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Minimum pressure index required to qualify as a clutch delivery.
        </p>
      </div>

      {/* Model Weights Section */}
      <div className="flex flex-col gap-4 border-t border-slate-200/80 pt-4">
        <span className="text-xs font-semibold text-slate-900">
          Match Leverage Weights
        </span>

        {/* Chase RRR Weight */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-medium">Required Rate Escalation</span>
            <span className="font-numeric text-xs text-slate-900 font-bold">{config.chaseRRRWeight.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={config.chaseRRRWeight}
            onChange={(e) => updateField('chaseRRRWeight', Number(e.target.value))}
            className="w-full accent-[#EA1A85] cursor-pointer"
          />
        </div>

        {/* Close-Finish Crunch */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-medium">Death-Overs Crunch</span>
            <span className="font-numeric text-xs text-slate-900 font-bold">{config.closeFinishWeight.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={config.closeFinishWeight}
            onChange={(e) => updateField('closeFinishWeight', Number(e.target.value))}
            className="w-full accent-[#EA1A85] cursor-pointer"
          />
        </div>

        {/* Collapse Stress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-medium">Top-Order Collapse Stress</span>
            <span className="font-numeric text-xs text-slate-900 font-bold">{config.collapseWeight.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={config.collapseWeight}
            onChange={(e) => updateField('collapseWeight', Number(e.target.value))}
            className="w-full accent-[#EA1A85] cursor-pointer"
          />
        </div>

        {/* Knockout Multiplier */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-medium">Playoff &amp; Final Stakes</span>
            <span className="font-numeric text-xs text-slate-900 font-bold">{config.knockoutMultiplier.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={1.5}
            step={0.05}
            value={config.knockoutMultiplier}
            onChange={(e) => updateField('knockoutMultiplier', Number(e.target.value))}
            className="w-full accent-[#EA1A85] cursor-pointer"
          />
        </div>
      </div>

      {/* Fair Comparison Eligibility Controls */}
      <div className="flex flex-col gap-4 border-t border-slate-200/80 pt-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          <span>Qualification Cutoffs</span>
        </div>

        {/* Min Batter Balls */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-medium">Min Clutch Balls (Batters)</span>
            <span className="font-numeric text-xs text-slate-900 font-bold">{config.minBatterBalls} balls</span>
          </div>
          <input
            type="range"
            min={30}
            max={400}
            step={10}
            value={config.minBatterBalls}
            onChange={(e) => updateField('minBatterBalls', Number(e.target.value))}
            className="w-full accent-[#EA1A85] cursor-pointer"
          />
        </div>

        {/* Min Batter Innings */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-medium">Min Clutch Innings (Batters)</span>
            <span className="font-numeric text-xs text-slate-900 font-bold">{config.minBatterInnings} inn</span>
          </div>
          <input
            type="range"
            min={3}
            max={35}
            step={1}
            value={config.minBatterInnings}
            onChange={(e) => updateField('minBatterInnings', Number(e.target.value))}
            className="w-full accent-[#EA1A85] cursor-pointer"
          />
        </div>

        {/* Min Bowler Balls */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-medium">Min Clutch Balls (Bowlers)</span>
            <span className="font-numeric text-xs text-slate-900 font-bold">{config.minBowlerBalls} balls</span>
          </div>
          <input
            type="range"
            min={30}
            max={400}
            step={10}
            value={config.minBowlerBalls}
            onChange={(e) => updateField('minBowlerBalls', Number(e.target.value))}
            className="w-full accent-[#EA1A85] cursor-pointer"
          />
        </div>

        {/* Min Bowler Spells */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-medium">Min Clutch Spells (Bowlers)</span>
            <span className="font-numeric text-xs text-slate-900 font-bold">{config.minBowlerSpells} spells</span>
          </div>
          <input
            type="range"
            min={3}
            max={35}
            step={1}
            value={config.minBowlerSpells}
            onChange={(e) => updateField('minBowlerSpells', Number(e.target.value))}
            className="w-full accent-[#EA1A85] cursor-pointer"
          />
        </div>
      </div>

      {/* Tournament Scope */}
      <div className="flex flex-col gap-2 border-t border-slate-200/80 pt-4">
        <label className="text-xs font-semibold text-slate-900">
          Competition Sample
        </label>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200/80">
          {(['ALL', 'IPL', 'T20I'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => updateField('competitionFilter', filter)}
              className={`rounded py-1 text-xs font-semibold transition-colors cursor-pointer ${
                config.competitionFilter === filter
                  ? 'bg-[#EA1A85] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter === 'ALL' ? 'Combined' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Reset button */}
      <div className="mt-auto pt-4 border-t border-slate-200/80">
        <button
          onClick={onReset}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
          Reset Default Parameters
        </button>
      </div>
    </aside>
  );
};
