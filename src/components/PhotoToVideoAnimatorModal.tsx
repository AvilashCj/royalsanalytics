import React, { useState, useRef } from 'react';
import {
  Film,
  Upload,
  Download,
  X,
  RectangleHorizontal,
  RectangleVertical,
  AlertCircle,
  Loader2,
  Wand2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PhotoToVideoAnimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlayerName?: string;
}

const MOTION_PRESETS = [
  {
    label: 'Broadcast Stadium Intro',
    prompt:
      'Cinematic slow-motion cricket broadcast camera pan with glowing Rajasthan Royals pink and gold stadium floodlights, atmospheric mist, and dramatic sports arena energy.',
  },
  {
    label: 'High-Pressure Crunch Aura',
    prompt:
      'Dynamic sports broadcast hero shot with subtle golden embers drifting across the night cricket stadium, intense focus, and dramatic camera push-in.',
  },
  {
    label: 'Palace Royal Squad Reveal',
    prompt:
      'Majestic golden hour light rays sweeping across the Rajasthan Royals squad in the heritage palace courtyard, flags gently waving in the breeze, cinematic 4K motion.',
  },
];

export const PhotoToVideoAnimatorModal: React.FC<PhotoToVideoAnimatorModalProps> = ({
  isOpen,
  onClose,
  defaultPlayerName,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(
    '/assets/aistudio/image_4aa7e332.png'
  );
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [prompt, setPrompt] = useState<string>(MOTION_PRESETS[0].prompt);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setVideoUrl(null);
    setImageMimeType(file.type || 'image/png');

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadSquadPhotoAsBase64 = async (srcUrl: string): Promise<{ base64: string; mime: string }> => {
    if (srcUrl.startsWith('data:')) {
      const mimeMatch = srcUrl.match(/^data:([^;]+);base64,/);
      return {
        base64: srcUrl,
        mime: mimeMatch ? mimeMatch[1] : imageMimeType,
      };
    }
    const resp = await fetch(srcUrl);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          base64: String(reader.result),
          mime: blob.type || 'image/png',
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleGenerateVideo = async () => {
    if (!imagePreview || isGenerating) return;
    setIsGenerating(true);
    setErrorMsg(null);
    setVideoUrl(null);

    try {
      const { base64, mime } = await loadSquadPhotoAsBase64(imagePreview);

      const response = await fetch('/api/animate-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: mime,
          prompt,
          aspectRatio,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(
          data.error ||
            'Failed to generate video. Please ensure a valid Gemini API key is configured in Settings > Secrets.'
        );
      }

      setVideoUrl(data.videoDataUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-[#EA1A85]/40 bg-[#0A0E1A] text-white shadow-2xl"
        >
          {/* Top Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#131A2E] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA1A85]/20 border border-[#EA1A85]/50 text-[#EA1A85]">
                <Film className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[#EA1A85] px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest text-white">
                    GEMINI OMNI FLASH
                  </span>
                  <span className="font-mono text-xs font-bold text-[#D4AF37]">
                    Interactions API · Image-to-Video Studio
                  </span>
                </div>
                <h2 className="font-condensed text-2xl font-black uppercase tracking-tight text-white mt-0.5">
                  Broadcast Photo-to-Video Animator {defaultPlayerName ? `— ${defaultPlayerName}` : ''}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-white/5 p-2 text-slate-300 hover:bg-white/15 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
            {/* Left 6 Cols: Upload Photo + Aspect Ratio + Prompt Controls */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              {/* Photo Upload Dropzone */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                    1. Source Player or Squad Photo
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview('/assets/aistudio/image_4aa7e332.png');
                      setImageMimeType('image/png');
                      setErrorMsg(null);
                    }}
                    className="font-mono text-[11px] font-bold text-pink-300 hover:text-white underline cursor-pointer"
                  >
                    Use RR Squad Banner
                  </button>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#EA1A85]/50 bg-[#131A2E]/70 p-4 hover:border-[#D4AF37] transition-all cursor-pointer min-h-[200px]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="relative w-full">
                      <img
                        src={imagePreview}
                        alt="Upload Preview"
                        className="mx-auto max-h-48 rounded-xl object-contain"
                      />
                      <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-[#D4AF37]">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Click to upload a different photo (PNG / JPG / WEBP)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Upload className="mx-auto h-8 w-8 text-[#EA1A85]" />
                      <p className="mt-2 text-sm font-bold text-white">
                        Click to upload a player portrait or team photo
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Supports PNG, JPG, WEBP
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Aspect Ratio Selector (16:9 Landscape or 9:16 Portrait) */}
              <div>
                <label className="block font-mono text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-2">
                  2. Output Video Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-extrabold transition-all cursor-pointer ${
                      aspectRatio === '16:9'
                        ? 'border-[#D4AF37] bg-[#EA1A85] text-white shadow-md'
                        : 'border-white/15 bg-[#131A2E] text-slate-300 hover:text-white'
                    }`}
                  >
                    <RectangleHorizontal className="h-4 w-4" />
                    <span>16:9 Landscape Broadcast</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-extrabold transition-all cursor-pointer ${
                      aspectRatio === '9:16'
                        ? 'border-[#D4AF37] bg-[#EA1A85] text-white shadow-md'
                        : 'border-white/15 bg-[#131A2E] text-slate-300 hover:text-white'
                    }`}
                  >
                    <RectangleVertical className="h-4 w-4" />
                    <span>9:16 Portrait Reel</span>
                  </button>
                </div>
              </div>

              {/* Motion Direction Prompt + Presets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                    3. Broadcast Motion Prompt
                  </label>
                  <span className="font-mono text-[10px] text-slate-400">
                    gemini-omni-1.2-flash
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {MOTION_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPrompt(preset.prompt)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-pink-200 hover:border-[#D4AF37] hover:text-white cursor-pointer"
                    >
                      <Wand2 className="h-3 w-3 text-[#D4AF37]" />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe how the uploaded photo should be animated into video..."
                  className="w-full rounded-xl border border-white/15 bg-[#131A2E] p-3 text-xs text-white placeholder-slate-400 focus:border-[#EA1A85] focus:outline-none"
                />
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerateVideo}
                disabled={isGenerating || !imagePreview}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EA1A85] to-[#D4AF37] py-3.5 px-6 text-sm font-black uppercase tracking-wider text-white shadow-lg hover:opacity-95 disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating Video via Gemini Omni Flash...</span>
                  </>
                ) : (
                  <>
                    <Film className="h-4 w-4" />
                    <span>Render {aspectRatio} Broadcast Clip</span>
                  </>
                )}
              </button>
            </div>

            {/* Right 6 Cols: Video Output Preview */}
            <div className="lg:col-span-6 flex flex-col justify-between rounded-2xl border border-white/10 bg-[#090D16] p-5 min-h-[360px]">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                  Generated Video Output ({aspectRatio})
                </span>
                {videoUrl && (
                  <a
                    href={videoUrl}
                    download={`SupeRR_Animated_${aspectRatio.replace(':', 'x')}.mp4`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#EA1A85] px-3 py-1 text-xs font-bold text-white hover:bg-[#d41577]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download MP4</span>
                  </a>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center py-4">
                {isGenerating ? (
                  <div className="text-center px-4">
                    <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#D4AF37]" />
                    <p className="mt-3 font-condensed text-xl font-bold uppercase text-white">
                      Synthesizing {aspectRatio} Broadcast Motion...
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Gemini Omni Flash is animating your uploaded photo via the Interactions API.
                    </p>
                  </div>
                ) : errorMsg ? (
                  <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-5 text-center max-w-md">
                    <AlertCircle className="mx-auto h-8 w-8 text-rose-400" />
                    <p className="mt-2 text-xs font-bold uppercase tracking-wider text-rose-300">
                      Video Generation Notice
                    </p>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                      {errorMsg}
                    </p>
                    <p className="mt-2 text-[11px] text-[#D4AF37]">
                      Tip: Ensure a billing-enabled media API key is configured on the server environment.
                    </p>
                  </div>
                ) : videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className={`rounded-xl border border-[#D4AF37]/40 shadow-xl ${
                      aspectRatio === '9:16' ? 'max-h-[340px] w-auto' : 'w-full aspect-video'
                    }`}
                  />
                ) : (
                  <div className="text-center px-6">
                    <Film className="mx-auto h-10 w-10 text-slate-600" />
                    <p className="mt-2 text-sm font-bold text-slate-300">
                      Ready to Animate Your Photo
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Upload any player portrait or use the Rajasthan Royals squad banner, pick 16:9 or 9:16, and click Animate.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
