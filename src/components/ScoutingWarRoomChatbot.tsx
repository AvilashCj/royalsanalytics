import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  X,
  User,
  Trash2,
  Loader2,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BatterRating, BowlerRating } from '../types/cricket';

interface ScoutingWarRoomChatbotProps {
  batters: BatterRating[];
  bowlers: BowlerRating[];
  selectedPlayer?: BatterRating | BowlerRating | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
  roleTitle?: string;
  timestamp: string;
}

interface ChatbotRoleOption {
  id: string;
  model: 'gemini-4-argon' | 'gemini-4-carbon' | 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
  title: string;
  badge: string;
  systemInstruction: string;
}

const CHATBOT_ROLES: ChatbotRoleOption[] = [
  {
    id: 'argon-interactive',
    model: 'gemini-4-argon',
    title: 'Matchup & Auction Strategist',
    badge: 'Squad Strategy',
    systemInstruction:
      'You are the Rajasthan Royals Matchup & Auction Strategist. Specialize in squad combinations, batting order optimization, and head-to-head tactical matchups under high pressure.',
  },
  {
    id: 'carbon-deep',
    model: 'gemini-4-carbon',
    title: 'Crunch & Reliability Analyst',
    badge: 'Sample & Consistency',
    systemInstruction:
      'You are the Rajasthan Royals Crunch & Reliability Analyst. Evaluate sample volume, cross-match consistency, dot-ball avoidance, and death-over execution to audit player reliability.',
  },
  {
    id: 'hydrogen-general',
    model: 'gemini-4-hydrogen',
    title: 'Scouting Dossier Lead',
    badge: 'Executive Brief',
    systemInstruction:
      'You are the Rajasthan Royals Scouting Dossier Lead. Provide clear, concise scouting summaries of the Top 10 Pressure Batters and Top 10 Pressure Bowlers for team leadership.',
  },
  {
    id: 'flash-lite-fast',
    model: 'gemini-3.1-flash-lite',
    title: 'Dugout Tactical Desk',
    badge: 'Live Match Calls',
    systemInstruction:
      'You are the Dugout Tactical Desk analyst for the Rajasthan Royals. Deliver instant, punchy 2-3 sentence tactical calls for live match states.',
  },
];

const QUICK_PROMPTS = [
  'Compare our Top 3 clutch batters for a 15-runs-off-6-balls chase.',
  'Which bowler is best suited to defend 12 runs in Over 20?',
  'Build an ideal Rajasthan Royals death-overs core from the leaderboard.',
];

export const ScoutingWarRoomChatbot: React.FC<ScoutingWarRoomChatbotProps> = ({
  batters,
  bowlers,
  selectedPlayer,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('hydrogen-general');
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: 'Rajasthan Royals Scouting Desk ready. Query any batter, bowler, head-to-head matchup, or late-innings chase scenario.',
      modelUsed: 'Scouting Desk',
      roleTitle: 'Scouting Dossier Lead',
      timestamp: 'Ready',
    },
  ]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const activeRole = useMemo(
    () => CHATBOT_ROLES.find((r) => r.id === selectedRoleId) || CHATBOT_ROLES[0],
    [selectedRoleId]
  );

  // Build concise live leaderboard summary for context
  const contextSummary = useMemo(() => {
    const topBat = batters
      .filter((b) => b.unstopRank >= 1 && b.unstopRank <= 10)
      .sort((a, b) => a.unstopRank - b.unstopRank)
      .map(
        (b) =>
          `#${b.unstopRank} ${b.name} (${b.teamName}): PRR ${b.reliabilityScore}, Pressure SR ${b.pressureSR} (+${b.srDelta} vs Normal), Boundary% ${b.pressureBoundaryPct}%, Dot Avoidance ${b.pressureDotAvoidancePct}%, Consistency ${b.consistencyScore}/100`
      )
      .join('\n');

    const topBowl = bowlers
      .filter((bw) => bw.unstopRank >= 1 && bw.unstopRank <= 10)
      .sort((a, b) => a.unstopRank - b.unstopRank)
      .map(
        (bw) =>
          `#${bw.unstopRank} ${bw.name} (${bw.teamName}): PRR ${bw.reliabilityScore}, Pressure Econ ${bw.pressureEconomy} (+${bw.economyDelta} rpo better than Normal), Dot% ${bw.pressureDotPct}%, Wkts ${bw.pressureWickets}, Consistency ${bw.consistencyScore}/100`
      )
      .join('\n');

    const activeFocus = selectedPlayer
      ? `Currently Viewed Player in X-Ray: ${selectedPlayer.name} (${selectedPlayer.teamName}, PRR ${selectedPlayer.reliabilityScore})`
      : '';

    return [
      topBat ? `Top 10 Pressure Batters:\n${topBat}` : '',
      topBowl ? `Top 10 Pressure Bowlers:\n${topBowl}` : '',
      activeFocus,
    ]
      .filter(Boolean)
      .join('\n\n');
  }, [batters, bowlers, selectedPlayer]);

  const buildLocalTacticalReply = (userPrompt: string): string => {
    const topBatters = batters
      .filter((b) => b.unstopRank >= 1 && b.unstopRank <= 3)
      .sort((a, b) => a.unstopRank - b.unstopRank);
    const topBowlers = bowlers
      .filter((bw) => bw.unstopRank >= 1 && bw.unstopRank <= 3)
      .sort((a, b) => a.unstopRank - b.unstopRank);

    const q = userPrompt.toLowerCase();
    if (q.includes('bowl') || q.includes('defend') || q.includes('over 20') || q.includes('yorker')) {
      const bList = topBowlers
        .map(
          (bw) =>
            `• #${bw.unstopRank} ${bw.name} (${bw.teamName}) — PRR ${bw.reliabilityScore}/100 | Pressure Economy ${bw.pressureEconomy} (+${bw.economyDelta} rpo better than Normal) | Dot Ball ${bw.pressureDotPct}%`
        )
        .join('\n');
      return `${activeRole.title} Note:\n\nFor defending tight death-over targets, our top-rated pressure bowlers are:\n${bList}\n\nTactical Call: Deploy #1 ${topBowlers[0]?.name || 'our top death bowler'} for Over 20 to maximize dot-ball squeeze and yorker control.`;
    }

    const batList = topBatters
      .map(
        (b) =>
          `• #${b.unstopRank} ${b.name} (${b.teamName}) — PRR ${b.reliabilityScore}/100 | Pressure SR ${b.pressureSR} (+${b.srDelta} vs Normal) | Dot Avoidance ${b.pressureDotAvoidancePct}%`
      )
      .join('\n');

    return `${activeRole.title} Note:\n\nFor high-pressure chase and death-over execution, our top-ranked clutch batters are:\n${batList}\n\nTactical Call: #1 ${topBatters[0]?.name || 'our lead finisher'} combines boundary acceleration with high dot-ball avoidance when the required rate climbs.`;
  };

  useEffect(() => {
    if (isOpen) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textOverride?: string) => {
    const promptText = (textOverride ?? input).trim();
    if (!promptText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    if (!textOverride) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory
            .filter((m) => !m.id.startsWith('welcome-') && !m.id.startsWith('reset-'))
            .map((m) => ({
              role: m.role,
              text: m.text,
            })),
          model: activeRole.model,
          roleTitle: activeRole.title,
          roleInstruction: activeRole.systemInstruction,
          contextSummary,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error || !data.reply) {
        throw new Error(data.error || 'Fallback to local scouting intelligence');
      }

      const botMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply,
        modelUsed: activeRole.badge,
        roleTitle: activeRole.title,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          text: buildLocalTacticalReply(promptText),
          modelUsed: activeRole.badge,
          roleTitle: activeRole.title,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating War Room Scouting Notes & Q&A Launcher */}
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="fixed bottom-12 right-5 z-40 flex items-center gap-2 rounded-xl border border-white/15 bg-[#0A0E1A] px-4 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-[#131A2E] transition-all cursor-pointer"
      >
        <MessageSquare className="h-4 w-4 text-[#EA1A85]" />
        <span>Scouting Notes &amp; Q&amp;A</span>
      </button>

      {/* Multi-Turn Scouting Notes & Q&A Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-5 z-50 flex h-[540px] max-h-[80vh] w-[92vw] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0A0E1A] text-white shadow-2xl"
          >
            {/* Header */}
            <div className="border-b border-white/[0.08] bg-[#111827] px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[#D4AF37]">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">
                      Franchise War-Room Desk
                    </span>
                    <h3 className="font-condensed text-lg font-bold tracking-tight text-white">
                      Scouting Notes &amp; Q&amp;A
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setMessages([
                        {
                          id: `reset-${Date.now()}`,
                          role: 'model',
                          text: 'Notes cleared. Enter any player matchup or chase scenario below.',
                          modelUsed: activeRole.badge,
                          roleTitle: activeRole.title,
                          timestamp: 'Now',
                        },
                      ])
                    }
                    title="Clear Notes"
                    className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:text-white cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Analyst Desk Selector */}
              <div className="mt-3">
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0A0E1A] px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-[#EA1A85] focus:outline-none cursor-pointer"
                >
                  {CHATBOT_ROLES.map((r) => (
                    <option key={r.id} value={r.id} className="bg-[#0A0E1A] text-white">
                      {r.title} · {r.badge}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable Message Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#090D16]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'model' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[#D4AF37] mt-0.5">
                      <ClipboardList className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#EA1A85] text-white font-medium'
                        : 'border border-white/[0.08] bg-[#131A2E] text-slate-100'
                    }`}
                  >
                    {m.role === 'model' && m.roleTitle && (
                      <div className="mb-1 flex items-center justify-between gap-2 border-b border-white/[0.08] pb-1 font-mono text-[10px] text-[#D4AF37]">
                        <span>{m.roleTitle}</span>
                        <span>{m.modelUsed}</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  </div>

                  {m.role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white mt-0.5">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-300 font-mono px-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EA1A85]" />
                  <span>Querying ball-by-ball pressure records...</span>
                </div>
              )}

              <div ref={threadEndRef} />
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="flex gap-1.5 overflow-x-auto border-t border-white/[0.08] bg-[#0D1322] px-4 py-2.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  onClick={() => handleSendMessage(qp)}
                  disabled={isLoading}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-white/20 hover:text-white cursor-pointer"
                >
                  <ChevronRight className="h-3 w-3 text-[#EA1A85]" />
                  <span>{qp}</span>
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 border-t border-white/[0.08] bg-[#111827] p-3.5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${activeRole.title}...`}
                className="flex-1 rounded-lg border border-white/10 bg-[#0A0E1A] px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:border-[#EA1A85] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EA1A85] text-white hover:bg-[#d41577] disabled:opacity-40 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
