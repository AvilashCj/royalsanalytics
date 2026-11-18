import React, { createContext, useContext, useState } from 'react';

export type GraphThemeId = 'midnight_broadcast' | 'emerald_gold' | 'indigo_coral' | 'royal_classic';

export interface GraphThemePalette {
  id: GraphThemeId;
  name: string;
  badge: string;
  isDarkCanvas: boolean;
  cardBg: string;
  cardBorder: string;
  plotBg: string;
  titleText: string;
  subText: string;
  mutedText: string;
  gridStroke: string;
  axisStroke: string;
  primary: string;        // Main pressure metric / highlight
  primaryEnd: string;     // Gradient stop
  secondary: string;      // Secondary line / boundary / comparison
  tertiary: string;       // Wicket / alert / 3rd series
  accentGold: string;     // Top rank / trophy highlight
  baselineDot: string;    // Normal baseline dot/bar
  positiveDelta: string;  // Positive improvement
  negativeDelta: string;  // Dip under pressure
  phaseBands: {
    powerplay: string;
    middle: string;
    death: string;
  };
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

export const GRAPH_THEMES: Record<GraphThemeId, GraphThemePalette> = {
  midnight_broadcast: {
    id: 'midnight_broadcast',
    name: 'Midnight Broadcast',
    badge: 'Dark Telemetry',
    isDarkCanvas: true,
    cardBg: 'bg-[#0D1326]',
    cardBorder: 'border-indigo-900/80',
    plotBg: '#090E1C',
    titleText: 'text-white',
    subText: 'text-slate-300',
    mutedText: 'text-slate-400',
    gridStroke: '#1E293B',
    axisStroke: '#94A3B8',
    primary: '#FF2E93',
    primaryEnd: '#FB7185',
    secondary: '#06B6D4',
    tertiary: '#F59E0B',
    accentGold: '#FBBF24',
    baselineDot: '#64748B',
    positiveDelta: '#10B981',
    negativeDelta: '#F43F5E',
    phaseBands: {
      powerplay: '#1E1B4B',
      middle: '#0F172A',
      death: '#3B0764',
    },
    tooltipBg: 'bg-slate-900/95',
    tooltipBorder: 'border-pink-500/40',
    tooltipText: 'text-white',
  },
  emerald_gold: {
    id: 'emerald_gold',
    name: 'Pitch Emerald & Gold',
    badge: 'Turf Analytics',
    isDarkCanvas: false,
    cardBg: 'bg-[#F8FAFC]',
    cardBorder: 'border-emerald-200',
    plotBg: '#FFFFFF',
    titleText: 'text-slate-900',
    subText: 'text-slate-600',
    mutedText: 'text-slate-500',
    gridStroke: '#D1FAE5',
    axisStroke: '#64748B',
    primary: '#059669',
    primaryEnd: '#10B981',
    secondary: '#D97706',
    tertiary: '#4F46E5',
    accentGold: '#D97706',
    baselineDot: '#94A3B8',
    positiveDelta: '#059669',
    negativeDelta: '#DC2626',
    phaseBands: {
      powerplay: '#ECFDF5',
      middle: '#F8FAFC',
      death: '#FEF3C7',
    },
    tooltipBg: 'bg-white',
    tooltipBorder: 'border-emerald-300',
    tooltipText: 'text-slate-900',
  },
  indigo_coral: {
    id: 'indigo_coral',
    name: 'Electric Indigo & Coral',
    badge: 'Vector Pro',
    isDarkCanvas: false,
    cardBg: 'bg-white',
    cardBorder: 'border-indigo-200',
    plotBg: '#F8FAFF',
    titleText: 'text-slate-900',
    subText: 'text-slate-600',
    mutedText: 'text-slate-500',
    gridStroke: '#E0E7FF',
    axisStroke: '#64748B',
    primary: '#4F46E5',
    primaryEnd: '#818CF8',
    secondary: '#F43F5E',
    tertiary: '#0D9488',
    accentGold: '#F59E0B',
    baselineDot: '#94A3B8',
    positiveDelta: '#4F46E5',
    negativeDelta: '#E11D48',
    phaseBands: {
      powerplay: '#EEF2FF',
      middle: '#F8FAFC',
      death: '#FFE4E6',
    },
    tooltipBg: 'bg-white',
    tooltipBorder: 'border-indigo-200',
    tooltipText: 'text-slate-900',
  },
  royal_classic: {
    id: 'royal_classic',
    name: 'Royal Pink & Gold',
    badge: 'RR Classic',
    isDarkCanvas: false,
    cardBg: 'bg-white',
    cardBorder: 'border-pink-200',
    plotBg: '#FFFBFD',
    titleText: 'text-slate-900',
    subText: 'text-slate-600',
    mutedText: 'text-slate-500',
    gridStroke: '#FCE7F1',
    axisStroke: '#64748B',
    primary: '#EA1A85',
    primaryEnd: '#F472B6',
    secondary: '#2563EB',
    tertiary: '#D97706',
    accentGold: '#D97706',
    baselineDot: '#94A3B8',
    positiveDelta: '#EA1A85',
    negativeDelta: '#EF4444',
    phaseBands: {
      powerplay: '#FDF2F8',
      middle: '#F8FAFC',
      death: '#FFF1F2',
    },
    tooltipBg: 'bg-white',
    tooltipBorder: 'border-pink-200',
    tooltipText: 'text-slate-900',
  },
};

interface GraphThemeContextValue {
  themeId: GraphThemeId;
  theme: GraphThemePalette;
  setThemeId: (id: GraphThemeId) => void;
}

const GraphThemeContext = createContext<GraphThemeContextValue>({
  themeId: 'emerald_gold',
  theme: GRAPH_THEMES.emerald_gold,
  setThemeId: () => {},
});

export const GraphThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<GraphThemeId>('emerald_gold');
  return React.createElement(
    GraphThemeContext.Provider,
    {
      value: {
        themeId,
        theme: GRAPH_THEMES[themeId],
        setThemeId,
      },
    },
    children
  );
};

export const useGraphTheme = () => useContext(GraphThemeContext);
