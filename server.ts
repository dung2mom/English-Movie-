import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please check Settings > Secrets in AI Studio.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const isRetryable =
        message.includes('503') ||
        message.includes('500') ||
        message.includes('UNAVAILABLE') ||
        message.includes('ECONNRESET');
      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}

function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY')) {
    return { status: 500, message: raw };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403')) {
    return {
      status: 403,
      message:
        'Your Gemini API key could not be authorized. Please verify your key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'API rate limit reached temporarily. Please wait a few seconds and try again.',
    };
  }
  return {
    status: 500,
    message: raw || 'An unexpected error occurred while contacting Gemini.',
  };
}

interface ExpressionInput {
  id: string;
  expression: string;
  meaningKo: string;
  movie: string;
}

interface SceneInput {
  place: string;
  characters: string;
  situation: string;
  style: string;
}

const BEAT_META = [
  { beatNumber: 1, id: 'beat-1', timeRange: '0~7초', timeRangeEn: '0–7s', startSec: 0, endSec: 7, durationSec: 7, beatName: 'Hook' },
  { beatNumber: 2, id: 'beat-2', timeRange: '7~15초', timeRangeEn: '7–15s', startSec: 7, endSec: 15, durationSec: 8, beatName: 'Problem' },
  { beatNumber: 3, id: 'beat-3', timeRange: '15~23초', timeRangeEn: '15–23s', startSec: 15, endSec: 23, durationSec: 8, beatName: 'Turn' },
  { beatNumber: 4, id: 'beat-4', timeRange: '23~30초', timeRangeEn: '23–30s', startSec: 23, endSec: 30, durationSec: 7, beatName: 'Close' },
] as const;

const visualDirectionSchema = {
  type: Type.OBJECT,
  properties: {
    cameraShot: {
      type: Type.STRING,
      description: 'One of: wide_two_shot, medium_two_shot, close_up_A, close_up_B',
    },
    cameraMove: {
      type: Type.STRING,
      description: 'One of: slow_push_in, gentle_pan_right, gentle_pan_left, pull_back_warm',
    },
    emotionA: {
      type: Type.STRING,
      description: 'One of: nervous, surprised, determined, encouraging, relieved, overjoyed, thoughtful, laughing',
    },
    emotionB: {
      type: Type.STRING,
      description: 'One of: nervous, surprised, determined, encouraging, relieved, overjoyed, thoughtful, laughing',
    },
    poseA: {
      type: Type.STRING,
      description: 'One of: holding_mug, checking_notes, hands_on_head, patting_shoulder, high_five, pointing_up, breathing_deep, waving',
    },
    poseB: {
      type: Type.STRING,
      description: 'One of: holding_mug, checking_notes, hands_on_head, patting_shoulder, high_five, pointing_up, breathing_deep, waving',
    },
    propEffect: {
      type: Type.STRING,
      description: 'One of: butterflies, steam, sweat_drop, lightbulb, sparkles, leaves, notes, warm_rays',
    },
  },
  required: ['cameraShot', 'cameraMove', 'emotionA', 'emotionB', 'poseA', 'poseB', 'propEffect'],
};

const characterSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    role: { type: Type.STRING },
    hairStyle: { type: Type.STRING, description: 'One of: bob, ponytail, short_wavy, parted' },
    hairColor: { type: Type.STRING, description: 'Hex color like #3B2F2F' },
    skinTone: { type: Type.STRING, description: 'Hex color like #F2D2BD' },
    topType: { type: Type.STRING, description: 'One of: cardigan, hoodie, jacket, sweater' },
    outfitColor: { type: Type.STRING, description: 'Soft calm hex color like #E9E2D0 or #8BA89B' },
    accentColor: { type: Type.STRING, description: 'Soft complementary hex color' },
    glasses: { type: Type.BOOLEAN },
  },
  required: ['name', 'role', 'hairStyle', 'hairColor', 'skinTone', 'topType', 'outfitColor', 'accentColor', 'glasses'],
};

const storyboardResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'A warm, short family-friendly English title for this 30-second film' },
    characterBible: {
      type: Type.OBJECT,
      properties: {
        characterA: characterSchema,
        characterB: characterSchema,
        settingType: {
          type: Type.STRING,
          description: 'One of: cafe, library, rooftop, campus_park, dorm_studio',
        },
        paletteMood: {
          type: Type.STRING,
          description: 'One of: morning_sage, golden_afternoon, twilight_calm, rainy_cozy',
        },
        colorNotes: { type: Type.STRING, description: 'Short 1-sentence visual continuity summary of outfits and palette.' },
      },
      required: ['characterA', 'characterB', 'settingType', 'paletteMood', 'colorNotes'],
    },
    beats: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          beatNumber: { type: Type.INTEGER },
          sceneDescription: {
            type: Type.STRING,
            description: 'Concise visual scene description keeping the same characters, outfits, and setting.',
          },
          englishLine: {
            type: Type.STRING,
            description: 'Spoken English dialogue line & subtitle for this beat (no speaker prefix inside the line).',
          },
          speaker: { type: Type.STRING, description: 'Either A or B' },
          usedExpressions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          sourceMovies: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          visualDirection: visualDirectionSchema,
        },
        required: [
          'beatNumber',
          'sceneDescription',
          'englishLine',
          'speaker',
          'usedExpressions',
          'sourceMovies',
          'visualDirection',
        ],
      },
    },
  },
  required: ['title', 'characterBible', 'beats'],
};

const singleBeatResponseSchema = {
  type: Type.OBJECT,
  properties: {
    sceneDescription: { type: Type.STRING },
    englishLine: { type: Type.STRING },
    speaker: { type: Type.STRING, description: 'Either A or B' },
    usedExpressions: { type: Type.ARRAY, items: { type: Type.STRING } },
    sourceMovies: { type: Type.ARRAY, items: { type: Type.STRING } },
    visualDirection: visualDirectionSchema,
  },
  required: [
    'sceneDescription',
    'englishLine',
    'speaker',
    'usedExpressions',
    'sourceMovies',
    'visualDirection',
  ],
};

function sanitizeEnum<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function sanitizeVisualDirection(raw: Record<string, string> | undefined) {
  return {
    cameraShot: sanitizeEnum(
      raw?.cameraShot ?? '',
      ['wide_two_shot', 'medium_two_shot', 'close_up_A', 'close_up_B'] as const,
      'medium_two_shot'
    ),
    cameraMove: sanitizeEnum(
      raw?.cameraMove ?? '',
      ['slow_push_in', 'gentle_pan_right', 'gentle_pan_left', 'pull_back_warm'] as const,
      'slow_push_in'
    ),
    emotionA: sanitizeEnum(
      raw?.emotionA ?? '',
      ['nervous', 'surprised', 'determined', 'encouraging', 'relieved', 'overjoyed', 'thoughtful', 'laughing'] as const,
      'thoughtful'
    ),
    emotionB: sanitizeEnum(
      raw?.emotionB ?? '',
      ['nervous', 'surprised', 'determined', 'encouraging', 'relieved', 'overjoyed', 'thoughtful', 'laughing'] as const,
      'encouraging'
    ),
    poseA: sanitizeEnum(
      raw?.poseA ?? '',
      ['holding_mug', 'checking_notes', 'hands_on_head', 'patting_shoulder', 'high_five', 'pointing_up', 'breathing_deep', 'waving'] as const,
      'holding_mug'
    ),
    poseB: sanitizeEnum(
      raw?.poseB ?? '',
      ['holding_mug', 'checking_notes', 'hands_on_head', 'patting_shoulder', 'high_five', 'pointing_up', 'breathing_deep', 'waving'] as const,
      'checking_notes'
    ),
    propEffect: sanitizeEnum(
      raw?.propEffect ?? '',
      ['butterflies', 'steam', 'sweat_drop', 'lightbulb', 'sparkles', 'leaves', 'notes', 'warm_rays'] as const,
      'steam'
    ),
  };
}

function sanitizeCharacter(raw: Record<string, unknown> | undefined, fallbackName: string, defaultColor: string) {
  const safeHex = (val: unknown, fb: string) =>
    typeof val === 'string' && /^#[0-9A-Fa-f]{6}$/.test(val.trim()) ? val.trim() : fb;
  return {
    name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : fallbackName,
    role: typeof raw?.role === 'string' && raw.role.trim() ? raw.role.trim() : 'University student',
    hairStyle: sanitizeEnum(
      String(raw?.hairStyle ?? ''),
      ['bob', 'ponytail', 'short_wavy', 'parted'] as const,
      'bob'
    ),
    hairColor: safeHex(raw?.hairColor, '#3A2E2B'),
    skinTone: safeHex(raw?.skinTone, '#F3D4BE'),
    topType: sanitizeEnum(
      String(raw?.topType ?? ''),
      ['cardigan', 'hoodie', 'jacket', 'sweater'] as const,
      'cardigan'
    ),
    outfitColor: safeHex(raw?.outfitColor, defaultColor),
    accentColor: safeHex(raw?.accentColor, '#5B7C78'),
    glasses: Boolean(raw?.glasses),
  };
}

function normalizeExactExpressions(
  line: string,
  expressions: ExpressionInput[]
): { line: string; matchedExpressions: string[]; matchedMovies: string[] } {
  let updated = line.trim();
  const matchedExpressions: string[] = [];
  const movieSet = new Set<string>();

  for (const item of expressions) {
    const expr = item.expression.trim();
    if (!expr) continue;
    const escaped = expr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    if (regex.test(updated)) {
      // Replace case-insensitive match with the exact spelling the student typed
      updated = updated.replace(regex, expr);
      matchedExpressions.push(expr);
      if (item.movie.trim()) movieSet.add(item.movie.trim());
    }
  }

  return {
    line: updated,
    matchedExpressions,
    matchedMovies: Array.from(movieSet),
  };
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // 1. Generate complete 4-beat storyboard (free-tier gemini-4-hydrogen)
  app.post('/api/storyboard/generate', async (req, res) => {
    try {
      const { expressions, scene } = req.body as {
        expressions?: ExpressionInput[];
        scene?: SceneInput;
      };

      if (!Array.isArray(expressions) || expressions.length < 5) {
        return res.status(400).json({
          error: 'Please provide at least 5 English expressions.',
        });
      }

      const cleanExpressions = expressions
        .map((e) => ({
          id: String(e.id || ''),
          expression: String(e.expression || '').trim(),
          meaningKo: String(e.meaningKo || '').trim(),
          movie: String(e.movie || '').trim(),
        }))
        .filter((e) => e.expression.length > 0 && e.movie.length > 0);

      const uniqueMovies = new Set(cleanExpressions.map((e) => e.movie.toLowerCase()));
      if (cleanExpressions.length < 5 || uniqueMovies.size < 2) {
        return res.status(400).json({
          error: 'At least 5 expressions from 2 or more different movies are required.',
        });
      }

      const place = String(scene?.place || 'Sunlit university campus café').trim();
      const characters = String(scene?.characters || 'Minji and Jiwon, two university friends').trim();
      const situation = String(scene?.situation || 'Preparing for an English presentation together').trim();
      const style = String(scene?.style || '2d-animation').trim();

      const ai = getGeminiClient();

      const exprListText = cleanExpressions
        .map(
          (e, i) =>
            `${i + 1}. "${e.expression}" (Korean meaning: ${e.meaningKo || 'everyday phrase'} | Movie: ${e.movie})`
        )
        .join('\n');

      const systemInstruction = `You are a friendly short-film scriptwriter for Korean university students learning everyday English.
Write a heartwarming, family-friendly 30-second animated short-film storyboard split into exactly 4 beats:
- Beat 1 (0~7s): Hook
- Beat 2 (7~15s): Problem
- Beat 3 (15~23s): Turn
- Beat 4 (23~30s): Close

STRICT RULES:
1. You MUST include EVERY single expression from the user's list EXACTLY as typed (verbatim substring, exact punctuation and words) distributed naturally across the 4 beats' englishLine fields. Never drop or paraphrase an expression.
2. Total English word count across ALL FOUR beats' englishLine combined MUST be between 60 and 70 words (aim for ~65 words total, roughly 15–18 words per beat). Count carefully!
3. Do NOT include character name prefixes (like "Minji:") inside englishLine — englishLine is spoken directly as voiceover/dialogue and burned-in subtitles.
4. Keep the story 100% family-friendly. NEVER use real people, celebrities, copyrighted movie characters, brand logos, or copyrighted music. Only original everyday college student characters.
5. Design a consistent Character Bible (Character A and Character B) whose outfits, hair, and calm colors stay identical across all 4 beats, matching the user's character description and setting.`;

      const prompt = `Create the 4-beat 30-second storyboard for this scene:
- Place: ${place}
- Characters: ${characters}
- Situation: ${situation}
- Visual Style: ${style}

Required Expressions (use EVERY SINGLE ONE verbatim across the 4 beats):
${exprListText}

Remember:
- Exactly 4 beats (beatNumber 1, 2, 3, 4).
- Combined word count of the 4 englishLine strings must be strictly between 60 and 70 words.
- Keep characters, outfits, and setting completely consistent across all 4 beats.
- Alternate speaker ("A" and "B") naturally like a warm short dialogue.`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: storyboardResponseSchema,
          },
        })
      );

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Gemini returned an empty storyboard response. Please try again.');
      }

      const parsed = JSON.parse(rawText);
      const rawBeats = Array.isArray(parsed.beats) ? parsed.beats.slice(0, 4) : [];
      if (rawBeats.length < 4) {
        throw new Error('Incomplete storyboard generated. Please try again.');
      }

      const formattedBeats = BEAT_META.map((meta, idx) => {
        const rb = rawBeats[idx] || {};
        const norm = normalizeExactExpressions(String(rb.englishLine || ''), cleanExpressions);
        return {
          ...meta,
          sceneDescription: String(rb.sceneDescription || '').trim(),
          englishLine: norm.line,
          speaker: rb.speaker === 'B' ? 'B' : 'A',
          usedExpressions: norm.matchedExpressions,
          sourceMovies: norm.matchedMovies,
          visualDirection: sanitizeVisualDirection(rb.visualDirection),
        };
      });

      const cb = parsed.characterBible || {};
      const storyboard = {
        title: String(parsed.title || 'A Bright Campus Moment').trim(),
        characterBible: {
          characterA: sanitizeCharacter(cb.characterA, 'Minji', '#EAE1CF'),
          characterB: sanitizeCharacter(cb.characterB, 'Jiwon', '#8DA89C'),
          settingType: sanitizeEnum(
            String(cb.settingType ?? ''),
            ['cafe', 'library', 'rooftop', 'campus_park', 'dorm_studio'] as const,
            'cafe'
          ),
          paletteMood: sanitizeEnum(
            String(cb.paletteMood ?? ''),
            ['morning_sage', 'golden_afternoon', 'twilight_calm', 'rainy_cozy'] as const,
            'golden_afternoon'
          ),
          colorNotes: String(
            cb.colorNotes || 'Soft cream, sage green, and warm afternoon sunlight kept consistent across all four beats.'
          ).trim(),
        },
        beats: formattedBeats,
      };

      res.json({ storyboard });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 2. Regenerate a single beat while keeping story continuity (free-tier gemini-4-hydrogen)
  app.post('/api/storyboard/regenerate-beat', async (req, res) => {
    try {
      const { beatIndex, expressions, scene, currentStoryboard, customNote } = req.body as {
        beatIndex?: number;
        expressions?: ExpressionInput[];
        scene?: SceneInput;
        currentStoryboard?: {
          title: string;
          beats: Array<{
            beatNumber: number;
            beatName: string;
            timeRangeEn: string;
            sceneDescription: string;
            englishLine: string;
            speaker: 'A' | 'B';
            usedExpressions: string[];
          }>;
        };
        customNote?: string;
      };

      if (typeof beatIndex !== 'number' || beatIndex < 0 || beatIndex > 3 || !currentStoryboard) {
        return res.status(400).json({ error: 'Invalid beat index or missing storyboard.' });
      }

      const cleanExpressions = (expressions || [])
        .map((e) => ({
          id: String(e.id || ''),
          expression: String(e.expression || '').trim(),
          meaningKo: String(e.meaningKo || '').trim(),
          movie: String(e.movie || '').trim(),
        }))
        .filter((e) => e.expression.length > 0);

      const otherBeats = currentStoryboard.beats.filter((_, i) => i !== beatIndex);
      const otherWords = otherBeats
        .map((b) => b.englishLine.trim().split(/\s+/).filter(Boolean).length)
        .reduce((a, b) => a + b, 0);

      const targetBeatWords = Math.max(11, Math.min(22, 65 - otherWords));
      const targetMeta = BEAT_META[beatIndex];
      const targetBeat = currentStoryboard.beats[beatIndex];

      // Expressions currently missing from the other 3 beats MUST appear in this beat
      const otherTextLower = otherBeats.map((b) => b.englishLine.toLowerCase()).join(' ');
      const mustInclude = cleanExpressions.filter(
        (e) => !otherTextLower.includes(e.expression.toLowerCase())
      );

      const ai = getGeminiClient();

      const prompt = `Regenerate ONLY Beat ${targetMeta.beatNumber} (${targetMeta.timeRangeEn} · ${targetMeta.beatName}) for this 30-second English learning short film.

Film Context:
- Title: ${currentStoryboard.title}
- Place: ${scene?.place || 'Campus café'}
- Characters: ${scene?.characters || 'Two university friends'}
- Situation: ${scene?.situation || 'Everyday college conversation'}

Current 4-Beat Storyboard:
${currentStoryboard.beats
  .map(
    (b, idx) =>
      `Beat ${b.beatNumber} (${b.timeRangeEn} ${b.beatName})${idx === beatIndex ? ' [REWRITE THIS BEAT]' : ''}:
  Scene: ${b.sceneDescription}
  Line (${b.speaker}): ${b.englishLine}`
  )
  .join('\n')}

REQUIRED EXPRESSIONS that MUST appear VERBATIM in this rewritten Beat ${targetMeta.beatNumber}:
${
  mustInclude.length > 0
    ? mustInclude.map((e) => `- "${e.expression}" (${e.movie})`).join('\n')
    : '(None strictly forced, feel free to naturally include one from the student list.)'
}

${customNote ? `Student's extra direction for this beat: ${customNote}` : ''}

STRICT RULES:
1. Aim for approximately ${targetBeatWords} words in englishLine so the 4-beat total stays between 60 and 70 words (the other 3 beats currently have ${otherWords} words).
2. Include every required expression verbatim with exact spelling and punctuation.
3. No character name prefix inside englishLine.
4. Keep the same characters, outfits, setting, and family-friendly tone (no celebrities, movie characters, or brands).
5. Give a fresh, natural alternative different from the previous version: "${targetBeat?.englishLine || ''}".`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction:
              'You are a friendly English-learning short-film writer. Rewrite only the requested beat cleanly as valid JSON.',
            responseMimeType: 'application/json',
            responseSchema: singleBeatResponseSchema,
          },
        })
      );

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Gemini returned an empty beat response. Please try again.');
      }

      const rb = JSON.parse(rawText);
      const norm = normalizeExactExpressions(String(rb.englishLine || ''), cleanExpressions);

      const updatedBeat = {
        ...targetMeta,
        sceneDescription: String(rb.sceneDescription || '').trim(),
        englishLine: norm.line,
        speaker: rb.speaker === 'B' ? 'B' : 'A',
        usedExpressions: norm.matchedExpressions,
        sourceMovies: norm.matchedMovies,
        visualDirection: sanitizeVisualDirection(rb.visualDirection),
      };

      res.json({ beat: updatedBeat });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 3. Generate natural English voice per beat (free-tier gemini-3.8-flash-lite-tts)
  app.post('/api/tts/beat', async (req, res) => {
    try {
      const { text, voiceName, stylePrompt } = req.body as {
        text?: string;
        voiceName?: string;
        stylePrompt?: string;
      };

      const cleanText = String(text || '').trim();
      if (!cleanText) {
        return res.status(400).json({ error: 'Text is required for voice generation.' });
      }

      const allowedVoices = ['Kore', 'Zephyr', 'Puck', 'Fenrir', 'Charon'];
      const chosenVoice = allowedVoices.includes(String(voiceName)) ? String(voiceName) : 'Kore';
      const chosenStyle =
        String(stylePrompt || '').trim() ||
        'Natural, warm, clearly articulated everyday English spoken by a friendly university student at a comfortable learning pace';

      const ai = getGeminiClient();

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanText,
                  speechMetadata: {
                    style: chosenStyle,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        })
      );

      const inlineData = response.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData?.data
      )?.inlineData;

      if (!inlineData?.data) {
        throw new Error('Gemini TTS did not return audio data. Please try again.');
      }

      res.json({
        audioBase64: inlineData.data,
        mimeType: inlineData.mimeType || 'audio/wav',
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Frontend serving (Vite dev middleware in dev, dist/ static files in production)
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CinePhrase server running at http://localhost:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start CinePhrase server:', err);
  process.exit(1);
});
