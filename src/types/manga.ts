export const PAGE_WIDTH = 1080;
export const PAGE_HEIGHT = 1536;

export type TemplateId = 'twoVertical' | 'fourStrip' | 'fourGrid';
export type PanelShape = 'rect' | 'ellipse' | 'slantLeft' | 'slantRight';
export type BubbleTailDirection = 'bottom' | 'top' | 'left' | 'right';
export type BubbleStyle = 'manga' | 'ellipse' | 'rounded' | 'cloud' | 'burst';

export interface MangaProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  pages: MangaPage[];
  activePageId: string;
}

export interface MangaPage {
  id: string;
  width: number;
  height: number;
  templateId: TemplateId;
  panels: Panel[];
  elements: MangaElement[];
}

export interface Panel {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: PanelShape;
  strokeWidth?: number;
}

export type MangaElement = ImageElement | BubbleElement | FocusLineElement;

export interface BaseElement {
  id: string;
  panelId: string;
  type: MangaElement['type'];
  name: string;
  locked?: boolean;
}

export interface ImageElement extends Omit<BaseElement, 'type'> {
  type: 'image';
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  crop: CropRect;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BubbleElement extends Omit<BaseElement, 'type'> {
  type: 'bubble';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  bubbleStyle?: BubbleStyle;
  tailDirection?: BubbleTailDirection;
  tailX: number;
  tailY: number;
  strokeWidth?: number;
  strokeVariance?: number;
  roughSeed?: number;
  fill: string;
  stroke: string;
}

export interface FocusLineElement extends Omit<BaseElement, 'type'> {
  type: 'focusLines';
  x: number;
  y: number;
  count: number;
  innerRadius: number;
  outerRadius: number;
  strokeWidth: number;
  seed: number;
  color: string;
}

export interface ImageAssetMeta {
  id: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
}
