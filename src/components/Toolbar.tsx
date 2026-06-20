import type Konva from 'konva';
import type { MutableRefObject } from 'react';
import { exportStageAsPng } from '../lib/exportPng';
import { templateLabels } from '../lib/templates';
import { useMangaStore } from '../store/useMangaStore';
import type { TemplateId } from '../types/manga';

interface ToolbarProps {
  stageRef: MutableRefObject<Konva.Stage | null>;
}

const templateIds: TemplateId[] = ['twoVertical', 'fourStrip', 'fourGrid'];

export function Toolbar({ stageRef }: ToolbarProps) {
  const project = useMangaStore((state) => state.project);
  const page = project.pages.find((item) => item.id === project.activePageId) ?? project.pages[0];
  const setTemplate = useMangaStore((state) => state.setTemplate);
  const addImageToSelectedPanel = useMangaStore((state) => state.addImageToSelectedPanel);
  const addBubble = useMangaStore((state) => state.addBubble);
  const addFocusLines = useMangaStore((state) => state.addFocusLines);
  const undo = useMangaStore((state) => state.undo);
  const redo = useMangaStore((state) => state.redo);
  const saveCurrentProject = useMangaStore((state) => state.saveCurrentProject);
  const restoreLatestProject = useMangaStore((state) => state.restoreLatestProject);
  const canUndo = useMangaStore((state) => state.history.past.length > 0);
  const canRedo = useMangaStore((state) => state.history.future.length > 0);
  const status = useMangaStore((state) => state.status);

  return (
    <header className="toolbar">
      <div className="brand">
        <span>Manga Panel Editor</span>
        <small>1080 x 1536</small>
      </div>
      <div className="toolGroup segmented">
        {templateIds.map((templateId) => (
          <button
            key={templateId}
            type="button"
            className={page.templateId === templateId ? 'isActive' : ''}
            onClick={() => setTemplate(templateId)}
          >
            {templateLabels[templateId]}
          </button>
        ))}
      </div>
      <div className="toolGroup">
        <button type="button" onClick={addImageToSelectedPanel}>画像配置</button>
        <button type="button" onClick={addBubble}>吹き出し</button>
        <button type="button" onClick={addFocusLines}>集中線</button>
      </div>
      <div className="toolGroup">
        <button type="button" disabled={!canUndo} onClick={undo}>Undo</button>
        <button type="button" disabled={!canRedo} onClick={redo}>Redo</button>
      </div>
      <div className="toolGroup">
        <button type="button" onClick={() => void saveCurrentProject()}>保存</button>
        <button type="button" onClick={() => void restoreLatestProject()}>復元</button>
        <button type="button" className="primaryButton" onClick={() => exportStageAsPng(stageRef.current, 'manga-page.png')}>
          PNG
        </button>
      </div>
      <div className="statusText">{status}</div>
    </header>
  );
}
