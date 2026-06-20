import { nanoid } from 'nanoid';
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  type MangaPage,
  type Panel,
  type TemplateId
} from '../types/manga';

const margin = 48;
const gap = 28;

const panel = (name: string, x: number, y: number, width: number, height: number): Panel => ({
  id: nanoid(),
  name,
  x,
  y,
  width,
  height
});

export const templateLabels: Record<TemplateId, string> = {
  twoVertical: '2コマ縦割り',
  fourStrip: '4コマ縦',
  fourGrid: '2x2 4コマ'
};

export function createPanels(templateId: TemplateId): Panel[] {
  const contentWidth = PAGE_WIDTH - margin * 2;
  const contentHeight = PAGE_HEIGHT - margin * 2;

  if (templateId === 'twoVertical') {
    const width = (contentWidth - gap) / 2;
    return [
      panel('左', margin, margin, width, contentHeight),
      panel('右', margin + width + gap, margin, width, contentHeight)
    ];
  }

  if (templateId === 'fourStrip') {
    const height = (contentHeight - gap * 3) / 4;
    return Array.from({ length: 4 }, (_, index) =>
      panel(`${index + 1}`, margin, margin + (height + gap) * index, contentWidth, height)
    );
  }

  const width = (contentWidth - gap) / 2;
  const height = (contentHeight - gap) / 2;
  return [
    panel('左上', margin, margin, width, height),
    panel('右上', margin + width + gap, margin, width, height),
    panel('左下', margin, margin + height + gap, width, height),
    panel('右下', margin + width + gap, margin + height + gap, width, height)
  ];
}

export function createPage(templateId: TemplateId): MangaPage {
  return {
    id: nanoid(),
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    templateId,
    panels: createPanels(templateId),
    elements: []
  };
}
