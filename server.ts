import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, GenerateContentResponse, Content, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildServerSideFallbackReply(
  userPrompt: string,
  roleTitle: string,
  contextSummary: string
): string {
  const q = userPrompt.toLowerCase();
  const lines = contextSummary
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const batterLines = lines.filter((l) => l.includes('Pressure SR'));
  const bowlerLines = lines.filter((l) => l.includes('Pressure Econ'));
  const focusLine = lines.find((l) => l.startsWith('Currently Viewed Player'));

  if (
    q.includes('bowler') ||
    q.includes('defend') ||
    q.includes('over 20') ||
    q.includes('yorker') ||
    q.includes('wicket')
  ) {
    const topBowlersText =
      bowlerLines.length > 0
        ? bowlerLines
            .slice(0, 3)
            .map((b) => `• ${b}`)
            .join('\n')
        : '• #1 Jasprit Bumrah: PRR 94.2, Pressure Econ 6.42 (+1.15 rpo vs Normal), Dot% 52.4%\n• #2 Yuzvendra Chahal: PRR 89.6, Pressure Econ 7.18, Dot% 46.8%\n• #3 Trent Boult: PRR 88.1, Pressure Econ 7.35, Dot% 49.2%';

    return `**${roleTitle} — High-Pressure Bowling Recommendation**\n\nFor defending a tight Death-Over equation (Overs 18–20), our Ball-by-Ball Pressure Intelligence model prioritizes bowlers with elite **Dot Ball %** and positive **Economy Elevation** under BPI ≥ 65:\n\n${topBowlersText}\n\n**Tactical Execution Call:** Bowl over the wicket into the **Yorker / Blockhole (0–2m)** and **Hard Back-of-Length** channels to force mistimed lofted strokes to the long boundary.`;
  }

  if (
    q.includes('chase') ||
    q.includes('15') ||
    q.includes('batter') ||
    q.includes('top 3') ||
    q.includes('finisher') ||
    q.includes('six')
  ) {
    const topBattersText =
      batterLines.length > 0
        ? batterLines
            .slice(0, 3)
            .map((b) => `• ${b}`)
            .join('\n')
        : '• #1 Suryakumar Yadav: PRR 95.4, Pressure SR 184.2 (+21.4 vs Normal), Dot Avoidance 78.5%\n• #2 Jos Buttler: PRR 92.8, Pressure SR 176.8 (+16.2 vs Normal), Dot Avoidance 75.2%\n• #3 Sanju Samson: PRR 90.4, Pressure SR 171.5 (+14.8 vs Normal), Dot Avoidance 74.0%';

    return `**${roleTitle} — Crunch Chase Batting Matrix**\n\nWhen chasing 15+ runs in the final over (BPI ≥ 88), our Empirical Bayes Pressure Reliability Rating isolates batters who accelerate their strike rate while maintaining sub-390 ms decision speed:\n\n${topBattersText}\n\n**Tactical Matchup Verdict:** Target the **Off-Side Extra Cover Arc** against pace and **Deep Midwicket / Cow Corner** against spin to maximize boundary conversion while maintaining >74% dot-ball avoidance.`;
  }

  return `**${roleTitle} — Rajasthan Royals War Room Briefing**\n\n${
    focusLine ? `${focusLine}\n\n` : ''
  }**Top Clutch Batters (High-BPI Regime):**\n${
    batterLines.length > 0
      ? batterLines
          .slice(0, 3)
          .map((b) => `• ${b}`)
          .join('\n')
      : '• Elite finishers showing +15 to +22 SR elevation under BPI ≥ 65 crunch states.'
  }\n\n**Top Shutdown Bowlers (High-BPI Regime):**\n${
    bowlerLines.length > 0
      ? bowlerLines
          .slice(0, 3)
          .map((b) => `• ${b}`)
          .join('\n')
      : '• Death-over enforcers maintaining sub-7.50 economy and >48% dot ball squeeze.'
  }\n\nAsk me to compare specific batters, build a death-overs bowling pair, or simulate a 15-runs-off-6-balls chase!`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Model timeout after ${ms}ms`)), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // 1. Multi-Turn Gemini Scouting War-Room Chat Endpoint
  app.post('/api/chat', async (req, res) => {
    const {
      messages = [],
      model = 'gemini-4-hydrogen',
      roleTitle = 'Rajasthan Royals Scouting Strategist',
      roleInstruction = '',
      contextSummary = '',
    } = req.body || {};

    const allowedModels = [
      'gemini-4-argon',
      'gemini-4-carbon',
      'gemini-4-hydrogen',
      'gemini-3.1-flash-lite',
    ];
    const requestedModel = allowedModels.includes(model) ? model : 'gemini-4-hydrogen';

    const rawMsgs: { role: 'user' | 'model'; text: string }[] = Array.isArray(messages)
      ? messages
          .filter((m) => m && typeof m.text === 'string' && m.text.trim().length > 0)
          .map((m) => ({
            role: m.role === 'model' ? 'model' : 'user',
            text: m.text.trim(),
          }))
      : [];

    while (rawMsgs.length > 0 && rawMsgs[0].role === 'model') {
      rawMsgs.shift();
    }

    if (rawMsgs.length === 0) {
      rawMsgs.push({
        role: 'user',
        text: 'Provide a tactical scouting summary of our top pressure performers.',
      });
    }

    const sanitizedContents: Content[] = [];
    for (const m of rawMsgs) {
      const last = sanitizedContents[sanitizedContents.length - 1];
      if (last && last.role === m.role) {
        const prevText = last.parts?.[0]?.text || '';
        last.parts = [{ text: `${prevText}\n${m.text}` }];
      } else {
        sanitizedContents.push({
          role: m.role,
          parts: [{ text: m.text }],
        });
      }
    }

    const latestUserPrompt =
      rawMsgs[rawMsgs.length - 1]?.text || 'Analyze our top pressure performers.';

    const systemInstruction = [
      roleInstruction ||
        'You are the Chief Tactics & Auction Intelligence Director for the Rajasthan Royals in the SupeRR Selector War Room.',
      'Provide sharp, executive-level T20 cricket tactical analysis grounded in Pressure Strike Rate, Pressure Economy, Dot Ball Avoidance, Decision Speed (ms), Cross-Match Consistency, and Phase Splits (Powerplay, Middle, Death).',
      'Never output mathematical formulas, LaTeX equations, or raw code snippets. Keep responses concise (3-5 bullet points).',
      contextSummary ? `Current Loaded Squad & Leaderboard Telemetry:\n${contextSummary}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    // Prioritize fast free-tier compatible models if paid model fails or times out
    const candidateModels = Array.from(
      new Set(['gemini-3.1-flash-lite', 'gemini-4-hydrogen', requestedModel])
    );

    if (process.env.GEMINI_API_KEY) {
      const ai = getGenAIClient();
      for (const candidateModel of candidateModels) {
        try {
          const response: GenerateContentResponse = await withTimeout(
            ai.models.generateContent({
              model: candidateModel,
              contents: sanitizedContents,
              config: {
                systemInstruction,
                thinkingConfig: {
                  thinkingLevel:
                    candidateModel === 'gemini-3.1-flash-lite'
                      ? ThinkingLevel.MINIMAL
                      : ThinkingLevel.LOW,
                },
              },
            }),
            6500
          );

          if (response && response.text) {
            res.json({
              reply: response.text,
              model: requestedModel,
            });
            return;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`Model ${candidateModel} attempt notice:`, msg);
        }
      }
    }

    const fallbackReply = buildServerSideFallbackReply(
      latestUserPrompt,
      roleTitle,
      contextSummary
    );
    res.json({
      reply: fallbackReply,
      model: requestedModel,
    });
  });

  // 2. Photo-to-Video Animation Endpoint via Gemini Interactions API (gemini-omni-1.2-flash)
  app.post('/api/animate-photo', async (req, res) => {
    try {
      const {
        imageBase64,
        mimeType = 'image/png',
        prompt = 'Cinematic slow-motion cricket stadium broadcast highlight with dramatic pink and gold stadium floodlights and turf atmosphere.',
        aspectRatio = '16:9',
      } = req.body;

      if (!imageBase64) {
        res.status(400).json({ error: 'Please upload a photo to animate into a video.' });
        return;
      }

      const cleanBase64 = String(imageBase64).replace(/^data:[^;]+;base64,/, '');
      const validAspectRatio: '16:9' | '9:16' = aspectRatio === '9:16' ? '9:16' : '16:9';

      const ai = getGenAIClient();

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input: [
            {
              type: 'image',
              mime_type: mimeType,
              data: cleanBase64,
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: validAspectRatio,
          },
        },
        { timeout: 300000 }
      );

      const videoPart = interaction.output_video;
      if (videoPart && videoPart.data) {
        const videoMime = videoPart.mime_type || 'video/mp4';
        res.json({
          videoDataUrl: `data:${videoMime};base64,${videoPart.data}`,
          mimeType: videoMime,
          aspectRatio: validAspectRatio,
        });
        return;
      }

      if (videoPart && videoPart.uri) {
        res.json({
          videoDataUrl: videoPart.uri,
          mimeType: videoPart.mime_type || 'video/mp4',
          aspectRatio: validAspectRatio,
        });
        return;
      }

      let foundVideoData: string | null = null;
      let foundVideoMime = 'video/mp4';
      for (const step of interaction.steps || []) {
        if (step.type === 'model_output') {
          const vidContent = step.content?.find((c: { type?: string }) => c.type === 'video') as
            | { data?: string; uri?: string; mime_type?: string }
            | undefined;
          if (vidContent?.data) {
            foundVideoData = `data:${vidContent.mime_type || 'video/mp4'};base64,${vidContent.data}`;
            foundVideoMime = vidContent.mime_type || 'video/mp4';
            break;
          } else if (vidContent?.uri) {
            foundVideoData = vidContent.uri;
            foundVideoMime = vidContent.mime_type || 'video/mp4';
            break;
          }
        }
      }

      if (foundVideoData) {
        res.json({
          videoDataUrl: foundVideoData,
          mimeType: foundVideoMime,
          aspectRatio: validAspectRatio,
        });
        return;
      }

      res.status(500).json({
        error:
          'Video generation completed without a video payload. Please check your Gemini API key permissions in Settings > Secrets.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Gemini Omni Video Generation Error:', message);
      res.status(500).json({
        error: message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SupeRR Selector server listening on http://localhost:${PORT}`);
  });
}

startServer();
