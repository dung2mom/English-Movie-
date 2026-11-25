import { useCallback, useMemo, useState } from 'react';
import {
  BeatAudioClip,
  ExpressionItem,
  SceneConfig,
  StepId,
  StoryboardData,
  VisualStyleId,
} from './types';
import { DEFAULT_EXPRESSIONS, DEFAULT_SCENE } from './data/presets';
import { InputScreen } from './components/InputScreen';
import { SceneScreen } from './components/SceneScreen';
import { StoryboardScreen } from './components/StoryboardScreen';
import { VideoScreen } from './components/VideoScreen';
import { FinalScreen } from './components/FinalScreen';

const STEPS: Array<{ id: StepId; label: string; shortLabel: string }> = [
  { id: 'input', label: '1. Expressions', shortLabel: '1. Input' },
  { id: 'scene', label: '2. Scene', shortLabel: '2. Scene' },
  { id: 'storyboard', label: '3. Storyboard', shortLabel: '3. Script' },
  { id: 'video', label: '4. Video', shortLabel: '4. Video' },
  { id: 'final', label: '5. Final', shortLabel: '5. Final' },
];

async function measureAudioDuration(base64: string, mimeType: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(`data:${mimeType};base64,${base64}`);
    audio.addEventListener('loadedmetadata', () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : 4.5);
    });
    audio.addEventListener('error', () => resolve(4.5));
  });
}

export default function App() {
  const [step, setStep] = useState<StepId>('input');
  const [expressions, setExpressions] = useState<ExpressionItem[]>(DEFAULT_EXPRESSIONS);
  const [scene, setScene] = useState<SceneConfig>(DEFAULT_SCENE);
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null);
  const [beatAudio, setBeatAudio] = useState<Record<string, BeatAudioClip>>({});

  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [regeneratingBeatIdx, setRegeneratingBeatIdx] = useState<number | null>(null);
  const [isGeneratingVoices, setIsGeneratingVoices] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validExpressions = useMemo(
    () =>
      expressions.filter(
        (e) => e.expression.trim().length > 0 && e.movie.trim().length > 0
      ),
    [expressions]
  );

  const uniqueMoviesCount = useMemo(() => {
    const set = new Set(validExpressions.map((e) => e.movie.trim().toLowerCase()));
    return set.size;
  }, [validExpressions]);

  const inputIsValid = validExpressions.length >= 5 && uniqueMoviesCount >= 2;

  const canNavigateTo = (target: StepId): boolean => {
    if (target === 'input') return true;
    if (target === 'scene') return inputIsValid;
    if (target === 'storyboard' || target === 'video' || target === 'final') {
      return inputIsValid && storyboard !== null;
    }
    return false;
  };

  const generateStoryboard = async () => {
    setApiError(null);
    setIsGeneratingStoryboard(true);
    try {
      const res = await fetch('/api/storyboard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expressions: validExpressions,
          scene,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate storyboard.');
      }
      setStoryboard(data.storyboard);
      // Clear previous audio clips since script changed
      setBeatAudio({});
      setStep('storyboard');
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Could not generate storyboard.'
      );
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const regenerateSingleBeat = async (beatIndex: number, customNote?: string) => {
    if (!storyboard) return;
    setApiError(null);
    setRegeneratingBeatIdx(beatIndex);
    try {
      const res = await fetch('/api/storyboard/regenerate-beat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beatIndex,
          expressions: validExpressions,
          scene,
          currentStoryboard: storyboard,
          customNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to regenerate beat.');
      }

      const updatedBeats = storyboard.beats.map((b, idx) =>
        idx === beatIndex ? data.beat : b
      );
      setStoryboard({ ...storyboard, beats: updatedBeats });

      // Clear audio only for this regenerated beat
      const targetId = storyboard.beats[beatIndex].id;
      setBeatAudio((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Could not regenerate this beat.'
      );
    } finally {
      setRegeneratingBeatIdx(null);
    }
  };

  const generateSingleBeatVoice = useCallback(
    async (
      targetStoryboard: StoryboardData,
      beatIndex: number,
      currentScene: SceneConfig
    ) => {
      const beat = targetStoryboard.beats[beatIndex];
      if (!beat) return;

      const voiceName = beat.speaker === 'A' ? currentScene.voiceA : currentScene.voiceB;
      const emotion =
        beat.speaker === 'A'
          ? beat.visualDirection.emotionA
          : beat.visualDirection.emotionB;
      const stylePrompt = `Natural, clear, friendly university student speaking everyday English with a warm ${emotion} tone at a steady, easy-to-follow pace.`;

      setBeatAudio((prev) => ({
        ...prev,
        [beat.id]: {
          beatId: beat.id,
          audioBase64: '',
          mimeType: 'audio/wav',
          audioUrl: '',
          durationSec: 4.5,
          status: 'loading',
        },
      }));

      try {
        const res = await fetch('/api/tts/beat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: beat.englishLine,
            voiceName,
            stylePrompt,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Voice generation failed.');
        }

        const mimeType = data.mimeType || 'audio/wav';
        const durationSec = await measureAudioDuration(data.audioBase64, mimeType);
        const audioUrl = `data:${mimeType};base64,${data.audioBase64}`;

        setBeatAudio((prev) => ({
          ...prev,
          [beat.id]: {
            beatId: beat.id,
            audioBase64: data.audioBase64,
            mimeType,
            audioUrl,
            durationSec,
            status: 'ready',
          },
        }));
      } catch (err) {
        setBeatAudio((prev) => ({
          ...prev,
          [beat.id]: {
            beatId: beat.id,
            audioBase64: '',
            mimeType: 'audio/wav',
            audioUrl: '',
            durationSec: 4.5,
            status: 'error',
            error: err instanceof Error ? err.message : 'Voice generation failed.',
          },
        }));
      }
    },
    []
  );

  const generateAllVoices = useCallback(
    async (targetStoryboard: StoryboardData, forceAll = false) => {
      setIsGeneratingVoices(true);
      try {
        for (let i = 0; i < targetStoryboard.beats.length; i++) {
          const b = targetStoryboard.beats[i];
          if (!forceAll && beatAudio[b.id]?.status === 'ready') continue;
          await generateSingleBeatVoice(targetStoryboard, i, scene);
        }
      } finally {
        setIsGeneratingVoices(false);
      }
    },
    [beatAudio, generateSingleBeatVoice, scene]
  );

  const handleEnterVideoStep = () => {
    setStep('video');
    if (storyboard) {
      const missingAny = storyboard.beats.some(
        (b) => beatAudio[b.id]?.status !== 'ready'
      );
      if (missingAny) {
        void generateAllVoices(storyboard, false);
      }
    }
  };

  const handleUpdateStoryboard = (next: StoryboardData) => {
    // Invalidate voice clips for beats whose English line changed
    if (storyboard) {
      setBeatAudio((prev) => {
        const updated = { ...prev };
        next.beats.forEach((b, i) => {
          if (storyboard.beats[i]?.englishLine !== b.englishLine) {
            delete updated[b.id];
          }
        });
        return updated;
      });
    }
    setStoryboard(next);
  };

  const handleResetProject = () => {
    setStoryboard(null);
    setBeatAudio({});
    setApiError(null);
    setStep('input');
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#1E293B] flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text wordmark */}
          <button
            type="button"
            onClick={() => setStep('input')}
            className="font-display text-xl font-extrabold tracking-tight text-[#1E293B] hover:text-[#2F6F6B] transition-colors whitespace-nowrap shrink-0"
          >
            CinePhrase
          </button>

          {/* Zone 2: 5 clean single-line navigation links */}
          <nav
            aria-label="Workflow steps"
            className="hidden md:flex items-center gap-6 text-sm font-semibold"
          >
            {STEPS.map((s) => {
              const active = step === s.id;
              const enabled = canNavigateTo(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!enabled}
                  onClick={() => {
                    if (s.id === 'video') {
                      handleEnterVideoStep();
                    } else {
                      setStep(s.id);
                    }
                  }}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[#2F6F6B] text-[#2F6F6B]'
                      : enabled
                      ? 'border-transparent text-[#526071] hover:text-[#1E293B]'
                      : 'border-transparent text-[#CBD5E1] cursor-not-allowed'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <button
            type="button"
            onClick={handleResetProject}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#2F6F6B] hover:bg-[#245956] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            New Film
          </button>
        </div>

        {/* Compact mobile step row (keeps total sticky height <= 15% mobile viewport) */}
        <nav
          aria-label="Mobile workflow steps"
          className="md:hidden border-t border-[#EDF2F7] px-3 py-1.5 flex items-center justify-between gap-1 overflow-x-auto bg-white"
        >
          {STEPS.map((s) => {
            const active = step === s.id;
            const enabled = canNavigateTo(s.id);
            return (
              <button
                key={s.id}
                type="button"
                disabled={!enabled}
                onClick={() => {
                  if (s.id === 'video') {
                    handleEnterVideoStep();
                  } else {
                    setStep(s.id);
                  }
                }}
                className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#EBF4F3] text-[#164240]'
                    : enabled
                    ? 'text-[#526071]'
                    : 'text-[#CBD5E1] cursor-not-allowed'
                }`}
              >
                {s.shortLabel}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {step === 'input' && (
          <InputScreen
            expressions={expressions}
            onChange={setExpressions}
            onNext={() => setStep('scene')}
          />
        )}

        {step === 'scene' && (
          <SceneScreen
            scene={scene}
            expressionCount={validExpressions.length}
            movieCount={uniqueMoviesCount}
            isGenerating={isGeneratingStoryboard}
            error={apiError}
            onChange={setScene}
            onBack={() => setStep('input')}
            onGenerateStoryboard={generateStoryboard}
          />
        )}

        {step === 'storyboard' && storyboard && (
          <StoryboardScreen
            storyboard={storyboard}
            expressions={validExpressions}
            regeneratingBeatIndex={regeneratingBeatIdx}
            error={apiError}
            onUpdateStoryboard={handleUpdateStoryboard}
            onRegenerateBeat={regenerateSingleBeat}
            onRegenerateAll={generateStoryboard}
            isRegeneratingAll={isGeneratingStoryboard}
            onBack={() => setStep('scene')}
            onNext={handleEnterVideoStep}
          />
        )}

        {step === 'video' && storyboard && (
          <VideoScreen
            storyboard={storyboard}
            scene={scene}
            beatAudio={beatAudio}
            isGeneratingVoices={isGeneratingVoices}
            onChangeStyle={(nextStyle: VisualStyleId) =>
              setScene((prev) => ({ ...prev, style: nextStyle }))
            }
            onGenerateAllVoices={() => void generateAllVoices(storyboard, true)}
            onRegenerateBeatVoice={(idx) =>
              void generateSingleBeatVoice(storyboard, idx, scene)
            }
            onBack={() => setStep('storyboard')}
            onNext={() => setStep('final')}
          />
        )}

        {step === 'final' && storyboard && (
          <FinalScreen
            storyboard={storyboard}
            scene={scene}
            expressions={validExpressions}
            beatAudio={beatAudio}
            onUpdateCreatorName={(name) =>
              setScene((prev) => ({ ...prev, creatorName: name }))
            }
            onBack={() => setStep('video')}
            onStartNewFilm={handleResetProject}
          />
        )}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-[#64748B]">
          <span>CinePhrase · Everyday Movie English Short-Film Studio</span>
          <span>
            Made with Google AI Studio · Script by{' '}
            {scene.creatorName.trim() || 'Your Name'}
          </span>
        </div>
      </footer>
    </div>
  );
}
