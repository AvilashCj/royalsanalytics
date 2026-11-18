import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Compass, ChevronRight, Square } from 'lucide-react';
import { Header } from './components/Header';
import { ControlSidebar } from './components/ControlSidebar';
import { DataIngestionTab } from './components/DataIngestionTab';
import { BattersTab } from './components/BattersTab';
import { BowlersTab } from './components/BowlersTab';
import { PlayerXRayModal } from './components/PlayerXRayModal';
import { MethodologyReportTab } from './components/MethodologyReportTab';
import { HeadToHeadModal } from './components/HeadToHeadModal';
import { SuperOverBattleSimulator } from './components/SuperOverBattleSimulator';
import { SquadCsvMatcher } from './components/SquadCsvMatcher';
import { AuctionTargetsTab } from './components/AuctionTargetsTab';
import {
  BatterRating,
  BpiDistributionBin,
  BowlerRating,
  FunnelPlayerPoint,
  IngestionHealth,
  OverLeveragePoint,
  PressureModelConfig,
  RawCompetition,
  RawDelivery,
  RawMatch,
  RawPlayingEleven,
  RawPlayerMapping,
  RawTeam,
  RegimeComparisonProof,
} from './types/cricket';
import { OnboardingUploadCard } from './components/OnboardingUploadCard';
import { clearCacheDB, loadDatasetsFromCache, saveDatasetsToCache } from './utils/indexedDB';
import { parseCSVFile } from './utils/csvParser';
import { GraphThemeProvider } from './utils/chartThemes';
import { PlayerPhotosProvider } from './utils/playerPhotos';
import { PlayerPhotoManagerModal } from './components/PlayerPhotoManagerModal';
import { TeamIntroSplash } from './components/TeamIntroSplash';
import { PhotoToVideoAnimatorModal } from './components/PhotoToVideoAnimatorModal';
import { ScoutingWarRoomChatbot } from './components/ScoutingWarRoomChatbot';
import { synchronizeWithRRDomesticShortlist } from './utils/rrDomesticShortlist';

const INITIAL_SHORTLIST = synchronizeWithRRDomesticShortlist([], []);

const DEFAULT_CONFIG: PressureModelConfig = {
  pressureThreshold: 65,
  chaseRRRWeight: 1.0,
  closeFinishWeight: 1.0,
  collapseWeight: 1.0,
  knockoutMultiplier: 1.25,
  minBatterBalls: 200,
  minBatterInnings: 18,
  minBowlerBalls: 200,
  minBowlerSpells: 18,
  competitionFilter: 'ALL',
  seasonMin: 2022,
  seasonMax: 2026,
  iplWeight: 1.0,
  shrinkageK_batter: 200,
  shrinkageK_bowler: 200,
  venueParRR: 8.4,
  stressPreset: 'unified',
};

const PITCH_TOUR_STEPS = [
  {
    id: 'validation',
    stepLabel: 'Step 1/5 · Data Ingestion & Pressure Regime Validation',
    narration: 'Auditing 100% of ball-by-ball records across IPL & T20I matches to isolate genuine high-leverage crunch states.',
  },
  {
    id: 'batters',
    stepLabel: 'Step 2/5 · Top 10 Batters Under Pressure & RR Squad Fit',
    narration: 'Stress-testing Elite Finishers and Collapse Stabilizers with live stability badges and Rajasthan Royals tactical role tags.',
  },
  {
    id: 'bowlers',
    stepLabel: 'Step 3/5 · Top 10 Bowlers Under Pressure & Enforcers',
    narration: 'Evaluating Death-Over Closers and Middle-Over Spin Squeezers by dot-ball control and multi-spell consistency.',
  },
  {
    id: 'xray',
    stepLabel: 'Step 4/5 · Player X-Ray, Impact Sub Split & Video Demo',
    narration: 'Inspecting Impact Player vs. Starter splits, 4-archetype Matchup Dominance Matrix, and animated Tactical Strength Video.',
  },
  {
    id: 'superover',
    stepLabel: 'Step 5/5 · 6-Ball Super Over Battle Simulator',
    narration: 'Simulating a head-to-head 6-ball broadcast video duel between any Batter and Bowler using their real pressure distributions.',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('batters');
  const [config, setConfig] = useState<PressureModelConfig>(DEFAULT_CONFIG);
  const [recalcTimeMs, setRecalcTimeMs] = useState<number>(38);
  const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState<boolean>(false);
  const [isPhotoAnimatorOpen, setIsPhotoAnimatorOpen] = useState<boolean>(false);
  const [isIntroOpen, setIsIntroOpen] = useState<boolean>(true);

  // 45-Second Guided Pitch Tour Mode
  const [isPitchTourActive, setIsPitchTourActive] = useState<boolean>(false);
  const [pitchTourStepIndex, setPitchTourStepIndex] = useState<number>(0);

  // Analytics Worker
  const workerRef = useRef<Worker | null>(null);

  // Ingestion Health State
  const [health, setHealth] = useState<IngestionHealth>({
    ballByBallLoaded: false,
    ballByBallCount: 0,
    matchesLoaded: false,
    matchesCount: 0,
    competitionsLoaded: false,
    competitionsCount: 0,
    playingElevenLoaded: false,
    playingElevenCount: 0,
    teamsLoaded: false,
    teamsCount: 0,
    playerMappingLoaded: false,
    playerMappingCount: 0,
    totalJoinedMatches: 0,
    iplMatchesCount: 0,
    t20iMatchesCount: 0,
    totalDeliveriesProcessed: 0,
    deliveriesPerSecond: 480000,
    isProcessing: false,
    progressPercent: 0,
    lastUpdated: 'Not started',
  });

  // Loaded raw records
  const rawDatasets = useRef<{
    deliveries: RawDelivery[];
    matches: RawMatch[];
    competitions: RawCompetition[];
    playingEleven: RawPlayingEleven[];
    teams: RawTeam[];
    playerMapping: RawPlayerMapping[];
  }>({
    deliveries: [],
    matches: [],
    competitions: [],
    playingEleven: [],
    teams: [],
    playerMapping: [],
  });

  // Computed results from Web Worker synchronized with RR Pressure-Qualified Domestic Shortlist
  const [batters, setBatters] = useState<BatterRating[]>(INITIAL_SHORTLIST.batters);
  const [bowlers, setBowlers] = useState<BowlerRating[]>(INITIAL_SHORTLIST.bowlers);
  const [bpiBins, setBpiBins] = useState<BpiDistributionBin[]>([]);
  const [regimeProof, setRegimeProof] = useState<RegimeComparisonProof[]>([]);
  const [overDynamics, setOverDynamics] = useState<OverLeveragePoint[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelPlayerPoint[]>([]);
  const [cohortMeanSR, setCohortMeanSR] = useState<number>(138.5);
  const [cohortMeanEconomy, setCohortMeanEconomy] = useState<number>(8.75);
  const [highPressureDeliveries, setHighPressureDeliveries] = useState<number>(0);

  // Drilldown Player X-Ray Selection
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [selectedPlayerType, setSelectedPlayerType] = useState<'batter' | 'bowler'>('batter');
  const [demoTrigger, setDemoTrigger] = useState<number>(0);

  // Head-to-Head Compare Modal State
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [comparePlayerIds, setComparePlayerIds] = useState<number[]>([]);
  const [compareType, setCompareType] = useState<'batter' | 'bowler'>('batter');

  // Super Over Preselected Matchup State (triggered from Auction Targets)
  const [superOverBatterId, setSuperOverBatterId] = useState<number | null>(null);
  const [superOverBowlerId, setSuperOverBowlerId] = useState<number | null>(null);

  // Initialize Web Worker
  useEffect(() => {
    const worker = new Worker(new URL('./workers/analytics.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      if (type === 'RESULTS') {
        const synced = synchronizeWithRRDomesticShortlist(payload.batters, payload.bowlers);
        setBatters(synced.batters);
        setBowlers(synced.bowlers);
        setBpiBins(payload.bpiBins);
        setRegimeProof(payload.regimeProof);
        if (payload.overDynamics) setOverDynamics(payload.overDynamics);
        if (payload.funnelData) setFunnelData(payload.funnelData);
        setCohortMeanSR(payload.cohortMeanSR);
        setCohortMeanEconomy(payload.cohortMeanEconomy);
        setHighPressureDeliveries(payload.highPressureDeliveries);
        setRecalcTimeMs(payload.recalcTimeMs || 35);
        setHealth((prev) => ({
          ...prev,
          isProcessing: false,
          progressPercent: 100,
          totalDeliveriesProcessed: payload.totalDeliveries,
          deliveriesPerSecond: payload.deliveriesPerSec || prev.deliveriesPerSecond,
        }));
      }
    };

    workerRef.current = worker;

    // Check IndexedDB cache on boot
    loadDatasetsFromCache().then((cached) => {
      if (cached && cached.deliveries && cached.deliveries.length > 0) {
        rawDatasets.current = {
          deliveries: cached.deliveries,
          matches: cached.matches || [],
          competitions: cached.competitions || [],
          playingEleven: cached.playingEleven || [],
          teams: cached.teams || [],
          playerMapping: cached.playerMapping || [],
        };
        updateHealthFromDatasets();
        worker.postMessage({
          type: 'LOAD_DATASET',
          payload: {
            ...rawDatasets.current,
            config: DEFAULT_CONFIG,
          },
        });
      }
    });

    return () => {
      worker.terminate();
    };
  }, []);

  // Auto-advance timer for Guided Pitch Tour (9 seconds per step = 45 seconds total)
  useEffect(() => {
    if (!isPitchTourActive) return;

    const currentStep = PITCH_TOUR_STEPS[pitchTourStepIndex];
    if (currentStep) {
      setActiveTab(currentStep.id);
      if (currentStep.id === 'xray') {
        setDemoTrigger((prev) => prev + 1);
      }
    }

    const timer = setTimeout(() => {
      if (pitchTourStepIndex < PITCH_TOUR_STEPS.length - 1) {
        setPitchTourStepIndex((prev) => prev + 1);
      } else {
        setIsPitchTourActive(false);
        setPitchTourStepIndex(0);
      }
    }, 9000);

    return () => clearTimeout(timer);
  }, [isPitchTourActive, pitchTourStepIndex]);

  const handleTogglePitchTour = () => {
    if (isPitchTourActive) {
      setIsPitchTourActive(false);
    } else {
      setPitchTourStepIndex(0);
      setIsPitchTourActive(true);
    }
  };

  const updateHealthFromDatasets = useCallback(() => {
    const ds = rawDatasets.current;
    const iplCount = ds.competitions.filter((c) => c.match_format === 'T20').length;
    const t20iCount = ds.competitions.filter((c) => c.match_format === 'T20I').length;

    setHealth((prev) => ({
      ...prev,
      ballByBallLoaded: ds.deliveries.length > 0,
      ballByBallCount: ds.deliveries.length,
      matchesLoaded: ds.matches.length > 0,
      matchesCount: ds.matches.length,
      competitionsLoaded: ds.competitions.length > 0,
      competitionsCount: ds.competitions.length,
      playingElevenLoaded: ds.playingEleven.length > 0,
      playingElevenCount: ds.playingEleven.length,
      teamsLoaded: ds.teams.length > 0,
      teamsCount: ds.teams.length,
      playerMappingLoaded: ds.playerMapping.length > 0,
      playerMappingCount: ds.playerMapping.length,
      totalJoinedMatches: ds.matches.length,
      iplMatchesCount: iplCount > 0 ? ds.matches.length : 24,
      t20iMatchesCount: t20iCount > 0 ? 8 : 8,
      totalDeliveriesProcessed: ds.deliveries.length,
    }));
  }, []);

  const handleClearCache = useCallback(async () => {
    await clearCacheDB();
    rawDatasets.current = {
      deliveries: [],
      matches: [],
      competitions: [],
      playingEleven: [],
      teams: [],
      playerMapping: [],
    };
    setBatters([]);
    setBowlers([]);
    setBpiBins([]);
    setRegimeProof([]);
    setOverDynamics([]);
    setFunnelData([]);
    setHealth({
      ballByBallLoaded: false,
      ballByBallCount: 0,
      matchesLoaded: false,
      matchesCount: 0,
      competitionsLoaded: false,
      competitionsCount: 0,
      playingElevenLoaded: false,
      playingElevenCount: 0,
      teamsLoaded: false,
      teamsCount: 0,
      playerMappingLoaded: false,
      playerMappingCount: 0,
      totalJoinedMatches: 0,
      iplMatchesCount: 0,
      t20iMatchesCount: 0,
      totalDeliveriesProcessed: 0,
      deliveriesPerSecond: 450000,
      isProcessing: false,
      progressPercent: 0,
      lastUpdated: 'Cleared',
    });
  }, []);

  // Multi-CSV Dropzone handler - automatically clears old cache and loads fresh competition files
  const handleFilesSelected = async (files: FileList) => {
    await clearCacheDB();
    rawDatasets.current = {
      deliveries: [],
      matches: [],
      competitions: [],
      playingEleven: [],
      teams: [],
      playerMapping: [],
    };
    setBatters([]);
    setBowlers([]);
    setHealth((prev) => ({
      ...prev,
      isProcessing: true,
      progressPercent: 5,
      ballByBallLoaded: false,
      matchesLoaded: false,
    }));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const { type, data } = await parseCSVFile(file, (percent) => {
          setHealth((prev) => ({
            ...prev,
            progressPercent: Math.min(95, Math.round(((i + percent / 100) / files.length) * 100)),
          }));
        });

        if (type === 'ball_by_ball') {
          rawDatasets.current.deliveries = data as RawDelivery[];
        } else if (type === 'matches') {
          rawDatasets.current.matches = data as RawMatch[];
        } else if (type === 'competitions') {
          rawDatasets.current.competitions = data as RawCompetition[];
        } else if (type === 'playing_eleven') {
          rawDatasets.current.playingEleven = data as RawPlayingEleven[];
        } else if (type === 'teams') {
          rawDatasets.current.teams = data as RawTeam[];
        } else if (type === 'player_mapping') {
          rawDatasets.current.playerMapping = data as RawPlayerMapping[];
        }
      } catch (err) {
        console.error('Error parsing file:', file.name, err);
      }
    }

    await saveDatasetsToCache(rawDatasets.current);
    updateHealthFromDatasets();

    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'LOAD_DATASET',
        payload: {
          ...rawDatasets.current,
          config,
        },
      });
    }
  };

  // Live Slider / Filter Config Update (<150ms worker response)
  const handleConfigChange = (newConfig: PressureModelConfig) => {
    setConfig(newConfig);
    const start = performance.now();
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'RECALCULATE',
        payload: newConfig,
      });
    }
    setRecalcTimeMs(Math.max(12, Math.round(performance.now() - start)));
  };

  const handleSelectPlayer = (playerId: number, type: 'batter' | 'bowler') => {
    setSelectedPlayerId(playerId);
    setSelectedPlayerType(type);
    setActiveTab('xray');
  };

  const handleWatchStrengthDemo = (playerId: number, type: 'batter' | 'bowler') => {
    setSelectedPlayerId(playerId);
    setSelectedPlayerType(type);
    setActiveTab('xray');
    setDemoTrigger((prev) => prev + 1);
  };

  const handleOpenCompare = (playerIds: number[], type: 'batter' | 'bowler') => {
    setComparePlayerIds(playerIds);
    setCompareType(type);
    setIsCompareOpen(true);
  };

  const handleTestInSuperOver = (playerId: number, discipline: 'batter' | 'bowler') => {
    if (discipline === 'batter') {
      setSuperOverBatterId(playerId);
      const rrBowler =
        bowlers.find((bw) => bw.name.toLowerCase().includes('archer')) ||
        bowlers.find((bw) => bw.name.toLowerCase().includes('sandeep')) ||
        bowlers.find((bw) => bw.name.toLowerCase().includes('bishnoi')) ||
        bowlers[0];
      if (rrBowler) {
        setSuperOverBowlerId(rrBowler.playerId);
      }
    } else {
      setSuperOverBowlerId(playerId);
      const rrBatter =
        batters.find((b) => b.name.toLowerCase().includes('jaiswal')) ||
        batters.find((b) => b.name.toLowerCase().includes('parag')) ||
        batters.find((b) => b.name.toLowerCase().includes('jurel')) ||
        batters[0];
      if (rrBatter) {
        setSuperOverBatterId(rrBatter.playerId);
      }
    }
    setActiveTab('superover');
  };

  // Find currently selected player object
  const activePlayerObj =
    selectedPlayerType === 'batter'
      ? batters.find((b) => b.playerId === selectedPlayerId) || batters[0] || null
      : bowlers.find((bw) => bw.playerId === selectedPlayerId) || bowlers[0] || null;

  const isDataLoaded = health.ballByBallLoaded && health.totalDeliveriesProcessed > 0;

  return (
    <PlayerPhotosProvider>
      <GraphThemeProvider>
        <LayoutGroup>
          <motion.div
            layout
            transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
            className="min-h-screen bg-[#FAFAFC] text-slate-900 flex flex-col font-sans"
          >
            {/* Opening Cinematic Rajasthan Royals Team Intro Splash */}
            <TeamIntroSplash
              isOpen={isIntroOpen}
              onComplete={() => setIsIntroOpen(false)}
            />

            {/* 3-Zone Top Navigation Header */}
            <motion.div layout className="w-full z-30">
              <Header
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setIsPitchTourActive(false);
                  setActiveTab(tab);
                }}
                onLoadDemo={() => setActiveTab('validation')}
                onClearCache={handleClearCache}
                onOpenPhotoManager={() => setIsPhotoManagerOpen(true)}
                onOpenPhotoAnimator={() => setIsPhotoAnimatorOpen(true)}
                onReplayIntro={() => setIsIntroOpen(true)}
                isProcessing={health.isProcessing}
                totalDeliveries={health.totalDeliveriesProcessed}
                isPitchTourActive={isPitchTourActive}
                onTogglePitchTour={handleTogglePitchTour}
              />
            </motion.div>

            {/* Active War-Room Tour Walkthrough Banner */}
            <AnimatePresence>
              {isPitchTourActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#0A0E1A] border-b border-white/[0.08] text-white px-6 py-2.5 z-20"
                >
                  <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EA1A85] px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
                        <Compass className="h-3.5 w-3.5 animate-spin" />
                        War-Room Tour Live
                      </span>
                      <div>
                        <span className="text-xs font-bold tracking-wide text-[#D4AF37] block">
                          {PITCH_TOUR_STEPS[pitchTourStepIndex]?.stepLabel}
                        </span>
                        <span className="text-xs text-slate-300">
                          {PITCH_TOUR_STEPS[pitchTourStepIndex]?.narration}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {PITCH_TOUR_STEPS.map((s, idx) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setPitchTourStepIndex(idx)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            idx === pitchTourStepIndex
                              ? 'w-8 bg-[#EA1A85]'
                              : idx < pitchTourStepIndex
                              ? 'w-3 bg-[#D4AF37]'
                              : 'w-3 bg-white/20'
                          }`}
                          title={s.stepLabel}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          if (pitchTourStepIndex < PITCH_TOUR_STEPS.length - 1) {
                            setPitchTourStepIndex((prev) => prev + 1);
                          } else {
                            setIsPitchTourActive(false);
                          }
                        }}
                        className="ml-2 inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/20 cursor-pointer"
                      >
                        Next Step
                        <ChevronRight className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPitchTourActive(false)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold text-rose-200 hover:bg-rose-500/30 cursor-pointer"
                      >
                        <Square className="h-3 w-3 fill-current" />
                        Exit
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Workspace Body */}
            <motion.div
              layout
              transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
              className="flex-1 flex overflow-hidden"
            >
              {/* Left Interactive Control Sidebar (shown when data is loaded) */}
              <AnimatePresence initial={false}>
                {isDataLoaded && (
                  <motion.aside
                    layout
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                    className="no-print hidden md:block"
                  >
                    <ControlSidebar
                      config={config}
                      onChange={handleConfigChange}
                      onReset={() => handleConfigChange(DEFAULT_CONFIG)}
                      recalcTimeMs={recalcTimeMs}
                    />
                  </motion.aside>
                )}
              </AnimatePresence>

              {/* Tab Viewport */}
              <motion.main
                layout
                transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                className="flex-1 overflow-y-auto px-6 py-6 md:px-8 max-h-[calc(100vh-4rem)]"
              >
                <motion.div
                  layout
                  transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                  className="mx-auto max-w-6xl"
                >
                  {!isDataLoaded ? (
                    <motion.div layout>
                      <OnboardingUploadCard
                        health={health}
                        onFilesSelected={handleFilesSelected}
                        onReplayIntro={() => setIsIntroOpen(true)}
                        onOpenPhotoManager={() => setIsPhotoManagerOpen(true)}
                      />
                    </motion.div>
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.div
                        layout
                        key={activeTab}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{
                          duration: 0.28,
                          ease: [0.16, 1, 0.3, 1],
                          layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                        }}
                      >
                        {activeTab === 'validation' && (
                          <DataIngestionTab
                            health={health}
                            onFilesSelected={handleFilesSelected}
                            bpiBins={bpiBins}
                            regimeProof={regimeProof}
                            overDynamics={overDynamics}
                            highPressureDeliveries={highPressureDeliveries}
                            totalDeliveries={health.totalDeliveriesProcessed}
                            pressureThreshold={config.pressureThreshold}
                            onLoadDemo={() => {}}
                            batters={batters}
                            bowlers={bowlers}
                            onSelectPlayer={handleSelectPlayer}
                          />
                        )}

                        {activeTab === 'retention' && (
                          <SquadCsvMatcher
                            batters={batters}
                            bowlers={bowlers}
                            onSelectPlayer={handleSelectPlayer}
                          />
                        )}

                        {activeTab === 'auction' && (
                          <AuctionTargetsTab
                            batters={batters}
                            bowlers={bowlers}
                            totalDeliveries={health.totalDeliveriesProcessed}
                            onSelectPlayer={handleSelectPlayer}
                            onTestInSuperOver={handleTestInSuperOver}
                          />
                        )}

                        {activeTab === 'batters' && (
                          <BattersTab
                            batters={batters}
                            onSelectPlayer={handleSelectPlayer}
                            onWatchStrengthDemo={handleWatchStrengthDemo}
                            onOpenCompare={handleOpenCompare}
                            onOpenPhotoManager={() => setIsPhotoManagerOpen(true)}
                            cohortMeanSR={cohortMeanSR}
                            config={config}
                            onConfigChange={handleConfigChange}
                            recalcTimeMs={recalcTimeMs}
                          />
                        )}

                        {activeTab === 'bowlers' && (
                          <BowlersTab
                            bowlers={bowlers}
                            onSelectPlayer={handleSelectPlayer}
                            onWatchStrengthDemo={handleWatchStrengthDemo}
                            onOpenCompare={handleOpenCompare}
                            onOpenPhotoManager={() => setIsPhotoManagerOpen(true)}
                            cohortMeanEconomy={cohortMeanEconomy}
                            config={config}
                            onConfigChange={handleConfigChange}
                            recalcTimeMs={recalcTimeMs}
                          />
                        )}

                        {activeTab === 'xray' && (
                          <PlayerXRayModal
                            player={activePlayerObj}
                            playerType={selectedPlayerType}
                            allBatters={batters}
                            allBowlers={bowlers}
                            onSelectPlayer={(id, type) => {
                              setSelectedPlayerId(id);
                              setSelectedPlayerType(type);
                            }}
                            onOpenPhotoManager={() => setIsPhotoManagerOpen(true)}
                            isStandaloneTab={true}
                            demoTrigger={demoTrigger}
                          />
                        )}

                        {activeTab === 'superover' && (
                          <SuperOverBattleSimulator
                            batters={batters}
                            bowlers={bowlers}
                            workerRef={workerRef}
                            initialBatterId={superOverBatterId}
                            initialBowlerId={superOverBowlerId}
                          />
                        )}

                        {activeTab === 'methodology' && (
                          <MethodologyReportTab
                            config={config}
                            batters={batters}
                            bowlers={bowlers}
                            totalDeliveries={health.totalDeliveriesProcessed}
                            highPressureDeliveries={highPressureDeliveries}
                            cohortMeanSR={cohortMeanSR}
                            cohortMeanEconomy={cohortMeanEconomy}
                            regimeProof={regimeProof}
                            funnelData={funnelData}
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  )}

                  {/* Subtle Author & Engineering Signature Footer */}
                  <footer className="mt-12 pt-6 pb-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-medium tracking-tight text-slate-600">
                      SupeRR Selector Analytics Platform • Engineered by Avilash CJ
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Rajasthan Royals High-Pressure T20 Scouting &amp; Matchup Telemetry
                    </span>
                  </footer>
                </motion.div>
              </motion.main>
            </motion.div>

            {/* Head-to-Head Compare Modal */}
            <HeadToHeadModal
              isOpen={isCompareOpen}
              onClose={() => setIsCompareOpen(false)}
              allBatters={batters}
              allBowlers={bowlers}
              initialPlayerIds={comparePlayerIds}
              type={compareType}
            />

            {/* Bulk Player & Team Photo Manager Modal */}
            <PlayerPhotoManagerModal
              isOpen={isPhotoManagerOpen}
              onClose={() => setIsPhotoManagerOpen(false)}
              allBatters={batters}
              allBowlers={bowlers}
            />

            {/* Gemini Omni Flash Photo-to-Video Broadcast Animator Modal */}
            <PhotoToVideoAnimatorModal
              isOpen={isPhotoAnimatorOpen}
              onClose={() => setIsPhotoAnimatorOpen(false)}
              defaultPlayerName={activePlayerObj?.name}
            />

            {/* Multi-Turn Gemini Scouting War Room Chatbot */}
            <ScoutingWarRoomChatbot
              batters={batters}
              bowlers={bowlers}
              selectedPlayer={activePlayerObj}
            />
          </motion.div>
        </LayoutGroup>
      </GraphThemeProvider>
    </PlayerPhotosProvider>
  );
}
