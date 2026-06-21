export type NameCameraPreset = 'wide' | 'close' | 'low' | 'high' | 'overShoulder';
export type NameActorPose =
  | 'standing'
  | 'contrapposto'
  | 'talking'
  | 'pointing'
  | 'thinking'
  | 'sitting'
  | 'walking'
  | 'running'
  | 'lookingBack'
  | 'reaching'
  | 'surprised';

export interface NameActor {
  id: string;
  name: string;
  x: number;
  z: number;
  rotationY: number;
  scale: number;
  pose: NameActorPose;
}

export interface NameBubble {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NameScene {
  title: string;
  cameraPreset: NameCameraPreset;
  shotType: string;
  cameraAngle: string;
  mood: string;
  compositionNote: string;
  aiPrompt: string;
  actors: NameActor[];
  bubbles: NameBubble[];
}

export interface AiNameInputPackage {
  version: 1;
  scene: NameScene;
  prompt: string;
  referenceImageNote: string;
}
