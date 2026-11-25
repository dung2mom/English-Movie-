import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import {
  BeatAudioClip,
  ExpressionItem,
  SceneConfig,
  StoryboardData,
} from '../types';
import { FilmPlayer } from './FilmPlayer';
import { exportFullFilmVideo } from '../lib/videoExporter';
import {
  countTotalWords,
  formatScriptExportText,
} from '../lib/scriptUtils';

interface FinalScreenProps {
  storyboard: StoryboardData;
  scene: SceneConfig;
  expressions: ExpressionItem[];
  beatAudio: Record<string, BeatAudioClip>;
  onUpdateCreatorName: (name: string) => void;
  onBack: () => void;
  onStartNewFilm: () => void;
}

export const FinalScreen: React.FC<FinalScreenProps> = ({
  storyboard,
  scene,
  expressions,
  beatAudio,
  onUpdateCreatorName,
  onBack,
  onStartNewFilm,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const totalWords = countTotalWords(storyboard.beats);
  const creditName = scene.creatorName.trim() || 'Your Name';

  const handleDownloadVideo = async () => {
    setExportError(null);
    setExportSuccess(false);
    setIsExporting(true);
    setExportProgress(2);

    try {
      const blob = await exportFullFilmVideo({
        storyboard,
        style: scene.style,
        beatAudio,
        creatorName: creditName,
        onProgress: (pct) => setExportProgress(pct),
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = storyboard.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      a.href = url;
      a.download = `${safeTitle || 'cinephrase-30s-film'}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setExportSuccess(true);
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : 'Could not export the video in this browser. Try Chrome or Edge desktop.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadScript = () => {
    const content = formatScriptExportText(storyboard, expressions, creditName);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cinephrase-script-table.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2 max-w-2xl">
        <p className="text-sm font-medium text-[#2F6F6B]">
          Step 5 of 5 · Ready to Share
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E293B]">
          {storyboard.title}
        </h1>
        <p className="text-base text-[#526071]">
          Play your completed 30-second animated short film with natural English
          voice and burned-in subtitles, or download both the video and script
          sheet.
        </p>
      </div>

      {/* Showcase + Export Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-4">
          <FilmPlayer
            storyboard={storyboard}
            style={scene.style}
            beatAudio={beatAudio}
            creatorName={creditName}
            showEndCredit={true}
          />

          {/* Official Credit Line */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-base font-semibold text-[#1E293B]">
              Made with Google AI Studio · Script by {creditName}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <label
                htmlFor="final-credit-name"
                className="text-xs font-medium text-[#64748B] whitespace-nowrap"
              >
                Edit name:
              </label>
              <input
                id="final-credit-name"
                type="text"
                value={scene.creatorName}
                onChange={(e) => onUpdateCreatorName(e.target.value)}
                placeholder="Your Name"
                className="w-40 min-h-[40px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-[#FAFBFD] focus:bg-white text-sm font-medium text-[#1E293B]"
              />
            </div>
          </div>
        </div>

        {/* Right: Download & Study Summary */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#1E293B]">
              Download Your Film
            </h2>
            <p className="text-sm text-[#526071]">
              Includes all 4 beats, natural English voice, burned-in subtitles,
              and your closing credit card.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleDownloadVideo}
              disabled={isExporting}
              className="w-full inline-flex items-center justify-center gap-2.5 min-h-[54px] px-6 py-3.5 rounded-xl bg-[#2F6F6B] hover:bg-[#245956] text-white text-base font-bold shadow-sm transition-all active:scale-[0.99] disabled:opacity-70"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Rendering Video ({exportProgress}%)
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download 30s Video (.webm)
                </>
              )}
            </button>

            {isExporting && (
              <div className="space-y-1.5">
                <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2F6F6B] transition-all duration-200"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <p className="text-xs text-[#526071]">
                  Recording all 30 seconds in real time with voice & subtitles —
                  please keep this tab open.
                </p>
              </div>
            )}

            {exportSuccess && !isExporting && (
              <p className="flex items-center gap-2 text-sm font-medium text-[#164240]">
                <CheckCircle2 className="w-4 h-4 text-[#2F6F6B] shrink-0" />
                Video downloaded! Ready to play or submit.
              </p>
            )}

            {exportError && (
              <p role="alert" className="text-sm text-[#B91C1C]">
                {exportError}
              </p>
            )}

            <button
              type="button"
              onClick={handleDownloadScript}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[50px] px-5 py-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F6F8FA] text-base font-semibold text-[#1E293B] transition-colors"
            >
              <FileText className="w-5 h-5 text-[#475569]" />
              Download Script Table (.txt)
            </button>
          </div>

          {/* Clean unboxed study summary */}
          <div className="pt-4 border-t border-[#EDF2F7] space-y-3">
            <h3 className="text-sm font-bold text-[#334155]">
              Expressions Learned ({expressions.filter((e) => e.expression.trim()).length})
            </h3>
            <ul className="space-y-2.5 text-sm">
              {expressions
                .filter((e) => e.expression.trim())
                .map((e) => (
                  <li key={e.id} className="leading-snug">
                    <span className="font-semibold text-[#1E293B]">
                      {e.expression}
                    </span>
                    {e.meaningKo && (
                      <span className="text-[#526071]"> — {e.meaningKo}</span>
                    )}
                    <span className="text-[#94A3B8]"> · </span>
                    <span className="text-[#2F6F6B] font-medium">{e.movie}</span>
                  </li>
                ))}
            </ul>
            <p className="text-xs font-mono-tabular text-[#64748B] pt-1">
              Total script length: {totalWords} words · 30 seconds · 4 beats
            </p>
          </div>
        </aside>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-[#E2E8F0]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 min-h-[52px] px-6 py-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F6F8FA] text-base font-semibold text-[#334155] transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Video Editor
        </button>

        <button
          type="button"
          onClick={onStartNewFilm}
          className="inline-flex items-center justify-center gap-2 min-h-[52px] px-6 py-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F6F8FA] text-base font-semibold text-[#1E293B] transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          Make Another 30s Film
        </button>
      </div>
    </div>
  );
};
