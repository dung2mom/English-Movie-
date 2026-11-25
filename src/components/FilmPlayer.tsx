import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BeatAudioClip, StoryboardData, VisualStyleId } from '../types';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  getBeatAtTime,
  renderFilmFrame,
  TOTAL_DURATION_SEC,
} from '../lib/animationEngine';

interface FilmPlayerProps {
  storyboard: StoryboardData;
  style: VisualStyleId;
  beatAudio: Record<string, BeatAudioClip>;
  creatorName: string;
  showEndCredit?: boolean;
  externalSeekSec?: { time: number; nonce: number } | null;
  onActiveBeatChange?: (beatIndex: number) => void;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export const FilmPlayer: React.FC<FilmPlayerProps> = ({
  storyboard,
  style,
  beatAudio,
  creatorName,
  showEndCredit = false,
  externalSeekSec,
  onActiveBeatChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const isPlayingRef = useRef(false);
  const isMutedRef = useRef(false);
  const timeRef = useRef(0);
  const lastRafRef = useRef<number | null>(null);
  const lastFrameTsRef = useRef<number | null>(null);
  const activeBeatIdxRef = useRef<number>(0);

  // Web Audio playback & live amplitude analyzer for lip-sync
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const decodedCacheRef = useRef<Record<string, { base64: string; buffer: AudioBuffer }>>({});
  const triggeredBeatRef = useRef<number>(-1);
  const speechDurationsRef = useRef<Record<string, number>>({});

  const totalPlayableSec = showEndCredit ? TOTAL_DURATION_SEC + 2.5 : TOTAL_DURATION_SEC;

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : 1;
    }
  }, [isMuted]);

  const stopActiveAudio = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
        currentSourceRef.current.disconnect();
      } catch {
        // ignore if already ended
      }
      currentSourceRef.current = null;
    }
  }, []);

  const ensureAudioContext = useCallback(async () => {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.gain.value = isMutedRef.current ? 0 : 1;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;

      gain.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      gainNodeRef.current = gain;
      analyserRef.current = analyser;
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const getDecodedBuffer = useCallback(
    async (beatId: string): Promise<AudioBuffer | null> => {
      const clip = beatAudio[beatId];
      if (!clip || clip.status !== 'ready' || !clip.audioBase64) return null;

      const cached = decodedCacheRef.current[beatId];
      if (cached && cached.base64 === clip.audioBase64) {
        return cached.buffer;
      }

      try {
        const ctx = await ensureAudioContext();
        const ab = base64ToArrayBuffer(clip.audioBase64);
        const decoded = await ctx.decodeAudioData(ab.slice(0));
        decodedCacheRef.current[beatId] = {
          base64: clip.audioBase64,
          buffer: decoded,
        };
        speechDurationsRef.current[beatId] = decoded.duration;
        return decoded;
      } catch {
        return null;
      }
    },
    [beatAudio, ensureAudioContext]
  );

  // Pre-decode durations whenever ready beat audio arrives
  useEffect(() => {
    for (const beat of storyboard.beats) {
      const clip = beatAudio[beat.id];
      if (clip?.status === 'ready' && clip.durationSec > 0) {
        speechDurationsRef.current[beat.id] = clip.durationSec;
      }
    }
  }, [beatAudio, storyboard.beats]);

  const playBeatVoiceAt = useCallback(
    async (beatIndex: number, offsetInsideBeatSec: number) => {
      stopActiveAudio();
      const beat = storyboard.beats[beatIndex];
      if (!beat) return;

      const buffer = await getDecodedBuffer(beat.id);
      if (!buffer || !isPlayingRef.current || !audioCtxRef.current || !gainNodeRef.current) {
        return;
      }

      // Speech starts 0.2s into beat
      const speechDelay = 0.2;
      const speechOffset = offsetInsideBeatSec - speechDelay;

      if (speechOffset >= buffer.duration) return;

      const src = audioCtxRef.current.createBufferSource();
      src.buffer = buffer;
      src.connect(gainNodeRef.current);

      const maxRemaining = Math.max(0.1, beat.durationSec - offsetInsideBeatSec - 0.1);
      if (speechOffset < 0) {
        src.start(
          audioCtxRef.current.currentTime + Math.abs(speechOffset),
          0,
          Math.min(buffer.duration, beat.durationSec - speechDelay)
        );
      } else {
        src.start(
          audioCtxRef.current.currentTime,
          speechOffset,
          Math.min(buffer.duration - speechOffset, maxRemaining)
        );
      }
      currentSourceRef.current = src;
    },
    [getDecodedBuffer, stopActiveAudio, storyboard.beats]
  );

  const sampleLiveMouthOpen = useCallback((): number => {
    if (!isPlayingRef.current || !analyserRef.current) return 0;
    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sumSq = 0;
    for (let i = 0; i < data.length; i++) {
      const norm = (data[i] - 128) / 128;
      sumSq += norm * norm;
    }
    const rms = Math.sqrt(sumSq / data.length);
    return Math.min(1, rms * 5.8);
  }, []);

  const drawAtTime = useCallback(
    (t: number, mouthOpen: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderFilmFrame(ctx, {
        storyboard,
        style,
        currentTimeSec: t,
        mouthOpen,
        beatSpeechDurations: speechDurationsRef.current,
        creatorName,
        showCreditCard: showEndCredit,
      });
    },
    [creatorName, showEndCredit, storyboard, style]
  );

  // Redraw static frame whenever style, storyboard, or paused time changes
  useEffect(() => {
    if (!isPlayingRef.current) {
      drawAtTime(timeRef.current, 0);
    }
  }, [drawAtTime, currentTime]);

  // Main 60fps animation loop
  useEffect(() => {
    isPlayingRef.current = isPlaying;

    if (!isPlaying) {
      if (lastRafRef.current !== null) {
        cancelAnimationFrame(lastRafRef.current);
        lastRafRef.current = null;
      }
      lastFrameTsRef.current = null;
      stopActiveAudio();
      triggeredBeatRef.current = -1;
      drawAtTime(timeRef.current, 0);
      return;
    }

    const tick = (now: number) => {
      if (!isPlayingRef.current) return;

      if (lastFrameTsRef.current === null) {
        lastFrameTsRef.current = now;
      }
      const dt = Math.min(0.1, (now - lastFrameTsRef.current) / 1000);
      lastFrameTsRef.current = now;

      const nextTime = timeRef.current + dt;
      if (nextTime >= totalPlayableSec) {
        timeRef.current = totalPlayableSec;
        setCurrentTime(totalPlayableSec);
        setIsPlaying(false);
        isPlayingRef.current = false;
        stopActiveAudio();
        drawAtTime(totalPlayableSec, 0);
        return;
      }

      timeRef.current = nextTime;
      setCurrentTime(nextTime);

      if (nextTime < TOTAL_DURATION_SEC) {
        const { beatIndex, localTime } = getBeatAtTime(storyboard.beats, nextTime);
        if (beatIndex !== activeBeatIdxRef.current) {
          activeBeatIdxRef.current = beatIndex;
          onActiveBeatChange?.(beatIndex);
        }
        if (triggeredBeatRef.current !== beatIndex) {
          triggeredBeatRef.current = beatIndex;
          void playBeatVoiceAt(beatIndex, localTime);
        }
      } else {
        stopActiveAudio();
      }

      const mouth = sampleLiveMouthOpen();
      drawAtTime(nextTime, mouth);

      lastRafRef.current = requestAnimationFrame(tick);
    };

    lastRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (lastRafRef.current !== null) {
        cancelAnimationFrame(lastRafRef.current);
        lastRafRef.current = null;
      }
    };
  }, [
    drawAtTime,
    isPlaying,
    onActiveBeatChange,
    playBeatVoiceAt,
    sampleLiveMouthOpen,
    stopActiveAudio,
    storyboard.beats,
    totalPlayableSec,
  ]);

  // Clean up Web Audio on unmount
  useEffect(() => {
    return () => {
      stopActiveAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopActiveAudio]);

  const seekTo = useCallback(
    async (targetSec: number, autoPlay?: boolean) => {
      const clamped = Math.max(0, Math.min(totalPlayableSec, targetSec));
      timeRef.current = clamped;
      setCurrentTime(clamped);
      triggeredBeatRef.current = -1;
      stopActiveAudio();

      if (clamped < TOTAL_DURATION_SEC) {
        const { beatIndex } = getBeatAtTime(storyboard.beats, clamped);
        activeBeatIdxRef.current = beatIndex;
        onActiveBeatChange?.(beatIndex);
      }

      drawAtTime(clamped, 0);

      if (autoPlay) {
        await ensureAudioContext();
        setIsPlaying(true);
      } else if (isPlayingRef.current && clamped < TOTAL_DURATION_SEC) {
        const { beatIndex, localTime } = getBeatAtTime(storyboard.beats, clamped);
        triggeredBeatRef.current = beatIndex;
        void playBeatVoiceAt(beatIndex, localTime);
      }
    },
    [
      drawAtTime,
      ensureAudioContext,
      onActiveBeatChange,
      playBeatVoiceAt,
      stopActiveAudio,
      storyboard.beats,
      totalPlayableSec,
    ]
  );

  // Respond to external beat clicks
  useEffect(() => {
    if (externalSeekSec) {
      void seekTo(externalSeekSec.time, true);
    }
  }, [externalSeekSec, seekTo]);

  const handleTogglePlay = async () => {
    await ensureAudioContext();
    if (!isPlaying && timeRef.current >= totalPlayableSec - 0.05) {
      timeRef.current = 0;
      setCurrentTime(0);
      triggeredBeatRef.current = -1;
    }
    setIsPlaying((prev) => !prev);
  };

  const handleReplay = async () => {
    await seekTo(0, true);
  };

  const activeBeatInfo = getBeatAtTime(
    storyboard.beats,
    Math.min(currentTime, TOTAL_DURATION_SEC - 0.01)
  );

  const formatSec = (s: number) => {
    const clamped = Math.max(0, Math.min(totalPlayableSec, s));
    const secs = Math.floor(clamped);
    const tenths = Math.floor((clamped - secs) * 10);
    return `0:${String(secs).padStart(2, '0')}.${tenths}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      {/* 16:9 HD Animated Stage */}
      <div className="relative aspect-video w-full bg-[#1E293B]">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleTogglePlay}
          className="w-full h-full block cursor-pointer"
        />

        {/* Big accessible Play Overlay when paused at 0s or ended */}
        {!isPlaying && (
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label="Play 30-second animated film"
            className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/20 hover:bg-[#0F172A]/30 transition-colors"
          >
            <span className="w-20 h-20 rounded-full bg-white/95 text-[#2F6F6B] shadow-lg flex items-center justify-center transition-transform hover:scale-105">
              <Play className="w-9 h-9 fill-current ml-1" />
            </span>
          </button>
        )}
      </div>

      {/* Player Controls & 4-Beat Timeline */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Scrub bar with beat markers */}
        <div className="space-y-2">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={totalPlayableSec}
              step={0.05}
              value={currentTime}
              aria-label="Film timeline"
              onChange={(e) => void seekTo(Number(e.target.value), false)}
              className="w-full h-2.5 accent-[#2F6F6B] cursor-pointer rounded-lg"
            />
          </div>

          {/* 4-Beat Chapter Jump Strip */}
          <div className="grid grid-cols-4 gap-1.5">
            {storyboard.beats.map((b, idx) => {
              const isCurrent =
                currentTime < TOTAL_DURATION_SEC &&
                activeBeatInfo.beatIndex === idx;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => void seekTo(b.startSec, true)}
                  className={`min-h-[40px] px-2 py-1.5 rounded-lg text-left transition-colors border ${
                    isCurrent
                      ? 'bg-[#EBF4F3] border-[#2F6F6B] text-[#164240]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#526071] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <div className="text-xs font-mono-tabular font-semibold truncate">
                    {b.timeRangeEn}
                  </div>
                  <div className="text-xs font-semibold truncate">
                    {b.beatName}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Transport Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="inline-flex items-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-[#2F6F6B] hover:bg-[#245956] text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  {currentTime > 0.1 && currentTime < totalPlayableSec - 0.1
                    ? 'Resume'
                    : 'Play 30s Film'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReplay}
              aria-label="Replay from start"
              className="inline-flex items-center gap-1.5 min-h-[46px] px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F6F8FA] text-sm font-semibold text-[#334155] transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              Replay
            </button>

            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
              className="inline-flex items-center justify-center min-h-[46px] min-w-[46px] rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F6F8FA] text-[#334155] transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="text-sm font-mono-tabular text-[#526071]">
            <span className="font-semibold text-[#1E293B]">
              {formatSec(currentTime)}
            </span>{' '}
            / {formatSec(totalPlayableSec)}
          </div>
        </div>
      </div>
    </div>
  );
};
