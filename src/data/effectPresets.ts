import type { EffectCandidate } from "../types/legacy";

export const inkOpenGestureEffects: EffectCandidate[] = [
  {
    id: "ink-bloom",
    label: "Ink Bloom",
    cnLabel: "墨汁绽开",
    category: "Spread / Diffusion",
    description: "The ink opens from the center like a drop blooming in water.",
    mapping: {
      gesture_openness: "controls bloom radius",
      gesture_speed: "controls diffusion speed",
      gesture_amplitude: "controls spread range",
      gesture_softness: "controls edge feathering",
    },
    recommended: true,
  },
  {
    id: "soft-diffusion",
    label: "Soft Diffusion",
    cnLabel: "柔性晕染",
    category: "Spread / Diffusion",
    description: "The ink softly diffuses outward with fading edges.",
    mapping: {
      gesture_speed: "controls diffusion rate",
      gesture_amplitude: "controls blur radius",
      gesture_force: "controls density falloff",
    },
  },
  {
    id: "petal-expansion",
    label: "Petal-like Expansion",
    cnLabel: "花瓣式展开",
    category: "Transform / Morph",
    description:
      "The ink mass opens in layered folds, like petals slowly spreading in water.",
    mapping: {
      gesture_path: "controls petal direction",
      gesture_pause: "creates layered delay",
      gesture_amplitude: "controls petal spread",
    },
  },
  {
    id: "ripple-expansion",
    label: "Ripple Expansion",
    cnLabel: "涟漪式扩散",
    category: "Spread / Diffusion",
    description: "The gesture creates circular waves that carry the ink outward.",
    mapping: {
      gesture_center: "defines ripple origin",
      gesture_speed: "controls wave interval",
      gesture_force: "controls ripple intensity",
    },
  },
];

export const effectLibrary = [
  {
    category: "Category A: Spread / Diffusion 扩散类",
    presets: [
      "Ink Bloom / 墨汁绽开",
      "Smoke Diffusion / 烟雾散开",
      "Light Burst / 光晕扩张",
      "Particle Scatter / 粒子散射",
      "Crowd Dispersal / 群体散开",
      "Flower Bloom / 花朵盛开",
      "Ripple Expansion / 涟漪扩散",
    ],
  },
  {
    category: "Category B: Gather / Absorb 聚拢类",
    presets: [
      "Ink Recollection / 墨色回聚",
      "Smoke Condensation / 烟雾凝结",
      "Particle Attraction / 粒子吸附",
      "Energy Absorption / 能量吸入",
      "Crowd Gathering / 人群聚拢",
      "Gravity Pull / 重力牵引",
    ],
  },
  {
    category: "Category C: Flow / Drag 流动牵引类",
    presets: [
      "Ink Trail / 墨迹拖尾",
      "Fluid Drag / 流体牵引",
      "Ribbon Flow / 丝带流动",
      "Smoke Trail / 烟雾尾迹",
      "Camera Glide / 镜头滑动",
      "Light Stroke / 光迹划过",
    ],
  },
  {
    category: "Category D: Pulse / Rhythm 脉冲节奏类",
    presets: [
      "Breathing Pulse / 呼吸脉冲",
      "Heartbeat Glow / 心跳发光",
      "Wave Pulse / 波纹脉冲",
      "Rhythmic Flicker / 节奏闪烁",
      "Group Synchronization / 群体同步",
      "Vibration / 振动",
    ],
  },
  {
    category: "Category E: Transform / Morph 形变类",
    presets: [
      "Liquid Morph / 液态形变",
      "Stretch and Release / 拉伸回弹",
      "Twist Deformation / 扭转形变",
      "Blob Breathing / 团块呼吸",
      "Elastic Warp / 弹性扭曲",
      "Shape Melting / 形体融化",
    ],
  },
  {
    category: "Category F: Impact / Trigger 触发类",
    presets: [
      "Ink Drop Bloom / 墨滴绽放",
      "Spark Burst / 火花爆开",
      "Ripple Trigger / 涟漪触发",
      "Shockwave / 冲击波",
      "Scene Snap / 场景瞬切",
      "Camera Shake / 镜头震动",
    ],
  },
];
