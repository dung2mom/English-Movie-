import { BeatAudioClip, StoryboardData, VisualStyleId } from '../types';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  renderFilmFrame,
  TOTAL_DURATION_SEC,
} from './animationEngine';

export interface ExportVideoOptions {
  storyboard: StoryboardData;
  style: VisualStyleId;
  beatAudio: Record<string, BeatAudioClip>;
  creatorName: string;
  onProgress?: (percent: number) => void;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Computes a simple normalized amplitude envelope (0..1) at 30 samples/sec
 * so lip-sync stays tightly synced to the real Gemini TTS WAV during export.
 */
function buildAmplitudeEnvelope(buffer: AudioBuffer, fps = 30): number[] {
  const channel = buffer.getChannelData(0);
  const samplesPerFrame = Math.max(1, Math.floor(buffer.sampleRate / fps));
  const totalFrames = Math.ceil(channel.length / samplesPerFrame);
  const env: number[] = [];

  for (let f = 0; f < totalFrames; f++) {
    const start = f * samplesPerFrame;
    const end = Math.min(channel.length, start + samplesPerFrame);
    let sumSq = 0;
    for (let i = start; i < end; i++) {
      sumSq += channel[i] * channel[i];
    }
    const rms = Math.sqrt(sumSq / Math.max(1, end - start));
    env.push(Math.min(1, rms * 5.2));
  }
  return env;
}

/**
 * Records the complete 30-second animated short film (+ 2.5s credit card)
 * with burned-in English subtitles and real Gemini English TTS voice into a downloadable .webm video.
 */
export async function exportFullFilmVideo({
  storyboard,
  style,
  beatAudio,
  creatorName,
  onProgress,
}: ExportVideoOptions): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize video canvas.');
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const audioCtx = new AudioCtx();
  await audioCtx.resume();
  const audioDest = audioCtx.createMediaStreamDestination();

  // Decode all ready beat WAV audio clips
  const decodedBuffers: Record<string, AudioBuffer> = {};
  const envelopes: Record<string, number[]> = {};
  const speechDurations: Record<string, number> = {};

  for (const beat of storyboard.beats) {
    const clip = beatAudio[beat.id];
    if (clip?.status === 'ready' && clip.audioBase64) {
      try {
        const ab = base64ToArrayBuffer(clip.audioBase64);
        const decoded = await audioCtx.decodeAudioData(ab.slice(0));
        decodedBuffers[beat.id] = decoded;
        envelopes[beat.id] = buildAmplitudeEnvelope(decoded, 30);
        speechDurations[beat.id] = decoded.duration;
      } catch {
        // Skip broken clip safely
      }
    }
  }

  // Schedule each beat's real TTS voice slightly after beat start (0.2s)
  const startAudioTime = audioCtx.currentTime + 0.1;
  const sources: AudioBufferSourceNode[] = [];

  for (const beat of storyboard.beats) {
    const buf = decodedBuffers[beat.id];
    if (!buf) continue;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioDest);
    const offsetSec = beat.startSec + 0.2;
    const maxPlay = Math.max(0.5, beat.durationSec - 0.25);
    src.start(startAudioTime + offsetSec, 0, Math.min(buf.duration, maxPlay));
    sources.push(src);
  }

  // Combine canvas video stream + mixed TTS audio stream
  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);

  const preferredMimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const chosenMime =
    preferredMimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

  const recorder = new MediaRecorder(
    combinedStream,
    chosenMime ? { mimeType: chosenMime, videoBitsPerSecond: 3_500_000 } : undefined
  );

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  const totalExportDurationSec = TOTAL_DURATION_SEC + 2.5; // 30s story + 2.5s credit card

  const recordedBlob = await new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('Video recording failed in this browser.'));
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: chosenMime || 'video/webm' }));
    };

    recorder.start(250);
    const wallStart = performance.now();

    const tick = () => {
      const elapsedSec = (performance.now() - wallStart) / 1000;

      // Find live mouth amplitude for current beat
      let mouthOpen = 0;
      const activeBeat = storyboard.beats.find(
        (b) => elapsedSec >= b.startSec && elapsedSec < b.endSec
      );
      if (activeBeat) {
        const env = envelopes[activeBeat.id];
        const speechLocal = elapsedSec - (activeBeat.startSec + 0.2);
        if (env && speechLocal >= 0) {
          const frameIdx = Math.floor(speechLocal * 30);
          if (frameIdx >= 0 && frameIdx < env.length) {
            mouthOpen = env[frameIdx];
          }
        }
      }

      renderFilmFrame(ctx, {
        storyboard,
        style,
        currentTimeSec: Math.min(elapsedSec, totalExportDurationSec),
        mouthOpen,
        beatSpeechDurations: speechDurations,
        creatorName,
        showCreditCard: true,
      });

      const pct = Math.min(99, Math.round((elapsedSec / totalExportDurationSec) * 100));
      onProgress?.(pct);

      if (elapsedSec < totalExportDurationSec) {
        requestAnimationFrame(tick);
      } else {
        onProgress?.(100);
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }
    };

    requestAnimationFrame(tick);
  });

  sources.forEach((s) => {
    try {
      s.stop();
    } catch {
      // ignore already stopped
    }
  });
  await audioCtx.close();

  return recordedBlob;
}
