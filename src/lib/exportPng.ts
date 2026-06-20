import type Konva from 'konva';

export function exportStageAsPng(stage: Konva.Stage | null, filename: string): void {
  if (!stage) {
    return;
  }

  const dataUrl = stage.toDataURL({
    mimeType: 'image/png',
    pixelRatio: 1
  });

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
