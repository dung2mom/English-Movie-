import { ExpressionItem, SceneConfig, VisualStyleId } from '../types';

export interface MovieBankItem {
  expression: string;
  meaningKo: string;
  movie: string;
}

export const MOVIE_EXPRESSION_BANK: MovieBankItem[] = [
  // Inside Out 2
  {
    expression: "I've got butterflies (in my stomach)",
    meaningKo: '긴장돼서 떨려',
    movie: 'Inside Out 2',
  },
  {
    expression: 'freak out',
    meaningKo: '패닉에 빠지다, 기겁하다',
    movie: 'Inside Out 2',
  },
  {
    expression: "You've got this.",
    meaningKo: '넌 할 수 있어',
    movie: 'Inside Out 2',
  },
  {
    expression: 'be hard on yourself',
    meaningKo: '자신을 너무 몰아붙이다',
    movie: 'Inside Out 2',
  },
  {
    expression: "I'm over the moon.",
    meaningKo: '너무 기뻐',
    movie: 'Inside Out 2',
  },
  // Notting Hill
  {
    expression: 'change my mind',
    meaningKo: '마음을 바꾸다',
    movie: 'Notting Hill',
  },
  {
    expression: 'kill two birds with one stone',
    meaningKo: '일석이조',
    movie: 'Notting Hill',
  },
  {
    expression: 'Whoopsidaisies!',
    meaningKo: '아이쿠! (실수했을 때 쓰는 장난스러운 말)',
    movie: 'Notting Hill',
  },
  {
    expression: 'a vicious circle',
    meaningKo: '악순환',
    movie: 'Notting Hill',
  },
  // Minari
  {
    expression: 'make ends meet',
    meaningKo: '겨우 먹고살다, 생활비를 감당하다',
    movie: 'Minari',
  },
  {
    expression: 'start from scratch',
    meaningKo: '처음부터 시작하다',
    movie: 'Minari',
  },
  {
    expression: 'put down roots',
    meaningKo: '자리를 잡다, 정착하다',
    movie: 'Minari',
  },
  {
    expression: 'bittersweet',
    meaningKo: '씁쓸하면서도 달콤한',
    movie: 'Minari',
  },
];

export const DEFAULT_EXPRESSIONS: ExpressionItem[] = [
  {
    id: 'exp-1',
    expression: "I've got butterflies",
    meaningKo: '긴장돼서 떨려',
    movie: 'Inside Out 2',
  },
  {
    id: 'exp-2',
    expression: 'freak out',
    meaningKo: '패닉에 빠지다, 기겁하다',
    movie: 'Inside Out 2',
  },
  {
    id: 'exp-3',
    expression: 'Whoopsidaisies!',
    meaningKo: '아이쿠! (실수했을 때 쓰는 장난스러운 말)',
    movie: 'Notting Hill',
  },
  {
    id: 'exp-4',
    expression: 'start from scratch',
    meaningKo: '처음부터 시작하다',
    movie: 'Minari',
  },
  {
    id: 'exp-5',
    expression: "You've got this.",
    meaningKo: '넌 할 수 있어',
    movie: 'Inside Out 2',
  },
  {
    id: 'exp-6',
    expression: "I'm over the moon.",
    meaningKo: '너무 기뻐',
    movie: 'Inside Out 2',
  },
];

export const STYLE_OPTIONS: Array<{
  id: VisualStyleId;
  label: string;
  labelKo: string;
  description: string;
  imageUrl: string;
  fallbackGradient: string;
}> = [
  {
    id: '2d-animation',
    label: '2D Animation',
    labelKo: '2D 애니메이션',
    description: 'Clean studio ink lines, warm cel shading, and expressive movement.',
    imageUrl: '/src/assets/images/style_2d_animation_1795579974486.jpg',
    fallbackGradient: 'from-[#E6EFEA] to-[#D4E4DF]',
  },
  {
    id: 'clay',
    label: 'Clay',
    labelKo: '클레이 스톱모션',
    description: 'Handcrafted matte clay textures with charming stop-motion cadence.',
    imageUrl: '/src/assets/images/style_clay_1795579975400.jpg',
    fallbackGradient: 'from-[#EFEAE2] to-[#E2D5C3]',
  },
  {
    id: 'watercolor',
    label: 'Watercolor',
    labelKo: '수채화 일러스트',
    description: 'Soft cold-press paper washes, pastel blooms, and gentle pencil lines.',
    imageUrl: '/src/assets/images/style_watercolor_1795579978051.jpg',
    fallbackGradient: 'from-[#E9EFF4] to-[#DCE8E4]',
  },
  {
    id: 'live-action',
    label: 'Live-Action Style',
    labelKo: '실사 감성 필름',
    description: 'Calm indie campus cinema grading with soft window bokeh and depth.',
    imageUrl: '/src/assets/images/style_live_action_1795579977161.jpg',
    fallbackGradient: 'from-[#E5E8EC] to-[#D6DCE2]',
  },
];

export const PLACE_PRESETS = [
  'Sunlit campus café with wooden tables and wide windows',
  'Quiet university library study lounge in the afternoon',
  'Campus rooftop terrace during calm golden hour',
  'Green campus courtyard bench surrounded by trees',
];

export const CHARACTER_PRESETS = [
  'Minji (cream knit cardigan, warm brown hair) & Jiwon (sage hoodie, round glasses)',
  'Sora (soft denim jacket, ponytail) & Haneul (oatmeal sweater, short wavy hair)',
  'Yuna (olive cardigan, shoulder bob) & Dojin (navy jacket, neat parted hair)',
];

export const SITUATION_PRESETS = [
  'Rehearsing for a big English class presentation right before going on stage',
  'Spilling notes while planning a new student film club from the beginning',
  'Balancing a part-time café shift and midterm prep while cheering each other up',
];

export const DEFAULT_SCENE: SceneConfig = {
  place: PLACE_PRESETS[0],
  characters: CHARACTER_PRESETS[0],
  situation: SITUATION_PRESETS[0],
  style: '2d-animation',
  creatorName: 'Minji Kim',
  voiceA: 'Kore',
  voiceB: 'Puck',
};

export const VOICE_OPTIONS: Array<{
  id: 'Kore' | 'Zephyr' | 'Puck' | 'Fenrir' | 'Charon';
  label: string;
  tone: string;
}> = [
  { id: 'Kore', label: 'Kore', tone: 'Warm & clear' },
  { id: 'Zephyr', label: 'Zephyr', tone: 'Bright & gentle' },
  { id: 'Puck', label: 'Puck', tone: 'Friendly & lively' },
  { id: 'Fenrir', label: 'Fenrir', tone: 'Calm & steady' },
  { id: 'Charon', label: 'Charon', tone: 'Soft & relaxed' },
];
