import type { CropRect, Panel } from '../types/manga';

export function coverCrop(imageWidth: number, imageHeight: number, targetWidth: number, targetHeight: number): CropRect {
  const imageAspect = imageWidth / imageHeight;
  const targetAspect = targetWidth / targetHeight;

  if (imageAspect > targetAspect) {
    const width = imageHeight * targetAspect;
    return {
      x: (imageWidth - width) / 2,
      y: 0,
      width,
      height: imageHeight
    };
  }

  const height = imageWidth / targetAspect;
  return {
    x: 0,
    y: (imageHeight - height) / 2,
    width: imageWidth,
    height
  };
}

export function clampCrop(crop: CropRect, imageWidth: number, imageHeight: number): CropRect {
  const width = Math.max(1, Math.min(crop.width, imageWidth));
  const height = Math.max(1, Math.min(crop.height, imageHeight));
  return {
    x: Math.max(0, Math.min(crop.x, imageWidth - width)),
    y: Math.max(0, Math.min(crop.y, imageHeight - height)),
    width,
    height
  };
}

export function panelCenter(panel: Panel): { x: number; y: number } {
  return {
    x: panel.x + panel.width / 2,
    y: panel.y + panel.height / 2
  };
}
