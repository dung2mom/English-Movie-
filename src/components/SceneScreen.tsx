import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clapperboard,
  Film,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { SceneConfig, VisualStyleId } from '../types';
import {
  CHARACTER_PRESETS,
  PLACE_PRESETS,
  SITUATION_PRESETS,
  STYLE_OPTIONS,
  VOICE_OPTIONS,
} from '../data/presets';

interface SceneScreenProps {
  scene: SceneConfig;
  expressionCount: number;
  movieCount: number;
  isGenerating: boolean;
  error: string | null;
  onChange: (next: SceneConfig) => void;
  onBack: () => void;
  onGenerateStoryboard: () => void;
}

export const SceneScreen: React.FC<SceneScreenProps> = ({
  scene,
  expressionCount,
  movieCount,
  isGenerating,
  error,
  onChange,
  onBack,
  onGenerateStoryboard,
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const updateField = <K extends keyof SceneConfig>(
    key: K,
    value: SceneConfig[K]
  ) => {
    onChange({ ...scene, [key]: value });
  };

  const canGenerate =
    scene.place.trim().length > 0 &&
    scene.characters.trim().length > 0 &&
    scene.situation.trim().length > 0 &&
    !isGenerating;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2 max-w-2xl">
          <p className="text-sm font-medium text-[#2F6F6B]">
            Step 2 of 5 · Scene & Visual Style
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E293B]">
            Design your 30-second world
          </h1>
          <p className="text-base text-[#526071]">
            Pick the place, original student characters, everyday situation, and
            animation style. The same characters, outfits, and colors stay
            consistent in every beat.
          </p>
        </div>

        <div className="text-sm text-[#526071] font-mono-tabular shrink-0">
          {expressionCount} expressions · {movieCount} movies ready
        </div>
      </div>

      {/* Visual Style Menu (4 tactile cards with generated previews) */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-7 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-[#1E293B]">
            Choose a Visual Style
          </h2>
          <p className="text-sm text-[#526071] mt-0.5">
            Every beat of your 30-second clip will render in this look.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STYLE_OPTIONS.map((opt) => {
            const active = scene.style === opt.id;
            const imgFailed = failedImages[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateField('style', opt.id as VisualStyleId)}
                className={`group text-left rounded-2xl border overflow-hidden transition-all flex flex-col ${
                  active
                    ? 'border-[#2F6F6B] ring-2 ring-[#2F6F6B]/25 bg-[#F2F8F7]'
                    : 'border-[#E2E8F0] bg-white hover:border-[#94A3B8]'
                }`}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-[#E2E8F0]">
                  {!imgFailed ? (
                    <img
                      src={opt.imageUrl}
                      alt={`${opt.label} sample preview`}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [opt.id]: true }))
                      }
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${opt.fallbackGradient} flex flex-col items-center justify-center gap-2 text-[#334155]`}
                    >
                      <Film className="w-8 h-8 opacity-75" />
                      <span className="text-sm font-semibold">{opt.label}</span>
                    </div>
                  )}

                  {active && (
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#2F6F6B] text-white flex items-center justify-center shadow-sm">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-1.5 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-base font-bold text-[#1E293B]">
                      {opt.label}
                    </span>
                    <span className="text-xs text-[#64748B] shrink-0">
                      {opt.labelKo}
                    </span>
                  </div>
                  <p className="text-sm text-[#526071] leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Scene Fields: Place, Characters, Situation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-7 space-y-6">
          <h2 className="text-xl font-bold text-[#1E293B]">
            Scene Details (장면 설정)
          </h2>

          {/* Place */}
          <div className="space-y-2.5">
            <label
              htmlFor="scene-place"
              className="block text-base font-semibold text-[#1E293B]"
            >
              Place (장소)
            </label>
            <input
              id="scene-place"
              type="text"
              value={scene.place}
              onChange={(e) => updateField('place', e.target.value)}
              placeholder="e.g., Sunlit campus café with wooden tables"
              className="w-full min-h-[50px] px-4 py-3 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] focus:bg-white text-base text-[#1E293B]"
            />
            <div className="flex flex-wrap gap-2">
              {PLACE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateField('place', preset)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-sm border transition-colors text-left ${
                    scene.place === preset
                      ? 'bg-[#EBF4F3] border-[#2F6F6B] text-[#164240] font-semibold'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#526071] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Characters */}
          <div className="space-y-2.5">
            <label
              htmlFor="scene-characters"
              className="block text-base font-semibold text-[#1E293B]"
            >
              Characters & Outfits (등장인물 및 의상)
            </label>
            <input
              id="scene-characters"
              type="text"
              value={scene.characters}
              onChange={(e) => updateField('characters', e.target.value)}
              placeholder="e.g., Minji (cream cardigan) & Jiwon (sage hoodie, glasses)"
              className="w-full min-h-[50px] px-4 py-3 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] focus:bg-white text-base text-[#1E293B]"
            />
            <div className="flex flex-wrap gap-2">
              {CHARACTER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateField('characters', preset)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-sm border transition-colors text-left ${
                    scene.characters === preset
                      ? 'bg-[#EBF4F3] border-[#2F6F6B] text-[#164240] font-semibold'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#526071] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <p className="flex items-center gap-2 text-sm text-[#526071]">
              <ShieldCheck className="w-4 h-4 text-[#2F6F6B] shrink-0" />
              Family-friendly original characters only — no real people, celebrities,
              movie characters, or brand logos.
            </p>
          </div>

          {/* Situation */}
          <div className="space-y-2.5">
            <label
              htmlFor="scene-situation"
              className="block text-base font-semibold text-[#1E293B]"
            >
              Situation (상황)
            </label>
            <textarea
              id="scene-situation"
              rows={2}
              value={scene.situation}
              onChange={(e) => updateField('situation', e.target.value)}
              placeholder="What happens in these 30 seconds?"
              className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] focus:bg-white text-base text-[#1E293B]"
            />
            <div className="flex flex-wrap gap-2">
              {SITUATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateField('situation', preset)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-sm border transition-colors text-left ${
                    scene.situation === preset
                      ? 'bg-[#EBF4F3] border-[#2F6F6B] text-[#164240] font-semibold'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#526071] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right: English Voice Pair & Credit Name */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-7 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#1E293B]">
              Voices & Credit
            </h2>
            <p className="text-sm text-[#526071]">
              Pick natural English voices for Speaker A and Speaker B.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="voice-a"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Speaker A Voice
              </label>
              <select
                id="voice-a"
                value={scene.voiceA}
                onChange={(e) =>
                  updateField('voiceA', e.target.value as SceneConfig['voiceA'])
                }
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] text-base text-[#1E293B]"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} — {v.tone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="voice-b"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Speaker B Voice
              </label>
              <select
                id="voice-b"
                value={scene.voiceB}
                onChange={(e) =>
                  updateField('voiceB', e.target.value as SceneConfig['voiceB'])
                }
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] text-base text-[#1E293B]"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} — {v.tone}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-[#EDF2F7]">
              <label
                htmlFor="creator-name"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Your Name (Ending Credit)
              </label>
              <input
                id="creator-name"
                type="text"
                value={scene.creatorName}
                onChange={(e) => updateField('creatorName', e.target.value)}
                placeholder="e.g., Minji Kim"
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] focus:bg-white text-base text-[#1E293B]"
              />
              <p className="text-xs text-[#64748B] mt-2">
                Shown as: Made with Google AI Studio · Script by{' '}
                {scene.creatorName.trim() || 'Your Name'}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Error feedback */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-[#FEF2F2] border border-[#FECACA] p-5 text-[#991B1B] text-base"
        >
          {error}
        </div>
      )}

      {/* Navigation Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-[#E2E8F0]">
        <button
          type="button"
          onClick={onBack}
          disabled={isGenerating}
          className="inline-flex items-center justify-center gap-2 min-h-[52px] px-6 py-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F6F8FA] text-base font-semibold text-[#334155] transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Expressions
        </button>

        <button
          type="button"
          disabled={!canGenerate}
          onClick={onGenerateStoryboard}
          className={`inline-flex items-center justify-center gap-2.5 min-h-[54px] px-8 py-3.5 rounded-xl text-base font-bold transition-all whitespace-nowrap shrink-0 ${
            !canGenerate
              ? 'bg-[#CBD5E1] text-[#64748B] cursor-not-allowed'
              : 'bg-[#2F6F6B] hover:bg-[#245956] text-white shadow-sm active:scale-[0.99]'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Writing 4-Beat Storyboard...
            </>
          ) : (
            <>
              <Clapperboard className="w-5 h-5" />
              Generate 4-Beat Storyboard
            </>
          )}
        </button>
      </div>
    </div>
  );
};
