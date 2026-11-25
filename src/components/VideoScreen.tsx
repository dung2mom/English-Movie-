import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Play,
  RefreshCw,
  Volume2,
} from 'lucide-react';
import {
  BeatAudioClip,
  SceneConfig,
  StoryboardData,
  VisualStyleId,
} from '../types';
import { STYLE_OPTIONS } from '../data/presets';
import { FilmPlayer } from './FilmPlayer';

interface VideoScreenProps {
  storyboard: StoryboardData;
  scene: SceneConfig;
  beatAudio: Record<string, BeatAudioClip>;
  isGeneratingVoices: boolean;
  onChangeStyle: (style: VisualStyleId) => void;
  onGenerateAllVoices: () => void;
  onRegenerateBeatVoice: (beatIndex: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export const VideoScreen: React.FC<VideoScreenProps> = ({
  storyboard,
  scene,
  beatAudio,
  isGeneratingVoices,
  onChangeStyle,
  onGenerateAllVoices,
  onRegenerateBeatVoice,
  onBack,
  onNext,
}) => {
  const [activeBeatIdx, setActiveBeatIdx] = useState(0);
  const [seekTarget, setSeekTarget] = useState<{
    time: number;
    nonce: number;
  } | null>(null);

  const readyCount = storyboard.beats.filter(
    (b) => beatAudio[b.id]?.status === 'ready'
  ).length;
  const anyError = storyboard.beats.some(
    (b) => beatAudio[b.id]?.status === 'error'
  );
  const allReady = readyCount === storyboard.beats.length;

  const jumpToBeat = (startSec: number, idx: number) => {
    setActiveBeatIdx(idx);
    setSeekTarget({ time: startSec, nonce: Date.now() });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2 max-w-2xl">
          <p className="text-sm font-medium text-[#2F6F6B]">
            Step 4 of 5 · Animated Video & Natural English Voice
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E293B]">
            Preview your 30-second animated clip
          </h1>
          <p className="text-base text-[#526071]">
            All four beats play in order with the same characters, outfits, and
            colors — paired with natural English speech and burned-in bottom
            subtitles matching every word.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-mono-tabular text-[#526071]">
            Voices ready: {readyCount} / 4
          </span>
          <button
            type="button"
            onClick={onGenerateAllVoices}
            disabled={isGeneratingVoices}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F6F8FA] text-sm font-semibold text-[#1E293B] transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {isGeneratingVoices ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Voices...
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                {allReady ? 'Regenerate All Voices' : 'Generate English Voices'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main 2-column stage + style & continuity deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-5">
          <FilmPlayer
            storyboard={storyboard}
            style={scene.style}
            beatAudio={beatAudio}
            creatorName={scene.creatorName}
            externalSeekSec={seekTarget}
            onActiveBeatChange={setActiveBeatIdx}
          />

          {/* Quick Style Switcher */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1E293B]">
                Live Style Preview
              </p>
              <p className="text-xs text-[#64748B]">
                Switch visual style anytime without losing your voices or timing.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 p-1 bg-[#F1F5F9] rounded-xl">
              {STYLE_OPTIONS.map((opt) => {
                const active = scene.style === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeStyle(opt.id)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-[#1E293B] shadow-xs'
                        : 'text-[#526071] hover:text-[#1E293B]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: 4 Sequential Beat Clips Queue */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#1E293B]">
              4 Beat Clips (30s Sequence)
            </h2>
            <p className="text-sm text-[#526071]">
              Tap any beat to jump in and inspect its voice & subtitles.
            </p>
          </div>

          <div className="space-y-3">
            {storyboard.beats.map((beat, idx) => {
              const clip = beatAudio[beat.id];
              const isCurrent = activeBeatIdx === idx;
              const speakerName =
                beat.speaker === 'A'
                  ? storyboard.characterBible.characterA.name
                  : storyboard.characterBible.characterB.name;
              const voiceName =
                beat.speaker === 'A' ? scene.voiceA : scene.voiceB;

              return (
                <div
                  key={beat.id}
                  className={`rounded-xl border p-4 space-y-2.5 transition-colors ${
                    isCurrent
                      ? 'bg-[#F2F8F7] border-[#2F6F6B]'
                      : 'bg-[#FAFBFD] border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#1E293B] font-mono-tabular">
                        {beat.timeRangeEn} · {beat.beatName}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {speakerName} ({voiceName} voice)
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => jumpToBeat(beat.startSec, idx)}
                        aria-label={`Play Beat ${beat.beatNumber}`}
                        className="inline-flex items-center justify-center min-h-[38px] min-w-[38px] rounded-lg bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#2F6F6B]"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRegenerateBeatVoice(idx)}
                        disabled={clip?.status === 'loading'}
                        aria-label={`Regenerate voice for Beat ${beat.beatNumber}`}
                        className="inline-flex items-center justify-center min-h-[38px] min-w-[38px] rounded-lg bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#475569] disabled:opacity-50"
                      >
                        {clip?.status === 'loading' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-[#334155] leading-snug">
                    “{beat.englishLine}”
                  </p>

                  {/* Explicit Voice Status */}
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    {clip?.status === 'ready' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#2F6F6B]" />
                        <span className="text-[#164240]">
                          English voice ready ({clip.durationSec.toFixed(1)}s)
                        </span>
                      </>
                    ) : clip?.status === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#2F6F6B]" />
                        <span className="text-[#526071]">
                          Generating natural English voice...
                        </span>
                      </>
                    ) : clip?.status === 'error' ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-[#B91C1C]" />
                        <span className="text-[#B91C1C]">
                          {clip.error || 'Voice error — tap retry'}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#64748B]">Waiting to generate voice</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {anyError && (
            <p className="text-xs text-[#991B1B]">
              One or more voice clips failed to generate. Tap the retry icon on
              that beat or click Generate English Voices above.
            </p>
          )}
        </aside>
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-[#E2E8F0]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 min-h-[52px] px-6 py-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F6F8FA] text-base font-semibold text-[#334155] transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Storyboard
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2.5 min-h-[54px] px-8 py-3.5 rounded-xl bg-[#2F6F6B] hover:bg-[#245956] text-white text-base font-bold shadow-sm transition-all active:scale-[0.99] whitespace-nowrap shrink-0"
        >
          Next: Final Screen & Download
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
