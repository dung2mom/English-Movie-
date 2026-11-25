import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit3,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Save,
  Table2,
} from 'lucide-react';
import { ExpressionItem, StoryboardBeat, StoryboardData } from '../types';
import {
  countTotalWords,
  countWords,
  getBeatMatchedExpressions,
  getExpressionCoverage,
  splitHighlightedSegments,
} from '../lib/scriptUtils';

interface StoryboardScreenProps {
  storyboard: StoryboardData;
  expressions: ExpressionItem[];
  regeneratingBeatIndex: number | null;
  error: string | null;
  onUpdateStoryboard: (next: StoryboardData) => void;
  onRegenerateBeat: (beatIndex: number, customNote?: string) => void;
  onRegenerateAll: () => void;
  isRegeneratingAll: boolean;
  onBack: () => void;
  onNext: () => void;
}

export const StoryboardScreen: React.FC<StoryboardScreenProps> = ({
  storyboard,
  expressions,
  regeneratingBeatIndex,
  error,
  onUpdateStoryboard,
  onRegenerateBeat,
  onRegenerateAll,
  isRegeneratingAll,
  onBack,
  onNext,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);
  const [draftScene, setDraftScene] = useState('');
  const [draftLine, setDraftLine] = useState('');
  const [draftSpeaker, setDraftSpeaker] = useState<'A' | 'B'>('A');

  const validExpressions = useMemo(
    () => expressions.filter((e) => e.expression.trim().length > 0),
    [expressions]
  );

  const totalWords = useMemo(
    () => countTotalWords(storyboard.beats),
    [storyboard.beats]
  );

  const wordCountStatus: 'ideal' | 'short' | 'long' =
    totalWords >= 60 && totalWords <= 70
      ? 'ideal'
      : totalWords < 60
      ? 'short'
      : 'long';

  const coverage = useMemo(
    () => getExpressionCoverage(storyboard.beats, validExpressions),
    [storyboard.beats, validExpressions]
  );

  const startEditing = (beat: StoryboardBeat) => {
    setEditingBeatId(beat.id);
    setDraftScene(beat.sceneDescription);
    setDraftLine(beat.englishLine);
    setDraftSpeaker(beat.speaker);
  };

  const saveEdit = (beatId: string) => {
    const matched = getBeatMatchedExpressions(draftLine, validExpressions);
    const updatedBeats = storyboard.beats.map((b) =>
      b.id === beatId
        ? {
            ...b,
            sceneDescription: draftScene.trim() || b.sceneDescription,
            englishLine: draftLine.trim() || b.englishLine,
            speaker: draftSpeaker,
            usedExpressions: matched.usedExpressions,
            sourceMovies: matched.sourceMovies,
          }
        : b
    );
    onUpdateStoryboard({ ...storyboard, beats: updatedBeats });
    setEditingBeatId(null);
  };

  const renderHighlightedText = (text: string) => {
    const segments = splitHighlightedSegments(text, validExpressions);
    return segments.map((seg, idx) =>
      seg.isHighlight ? (
        <mark
          key={idx}
          title={seg.movie ? `From ${seg.movie}` : undefined}
          className="bg-[#D9ECEA] text-[#143D3B] font-semibold px-1 py-0.5 rounded-sm underline decoration-[#2F6F6B]/60 decoration-2 underline-offset-4"
        >
          {seg.text}
        </mark>
      ) : (
        <React.Fragment key={idx}>{seg.text}</React.Fragment>
      )
    );
  };

  const charAName = storyboard.characterBible.characterA.name;
  const charBName = storyboard.characterBible.characterB.name;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2 max-w-2xl">
          <p className="text-sm font-medium text-[#2F6F6B]">
            Step 3 of 5 · 30-Second Storyboard
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E293B]">
            {storyboard.title}
          </h1>
          <p className="text-base text-[#526071]">
            Review all four beats (Hook, Problem, Turn, Close). Edit any line or
            regenerate a single beat while keeping your characters and outfits
            consistent.
          </p>
        </div>

        {/* View switcher + Regenerate All */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center p-1 bg-[#E8EEF3] rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'cards'
                  ? 'bg-white text-[#1E293B] shadow-xs'
                  : 'text-[#526071] hover:text-[#1E293B]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Beat Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'table'
                  ? 'bg-white text-[#1E293B] shadow-xs'
                  : 'text-[#526071] hover:text-[#1E293B]'
              }`}
            >
              <Table2 className="w-4 h-4" />
              Script Table (대본 양식)
            </button>
          </div>

          <button
            type="button"
            onClick={onRegenerateAll}
            disabled={isRegeneratingAll || regeneratingBeatIndex !== null}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F6F8FA] text-sm font-semibold text-[#334155] transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {isRegeneratingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Rewrite All
          </button>
        </div>
      </div>

      {/* Script Health Summary Bar (Word count 60-70 + Expression checklist) */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {wordCountStatus === 'ideal' ? (
              <CheckCircle2 className="w-5 h-5 text-[#2F6F6B] shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#B45309] shrink-0" />
            )}
            <p className="text-base font-semibold text-[#1E293B] font-mono-tabular">
              합계 단어 수: {totalWords} words{' '}
              <span className="font-sans font-normal text-sm text-[#526071]">
                (60–70 words recommended ·{' '}
                {wordCountStatus === 'ideal'
                  ? 'On target'
                  : wordCountStatus === 'short'
                  ? 'Slightly short — feel free to add a few words'
                  : 'Slightly long — consider trimming a few words'}
                )
              </span>
            </p>
          </div>

          <div className="text-sm font-medium font-mono-tabular text-[#526071]">
            {coverage.matchedIds.size} / {validExpressions.length} expressions used verbatim
          </div>
        </div>

        {/* Unboxed Expression Coverage Checklist */}
        <div className="pt-3 border-t border-[#EDF2F7] flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {validExpressions.map((exp) => {
            const used = coverage.matchedIds.has(exp.id);
            return (
              <span
                key={exp.id}
                className={`inline-flex items-center gap-1.5 ${
                  used ? 'text-[#164240] font-medium' : 'text-[#B45309] font-semibold'
                }`}
              >
                {used ? (
                  <CheckCircle2 className="w-4 h-4 text-[#2F6F6B] shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#B45309] shrink-0" />
                )}
                <span>{exp.expression}</span>
                <span className="text-[#94A3B8]">·</span>
                <span className="text-[#64748B] font-normal">{exp.movie}</span>
              </span>
            );
          })}
        </div>

        {/* Character Continuity Line */}
        <div className="pt-3 border-t border-[#EDF2F7] flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#526071]">
          <span className="font-semibold text-[#334155]">Continuity Lock:</span>
          <span className="inline-flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-sm border border-black/15 inline-block"
              style={{ backgroundColor: storyboard.characterBible.characterA.outfitColor }}
            />
            {charAName} ({storyboard.characterBible.characterA.topType})
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-sm border border-black/15 inline-block"
              style={{ backgroundColor: storyboard.characterBible.characterB.outfitColor }}
            />
            {charBName} ({storyboard.characterBible.characterB.topType})
          </span>
          <span>{storyboard.characterBible.colorNotes}</span>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-[#FEF2F2] border border-[#FECACA] p-5 text-[#991B1B] text-base"
        >
          {error}
        </div>
      )}

      {/* VIEW MODE 1: Interactive 4-Beat Cards */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {storyboard.beats.map((beat, idx) => {
            const isEditing = editingBeatId === beat.id;
            const isRegenerating = regeneratingBeatIndex === idx;
            const beatWords = countWords(beat.englishLine);
            const matched = getBeatMatchedExpressions(
              beat.englishLine,
              validExpressions
            );
            const speakerName = beat.speaker === 'A' ? charAName : charBName;

            return (
              <article
                key={beat.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  {/* Beat Header — clean unboxed editorial numbering & timing */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-mono-tabular text-[#2F6F6B] font-semibold">
                        0{beat.beatNumber}. {beat.beatName} · {beat.timeRangeEn} ({beat.timeRange})
                      </p>
                      <p className="text-sm text-[#64748B]">
                        Speaker: {speakerName} · {beatWords} words
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startEditing(beat)}
                          disabled={isRegenerating}
                          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F6F8FA] text-sm font-medium text-[#334155] transition-colors whitespace-nowrap shrink-0"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRegenerateBeat(idx)}
                        disabled={isRegenerating || regeneratingBeatIndex !== null || isEditing}
                        className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F6F8FA] text-sm font-medium text-[#334155] transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                      >
                        {isRegenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Regenerate
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 pt-1">
                      <div>
                        <label
                          htmlFor={`edit-speaker-${beat.id}`}
                          className="block text-sm font-semibold text-[#334155] mb-1.5"
                        >
                          Speaker
                        </label>
                        <select
                          id={`edit-speaker-${beat.id}`}
                          value={draftSpeaker}
                          onChange={(e) =>
                            setDraftSpeaker(e.target.value as 'A' | 'B')
                          }
                          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] text-base text-[#1E293B]"
                        >
                          <option value="A">{charAName} (Speaker A)</option>
                          <option value="B">{charBName} (Speaker B)</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor={`edit-scene-${beat.id}`}
                          className="block text-sm font-semibold text-[#334155] mb-1.5"
                        >
                          Scene Description (장면 묘사)
                        </label>
                        <textarea
                          id={`edit-scene-${beat.id}`}
                          rows={2}
                          value={draftScene}
                          onChange={(e) => setDraftScene(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] text-base text-[#1E293B]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`edit-line-${beat.id}`}
                          className="block text-sm font-semibold text-[#334155] mb-1.5"
                        >
                          English Line & Subtitle (영어 대사·자막) ·{' '}
                          <span className="font-mono-tabular font-normal text-[#526071]">
                            {countWords(draftLine)} words
                          </span>
                        </label>
                        <textarea
                          id={`edit-line-${beat.id}`}
                          rows={3}
                          value={draftLine}
                          onChange={(e) => setDraftLine(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] text-base text-[#1E293B]"
                        />
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => saveEdit(beat.id)}
                          className="inline-flex items-center gap-1.5 min-h-[44px] px-5 py-2 rounded-xl bg-[#2F6F6B] hover:bg-[#245956] text-white text-sm font-bold transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          Save Beat
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBeatId(null)}
                          className="min-h-[44px] px-4 py-2 rounded-xl border border-[#CBD5E1] text-sm font-semibold text-[#526071] hover:bg-[#F6F8FA]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-[#64748B] mb-1">
                          Scene Description (장면 묘사)
                        </p>
                        <p className="text-base text-[#334155] leading-relaxed">
                          {beat.sceneDescription}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#F8FAFC] border border-[#E6ECF2] p-4 space-y-1.5">
                        <p className="text-xs font-semibold text-[#64748B]">
                          English Line & Burned-In Subtitle (영어 대사·자막)
                        </p>
                        <p className="text-lg leading-relaxed text-[#0F172A] font-medium">
                          “{renderHighlightedText(beat.englishLine)}”
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Unboxed Movie & Expression Footer */}
                {!isEditing && (
                  <div className="pt-3 border-t border-[#EDF2F7] text-sm text-[#526071] flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-[#334155]">Expressions:</span>
                    {matched.usedExpressions.length > 0 ? (
                      <>
                        <span>{matched.usedExpressions.join(' · ')}</span>
                        {matched.sourceMovies.length > 0 && (
                          <>
                            <span aria-hidden="true" className="text-[#94A3B8]">
                              /
                            </span>
                            <span className="text-[#2F6F6B] font-medium">
                              {matched.sourceMovies.join(', ')}
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-[#94A3B8]">Story transition line</span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        /* VIEW MODE 2: Exact Korean Script Table (대본 작성 양식) */
        <section className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-xl font-bold text-[#1E293B]">
              대본 작성 양식 (30초 영어 단편)
            </h2>
            <span className="text-sm font-mono-tabular text-[#526071]">
              합계 단어 수: {totalWords}단어 (60~70단어 권장)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-sm font-semibold text-[#334155]">
                  <th className="py-3.5 px-4 w-28">구간</th>
                  <th className="py-3.5 px-4 w-1/4">장면 묘사</th>
                  <th className="py-3.5 px-4 w-2/5">영어 대사·자막</th>
                  <th className="py-3.5 px-4">사용한 표현</th>
                  <th className="py-3.5 px-4 w-36">출처 영화</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-base">
                {storyboard.beats.map((beat) => {
                  const matched = getBeatMatchedExpressions(
                    beat.englishLine,
                    validExpressions
                  );
                  return (
                    <tr key={beat.id} className="align-top hover:bg-[#FAFBFD]">
                      <td className="py-4 px-4 font-mono-tabular font-semibold text-[#2F6F6B] whitespace-nowrap">
                        <div>{beat.timeRange}</div>
                        <div className="text-xs font-sans font-normal text-[#64748B]">
                          {beat.beatName}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-[#334155] leading-relaxed">
                        {beat.sceneDescription}
                      </td>
                      <td className="py-4 px-4 text-base text-[#0F172A] leading-relaxed">
                        {renderHighlightedText(beat.englishLine)}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-[#164240]">
                        {matched.usedExpressions.join(', ') || '—'}
                      </td>
                      <td className="py-4 px-4 text-sm text-[#526071]">
                        {matched.sourceMovies.join(', ') || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#F8FAFC] border-t border-[#E2E8F0]">
                  <td
                    colSpan={5}
                    className="py-4 px-4 text-sm font-semibold text-[#1E293B] font-mono-tabular"
                  >
                    합계 단어 수: {totalWords}단어 (60~70단어 권장)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* Navigation Footer */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-[#E2E8F0]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 min-h-[52px] px-6 py-3 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F6F8FA] text-base font-semibold text-[#334155] transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Scene
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2.5 min-h-[54px] px-8 py-3.5 rounded-xl bg-[#2F6F6B] hover:bg-[#245956] text-white text-base font-bold shadow-sm transition-all active:scale-[0.99] whitespace-nowrap shrink-0"
        >
          Next: Build 30s Video & Voice
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
