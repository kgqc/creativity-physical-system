import type { MotionBrief } from "../types/legacy";

export const demoBriefText = `Scene:
A black ink cloud floats in water around a glowing red circular portal.

Target Objects:
- Ink Cloud
- Red Portal
- Background Particles
- Camera

Material:
liquid ink, smoke, soft particles, water diffusion

Mood:
ritualistic, slow, mysterious, poetic

Motion Intention:
The ink should expand outward like it is breathing, with soft hesitation and delayed diffusion.

Avoid:
mechanical rotation, uniform particle movement, sudden explosion`;

export const parsedDemoBrief: MotionBrief = {
  scene: "black ink cloud around glowing red portal",
  targets: ["ink cloud", "red portal", "background particles", "camera"],
  material: ["ink", "smoke", "liquid", "particles"],
  mood: ["ritualistic", "slow", "mysterious", "poetic"],
  motionIntention: "breathing-like expansion with delayed diffusion",
  negativeConstraints: [
    "mechanical rotation",
    "uniform particle movement",
    "sudden explosion",
  ],
};

export const initialCandidates = [
  {
    id: "candidate-a",
    title: "Slow Ink Diffusion",
    target: "Ink Cloud",
    mood: "poetic",
    mode: "soft-diffusion",
    description: "The ink softly spreads outward with feathered edges.",
    tags: ["ink", "slow", "soft", "poetic"],
  },
  {
    id: "candidate-b",
    title: "Spiral Ritual Expansion",
    target: "Ink Cloud",
    mood: "ritualistic",
    mode: "ink-bloom",
    description: "A slow outward spiral carries dense ink into the water.",
    tags: ["spiral", "ritual", "delayed", "organic"],
  },
  {
    id: "candidate-c",
    title: "Breathing Pulse",
    target: "Red Portal",
    mood: "mysterious",
    mode: "ripple-expansion",
    description: "The portal glow breathes while ink answers in soft waves.",
    tags: ["pulse", "glow", "wave", "slow"],
  },
] as const;
