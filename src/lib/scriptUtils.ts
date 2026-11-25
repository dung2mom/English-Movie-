import { ExpressionItem, StoryboardBeat, StoryboardData } from '../types';

export function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function countTotalWords(beats: StoryboardBeat[]): number {
  return beats.reduce((sum, beat) => sum + countWords(beat.englishLine), 0);
}

export interface TextSegment {
  text: string;
  isHighlight: boolean;
  movie?: string;
}

/**
 * Splits text into plain and highlighted segments matching the student's exact expressions.
 * Longest expressions are matched first to prevent partial overlap.
 */
export function splitHighlightedSegments(
  text: string,
  expressions: ExpressionItem[]
): TextSegment[] {
  const valid = expressions
    .map((e) => ({
      expr: e.expression.trim(),
      movie: e.movie.trim(),
    }))
    .filter((e) => e.expr.length > 0)
    .sort((a, b) => b.expr.length - a.expr.length);

  if (!text || valid.length === 0) {
    return [{ text, isHighlight: false }];
  }

  const escaped = valid.map((v) =>
    v.expr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex).filter((p) => p.length > 0);

  return parts.map((part) => {
    const match = valid.find(
      (v) => v.expr.toLowerCase() === part.toLowerCase()
    );
    if (match) {
      return { text: part, isHighlight: true, movie: match.movie };
    }
    return { text: part, isHighlight: false };
  });
}

export function getBeatMatchedExpressions(
  line: string,
  expressions: ExpressionItem[]
): { usedExpressions: string[]; sourceMovies: string[] } {
  const lower = line.toLowerCase();
  const usedExpressions: string[] = [];
  const movies = new Set<string>();

  for (const item of expressions) {
    const expr = item.expression.trim();
    if (!expr) continue;
    if (lower.includes(expr.toLowerCase())) {
      usedExpressions.push(expr);
      if (item.movie.trim()) movies.add(item.movie.trim());
    }
  }

  return { usedExpressions, sourceMovies: Array.from(movies) };
}

export function getExpressionCoverage(
  beats: StoryboardBeat[],
  expressions: ExpressionItem[]
): {
  matchedIds: Set<string>;
  missing: ExpressionItem[];
} {
  const combinedLower = beats
    .map((b) => b.englishLine)
    .join(' ')
    .toLowerCase();
  const matchedIds = new Set<string>();
  const missing: ExpressionItem[] = [];

  for (const item of expressions) {
    const expr = item.expression.trim();
    if (!expr) continue;
    if (combinedLower.includes(expr.toLowerCase())) {
      matchedIds.add(item.id);
    } else {
      missing.push(item);
    }
  }

  return { matchedIds, missing };
}

export interface SubtitleCue {
  lines: [string] | [string, string];
  startRatio: number; // 0..1 within speech window
  endRatio: number;   // 0..1 within speech window
}

/**
 * Splits spoken English line into clean subtitle pages where EVERY page has
 * at most 2 lines (max ~38 chars per line) and preserves every word verbatim.
 */
export function buildSubtitleCues(text: string): SubtitleCue[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const maxLineChars = 38;

  // Build wrapped lines greedily
  const allLines: string[] = [];
  let currentLine = '';
  for (const w of words) {
    if (!currentLine) {
      currentLine = w;
    } else if (currentLine.length + 1 + w.length <= maxLineChars) {
      currentLine += ' ' + w;
    } else {
      allLines.push(currentLine);
      currentLine = w;
    }
  }
  if (currentLine) allLines.push(currentLine);

  // If 1 or 2 lines total, balance 2 lines neatly if 2 lines
  const pages: Array<[string] | [string, string]> = [];
  if (allLines.length === 1) {
    pages.push([allLines[0]]);
  } else if (allLines.length === 2) {
    // Re-balance across 2 lines for even readability
    const mid = Math.ceil(words.length / 2);
    const left = words.slice(0, mid).join(' ');
    const right = words.slice(mid).join(' ');
    if (left.length <= 42 && right.length <= 42) {
      pages.push([left, right]);
    } else {
      pages.push([allLines[0], allLines[1]]);
    }
  } else {
    // Group into pairs of 2 lines per cue page
    for (let i = 0; i < allLines.length; i += 2) {
      if (i + 1 < allLines.length) {
        pages.push([allLines[i], allLines[i + 1]]);
      } else {
        pages.push([allLines[i]]);
      }
    }
  }

  // Assign proportional timing by character count
  const weights = pages.map((p) => p.join(' ').length);
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;

  return pages.map((lines, idx) => {
    const startRatio = acc / totalWeight;
    acc += weights[idx];
    const endRatio = acc / totalWeight;
    return { lines, startRatio, endRatio };
  });
}

export function formatScriptExportText(
  storyboard: StoryboardData,
  expressions: ExpressionItem[],
  creatorName: string
): string {
  const totalWords = countTotalWords(storyboard.beats);
  const lines: string[] = [
    `[${storyboard.title}] — 30-Second Movie English Script`,
    `Made with Google AI Studio · Script by ${creatorName || 'Student'}`,
    '',
    '=== 대본 작성 양식 ===',
    '구간 | 장면 묘사 | 영어 대사·자막 | 사용한 표현 | 출처 영화',
    '----------------------------------------------------------------------',
  ];

  for (const beat of storyboard.beats) {
    const matched = getBeatMatchedExpressions(beat.englishLine, expressions);
    const exprStr = matched.usedExpressions.join(', ') || '-';
    const movieStr = matched.sourceMovies.join(', ') || '-';
    lines.push(
      `${beat.timeRange} (${beat.beatName}) | ${beat.sceneDescription} | "${beat.englishLine}" | ${exprStr} | ${movieStr}`
    );
  }

  lines.push('----------------------------------------------------------------------');
  lines.push(`합계 단어 수: ${totalWords}단어 (60~70단어 권장)`);
  lines.push('');
  lines.push('=== 사용한 영화 표현 목록 ===');
  expressions.forEach((e, idx) => {
    lines.push(`${idx + 1}. ${e.expression} / ${e.meaningKo} / ${e.movie}`);
  });

  return lines.join('\n');
}
