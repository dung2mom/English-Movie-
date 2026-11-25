export type VisualStyleId =
  | '2d-animation'
  | 'clay'
  | 'watercolor'
  | 'live-action';

export type StepId = 'input' | 'scene' | 'storyboard' | 'video' | 'final';

export interface ExpressionItem {
  id: string;
  expression: string;
  meaningKo: string;
  movie: string;
}

export interface SceneConfig {
  place: string;
  characters: string;
  situation: string;
  style: VisualStyleId;
  creatorName: string;
  voiceA: 'Kore' | 'Zephyr' | 'Puck' | 'Fenrir' | 'Charon';
  voiceB: 'Kore' | 'Zephyr' | 'Puck' | 'Fenrir' | 'Charon';
}

export interface CharacterAppearance {
  name: string;
  role: string;
  hairStyle: 'bob' | 'ponytail' | 'short_wavy' | 'parted';
  hairColor: string;
  skinTone: string;
  topType: 'cardigan' | 'hoodie' | 'jacket' | 'sweater';
  outfitColor: string;
  accentColor: string;
  glasses: boolean;
}

export interface CharacterBible {
  characterA: CharacterAppearance;
  characterB: CharacterAppearance;
  settingType: 'cafe' | 'library' | 'rooftop' | 'campus_park' | 'dorm_studio';
  paletteMood: 'morning_sage' | 'golden_afternoon' | 'twilight_calm' | 'rainy_cozy';
  colorNotes: string;
}

export interface BeatVisualDirection {
  cameraShot: 'wide_two_shot' | 'medium_two_shot' | 'close_up_A' | 'close_up_B';
  cameraMove: 'slow_push_in' | 'gentle_pan_right' | 'gentle_pan_left' | 'pull_back_warm';
  emotionA: 'nervous' | 'surprised' | 'determined' | 'encouraging' | 'relieved' | 'overjoyed' | 'thoughtful' | 'laughing';
  emotionB: 'nervous' | 'surprised' | 'determined' | 'encouraging' | 'relieved' | 'overjoyed' | 'thoughtful' | 'laughing';
  poseA: 'holding_mug' | 'checking_notes' | 'hands_on_head' | 'patting_shoulder' | 'high_five' | 'pointing_up' | 'breathing_deep' | 'waving';
  poseB: 'holding_mug' | 'checking_notes' | 'hands_on_head' | 'patting_shoulder' | 'high_five' | 'pointing_up' | 'breathing_deep' | 'waving';
  propEffect: 'butterflies' | 'steam' | 'sweat_drop' | 'lightbulb' | 'sparkles' | 'leaves' | 'notes' | 'warm_rays';
}

export interface StoryboardBeat {
  id: string;
  beatNumber: number; // 1..4
  timeRange: string; // e.g. "0~7초"
  timeRangeEn: string; // e.g. "0–7s"
  startSec: number;
  endSec: number;
  durationSec: number;
  beatName: 'Hook' | 'Problem' | 'Turn' | 'Close';
  sceneDescription: string;
  englishLine: string;
  speaker: 'A' | 'B';
  usedExpressions: string[];
  sourceMovies: string[];
  visualDirection: BeatVisualDirection;
}

export interface StoryboardData {
  title: string;
  characterBible: CharacterBible;
  beats: StoryboardBeat[];
}

export interface BeatAudioClip {
  beatId: string;
  audioBase64: string;
  mimeType: string;
  audioUrl: string;
  durationSec: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
}
