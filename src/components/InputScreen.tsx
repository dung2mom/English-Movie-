import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import { ExpressionItem } from '../types';
import { MOVIE_EXPRESSION_BANK } from '../data/presets';

interface InputScreenProps {
  expressions: ExpressionItem[];
  onChange: (next: ExpressionItem[]) => void;
  onNext: () => void;
}

const MOVIES_IN_BANK = ['Inside Out 2', 'Notting Hill', 'Minari'] as const;

export const InputScreen: React.FC<InputScreenProps> = ({
  expressions,
  onChange,
  onNext,
}) => {
  const [activeMovieFilter, setActiveMovieFilter] = useState<string>('All');

  const validExpressions = useMemo(
    () =>
      expressions.filter(
        (e) => e.expression.trim().length > 0 && e.movie.trim().length > 0
      ),
    [expressions]
  );

  const uniqueMovies = useMemo(() => {
    const set = new Set(
      validExpressions.map((e) => e.movie.trim().toLowerCase())
    );
    return Array.from(set);
  }, [validExpressions]);

  const tooFewExpressions = validExpressions.length < 5;
  const tooFewMovies = uniqueMovies.length < 2;
  const hasWarning = tooFewExpressions || tooFewMovies;

  const isSelectedFromBank = (exprText: string) =>
    expressions.some(
      (e) => e.expression.trim().toLowerCase() === exprText.trim().toLowerCase()
    );

  const toggleBankExpression = (item: {
    expression: string;
    meaningKo: string;
    movie: string;
  }) => {
    const existingIndex = expressions.findIndex(
      (e) =>
        e.expression.trim().toLowerCase() ===
        item.expression.trim().toLowerCase()
    );
    if (existingIndex >= 0) {
      onChange(expressions.filter((_, idx) => idx !== existingIndex));
    } else {
      onChange([
        ...expressions,
        {
          id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          expression: item.expression,
          meaningKo: item.meaningKo,
          movie: item.movie,
        },
      ]);
    }
  };

  const updateRow = (
    id: string,
    field: 'expression' | 'meaningKo' | 'movie',
    value: string
  ) => {
    onChange(
      expressions.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addEmptyRow = () => {
    onChange([
      ...expressions,
      {
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        expression: '',
        meaningKo: '',
        movie: '',
      },
    ]);
  };

  const removeRow = (id: string) => {
    onChange(expressions.filter((row) => row.id !== id));
  };

  const filteredBank = useMemo(() => {
    if (activeMovieFilter === 'All') return MOVIE_EXPRESSION_BANK;
    return MOVIE_EXPRESSION_BANK.filter((item) => item.movie === activeMovieFilter);
  }, [activeMovieFilter]);

  return (
    <div className="space-y-8">
      {/* Screen Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2 max-w-2xl">
          <p className="text-sm font-medium text-[#2F6F6B]">
            Step 1 of 5 · Movie Expressions
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E293B]">
            Choose your movie expressions
          </h1>
          <p className="text-base text-[#526071]">
            Add at least 5 everyday English phrases from 2 or more movies. Every
            expression will appear verbatim in your 30-second animated script.
          </p>
        </div>

        {/* Clean unboxed summary metadata */}
        <div className="flex items-center gap-3 text-sm text-[#526071] font-mono-tabular shrink-0">
          <span className={tooFewExpressions ? 'text-[#B45309] font-semibold' : 'text-[#2F6F6B] font-semibold'}>
            {validExpressions.length} / 5+ expressions
          </span>
          <span aria-hidden="true">·</span>
          <span className={tooFewMovies ? 'text-[#B45309] font-semibold' : 'text-[#2F6F6B] font-semibold'}>
            {uniqueMovies.length} / 2+ movies
          </span>
        </div>
      </div>

      {/* Explicit Warning Banner when < 5 expressions or only 1 movie */}
      {hasWarning && (
        <div
          role="alert"
          className="flex items-start gap-3.5 rounded-2xl bg-[#FEF7E6] border border-[#F2D399] p-5 text-[#7C4A03]"
        >
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-[#B45309]" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-base font-semibold">
              {tooFewExpressions && tooFewMovies
                ? 'Please add at least 5 expressions from 2 or more movies.'
                : tooFewExpressions
                ? `You have ${validExpressions.length} complete expression${validExpressions.length === 1 ? '' : 's'} — please add at least 5.`
                : 'Expressions currently come from only 1 movie — please include at least 2 movies.'}
            </p>
            <p className="text-sm text-[#8F590B]">
              {tooFewExpressions && tooFewMovies
                ? '최소 2개 이상의 영화에서 5개 이상의 영어 표현을 입력해야 다음 단계로 이동할 수 있어요.'
                : tooFewExpressions
                ? '5개 이상의 표현과 출처 영화를 모두 입력해 주세요.'
                : '서로 다른 영화 2편 이상에서 표현을 골라 조합해 보세요.'}
            </p>
          </div>
        </div>
      )}

      {/* Main 2-column responsive workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left/Main: Student Expression List */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-7 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#1E293B]">
                My Expression List
              </h2>
              <p className="text-sm text-[#526071] mt-0.5">
                Type your own phrases or tap any card from the movie bank.
              </p>
            </div>
            <button
              type="button"
              onClick={addEmptyRow}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F6F8FA] text-sm font-semibold text-[#1E293B] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </button>
          </div>

          <div className="divide-y divide-[#EDF2F7]">
            {expressions.length === 0 ? (
              <div className="py-10 text-center text-[#526071] space-y-3">
                <p className="text-base font-medium">No expressions added yet.</p>
                <p className="text-sm">
                  Tap expressions from Inside Out 2, Notting Hill, or Minari on the right, or click Add Row.
                </p>
              </div>
            ) : (
              expressions.map((item, idx) => (
                <div
                  key={item.id}
                  className="py-5 first:pt-2 last:pb-2 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#526071] font-mono-tabular">
                      Expression {String(idx + 1).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRow(item.id)}
                      aria-label={`Remove expression ${idx + 1}`}
                      className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg text-sm font-medium text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-12">
                      <label
                        htmlFor={`expr-${item.id}`}
                        className="block text-sm font-medium text-[#475569] mb-1.5"
                      >
                        English Expression
                      </label>
                      <input
                        id={`expr-${item.id}`}
                        type="text"
                        value={item.expression}
                        onChange={(e) =>
                          updateRow(item.id, 'expression', e.target.value)
                        }
                        placeholder="e.g., I've got butterflies"
                        className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] focus:bg-white text-base font-medium text-[#1E293B] placeholder:text-[#94A3B8] transition-colors"
                      />
                    </div>

                    <div className="sm:col-span-7">
                      <label
                        htmlFor={`ko-${item.id}`}
                        className="block text-sm font-medium text-[#475569] mb-1.5"
                      >
                        Korean Meaning (한국어 뜻)
                      </label>
                      <input
                        id={`ko-${item.id}`}
                        type="text"
                        value={item.meaningKo}
                        onChange={(e) =>
                          updateRow(item.id, 'meaningKo', e.target.value)
                        }
                        placeholder="예: 긴장돼서 떨려"
                        className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] focus:bg-white text-base text-[#1E293B] placeholder:text-[#94A3B8] transition-colors"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label
                        htmlFor={`movie-${item.id}`}
                        className="block text-sm font-medium text-[#475569] mb-1.5"
                      >
                        Movie (출처 영화)
                      </label>
                      <input
                        id={`movie-${item.id}`}
                        type="text"
                        value={item.movie}
                        onChange={(e) =>
                          updateRow(item.id, 'movie', e.target.value)
                        }
                        placeholder="e.g., Inside Out 2"
                        className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] focus:bg-white text-base text-[#1E293B] placeholder:text-[#94A3B8] transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right: Curated Movie Expression Bank (Inside Out 2, Notting Hill, Minari) */}
        <aside className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-7 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-[#1E293B]">
              Quick-Pick Movie Bank
            </h2>
            <p className="text-sm text-[#526071] mt-0.5">
              Tap any expression to add or remove it from your script list.
            </p>
          </div>

          {/* Interactive Filter Segmented Control */}
          <div
            role="tablist"
            aria-label="Filter expressions by movie"
            className="flex flex-wrap gap-1.5 p-1.5 bg-[#F1F5F9] rounded-xl"
          >
            {(['All', ...MOVIES_IN_BANK] as const).map((movie) => {
              const active = activeMovieFilter === movie;
              return (
                <button
                  key={movie}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveMovieFilter(movie)}
                  className={`flex-1 min-h-[40px] px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-[#1E293B] shadow-xs'
                      : 'text-[#526071] hover:text-[#1E293B]'
                  }`}
                >
                  {movie}
                </button>
              );
            })}
          </div>

          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {filteredBank.map((item) => {
              const selected = isSelectedFromBank(item.expression);
              return (
                <button
                  key={`${item.movie}-${item.expression}`}
                  type="button"
                  onClick={() => toggleBankExpression(item)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors min-h-[64px] flex items-start justify-between gap-3 ${
                    selected
                      ? 'bg-[#EBF4F3] border-[#2F6F6B] text-[#164240]'
                      : 'bg-[#FAFBFD] border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#1E293B]'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-base font-bold leading-snug">
                      {item.expression}
                    </p>
                    <p className="text-sm text-[#526071]">
                      {item.meaningKo}{' '}
                      <span aria-hidden="true" className="mx-1 text-[#94A3B8]">
                        ·
                      </span>
                      <span className="font-medium text-[#475569]">
                        {item.movie}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      selected
                        ? 'bg-[#2F6F6B] text-white'
                        : 'border border-[#CBD5E1] bg-white text-[#64748B]'
                    }`}
                  >
                    {selected ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-[#E2E8F0]">
        <p className="text-sm text-[#526071]">
          Family-friendly English learning · Original characters only
        </p>
        <button
          type="button"
          disabled={hasWarning}
          onClick={onNext}
          className={`inline-flex items-center justify-center gap-2.5 min-h-[54px] px-8 py-3.5 rounded-xl text-base font-bold transition-all whitespace-nowrap shrink-0 ${
            hasWarning
              ? 'bg-[#CBD5E1] text-[#64748B] cursor-not-allowed'
              : 'bg-[#2F6F6B] hover:bg-[#245956] text-white shadow-sm active:scale-[0.99]'
          }`}
        >
          Next: Set Up Scene
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
