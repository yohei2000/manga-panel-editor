import { useMemo } from 'react';
import { useMangaStore } from '../store/useMangaStore';
import type { BubbleElement, BubbleStyle, BubbleTailDirection, FocusLineElement, ImageElement, MangaElement, Panel, PanelShape } from '../types/manga';

function NumberField({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? Number(value.toFixed(2)) : 0}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field fieldFull">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (value: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const panelShapeOptions: Array<{ value: PanelShape; label: string }> = [
  { value: 'rect', label: '四角' },
  { value: 'ellipse', label: '楕円' },
  { value: 'slantLeft', label: '斜め左' },
  { value: 'slantRight', label: '斜め右' }
];

const bubbleTailDirectionOptions: Array<{ value: BubbleTailDirection; label: string }> = [
  { value: 'bottom', label: '下' },
  { value: 'top', label: '上' },
  { value: 'left', label: '左' },
  { value: 'right', label: '右' }
];

const bubbleStyleOptions: Array<{ value: BubbleStyle; label: string }> = [
  { value: 'manga', label: '漫画手描き' },
  { value: 'ellipse', label: '丸' },
  { value: 'rounded', label: '角丸' },
  { value: 'cloud', label: '思考' },
  { value: 'burst', label: '叫び' }
];

function bubbleTailPreset(element: BubbleElement, tailDirection: BubbleTailDirection): Pick<BubbleElement, 'tailDirection' | 'tailX' | 'tailY'> {
  if (tailDirection === 'top') {
    return { tailDirection, tailX: element.width * 0.42, tailY: -64 };
  }
  if (tailDirection === 'left') {
    return { tailDirection, tailX: -64, tailY: element.height * 0.56 };
  }
  if (tailDirection === 'right') {
    return { tailDirection, tailX: element.width + 64, tailY: element.height * 0.44 };
  }
  return { tailDirection, tailX: element.width * 0.58, tailY: element.height + 64 };
}

function normalizedBubbleStyle(style: BubbleElement['bubbleStyle'] | string | undefined): BubbleStyle {
  if (style === 'handDrawn') {
    return 'manga';
  }
  return (style as BubbleStyle | undefined) ?? 'ellipse';
}

function ImageInspector({ element }: { element: ImageElement }) {
  const assets = useMangaStore((state) => state.assets);
  const updateElement = useMangaStore((state) => state.updateElement);
  const asset = assets.find((item) => item.id === element.assetId);

  return (
    <>
      <p className="metaLine">{asset ? `${asset.name} / ${asset.width}x${asset.height}` : element.assetId}</p>
      <div className="fieldGrid">
        <NumberField label="X" value={element.x} onChange={(x) => updateElement<ImageElement>(element.id, { x })} />
        <NumberField label="Y" value={element.y} onChange={(y) => updateElement<ImageElement>(element.id, { y })} />
        <NumberField label="幅" value={element.width} min={1} onChange={(width) => updateElement<ImageElement>(element.id, { width })} />
        <NumberField label="高さ" value={element.height} min={1} onChange={(height) => updateElement<ImageElement>(element.id, { height })} />
        <NumberField label="回転" value={element.rotation} onChange={(rotation) => updateElement<ImageElement>(element.id, { rotation })} />
        <NumberField label="透明度" value={element.opacity} min={0} max={1} step={0.05} onChange={(opacity) => updateElement<ImageElement>(element.id, { opacity })} />
        <NumberField label="crop X" value={element.crop.x} min={0} onChange={(x) => updateElement<ImageElement>(element.id, { crop: { ...element.crop, x } })} />
        <NumberField label="crop Y" value={element.crop.y} min={0} onChange={(y) => updateElement<ImageElement>(element.id, { crop: { ...element.crop, y } })} />
        <NumberField label="crop 幅" value={element.crop.width} min={1} onChange={(width) => updateElement<ImageElement>(element.id, { crop: { ...element.crop, width } })} />
        <NumberField label="crop 高さ" value={element.crop.height} min={1} onChange={(height) => updateElement<ImageElement>(element.id, { crop: { ...element.crop, height } })} />
      </div>
    </>
  );
}

function BubbleInspector({ element }: { element: BubbleElement }) {
  const updateElement = useMangaStore((state) => state.updateElement);
  return (
    <>
      <TextField label="テキスト" value={element.text} onChange={(text) => updateElement<BubbleElement>(element.id, { text })} />
      <div className="fieldGrid">
        <NumberField label="X" value={element.x} onChange={(x) => updateElement<BubbleElement>(element.id, { x })} />
        <NumberField label="Y" value={element.y} onChange={(y) => updateElement<BubbleElement>(element.id, { y })} />
        <NumberField label="幅" value={element.width} min={40} onChange={(width) => updateElement<BubbleElement>(element.id, { width })} />
        <NumberField label="高さ" value={element.height} min={40} onChange={(height) => updateElement<BubbleElement>(element.id, { height })} />
        <NumberField label="文字" value={element.fontSize} min={8} onChange={(fontSize) => updateElement<BubbleElement>(element.id, { fontSize })} />
        <SelectField
          label="スタイル"
          value={normalizedBubbleStyle(element.bubbleStyle)}
          options={bubbleStyleOptions}
          onChange={(bubbleStyle) => updateElement<BubbleElement>(element.id, { bubbleStyle })}
        />
        <NumberField label="線幅" value={element.strokeWidth ?? 3} min={1} max={16} step={0.5} onChange={(strokeWidth) => updateElement<BubbleElement>(element.id, { strokeWidth })} />
        <NumberField label="筆圧ゆらぎ" value={element.strokeVariance ?? 0.7} min={0} max={1.4} step={0.05} onChange={(strokeVariance) => updateElement<BubbleElement>(element.id, { strokeVariance })} />
        <SelectField
          label="しっぽ方向"
          value={element.tailDirection ?? 'bottom'}
          options={bubbleTailDirectionOptions}
          onChange={(tailDirection) => updateElement<BubbleElement>(element.id, bubbleTailPreset(element, tailDirection))}
        />
        <NumberField label="しっぽX" value={element.tailX} onChange={(tailX) => updateElement<BubbleElement>(element.id, { tailX })} />
        <NumberField label="しっぽY" value={element.tailY} onChange={(tailY) => updateElement<BubbleElement>(element.id, { tailY })} />
        <ColorField label="塗り" value={element.fill} onChange={(fill) => updateElement<BubbleElement>(element.id, { fill })} />
        <ColorField label="線" value={element.stroke} onChange={(stroke) => updateElement<BubbleElement>(element.id, { stroke })} />
      </div>
    </>
  );
}

function FocusLinesInspector({ element }: { element: FocusLineElement }) {
  const updateElement = useMangaStore((state) => state.updateElement);
  return (
    <div className="fieldGrid">
      <NumberField label="中心X" value={element.x} onChange={(x) => updateElement<FocusLineElement>(element.id, { x })} />
      <NumberField label="中心Y" value={element.y} onChange={(y) => updateElement<FocusLineElement>(element.id, { y })} />
      <NumberField label="本数" value={element.count} min={1} onChange={(count) => updateElement<FocusLineElement>(element.id, { count })} />
      <NumberField label="内径" value={element.innerRadius} min={1} onChange={(innerRadius) => updateElement<FocusLineElement>(element.id, { innerRadius })} />
      <NumberField label="外径" value={element.outerRadius} min={1} onChange={(outerRadius) => updateElement<FocusLineElement>(element.id, { outerRadius })} />
      <NumberField label="太さ" value={element.strokeWidth} min={1} onChange={(strokeWidth) => updateElement<FocusLineElement>(element.id, { strokeWidth })} />
      <NumberField label="seed" value={element.seed} onChange={(seed) => updateElement<FocusLineElement>(element.id, { seed })} />
      <ColorField label="色" value={element.color} onChange={(color) => updateElement<FocusLineElement>(element.id, { color })} />
    </div>
  );
}

function PanelInspector({ panel }: { panel: Panel }) {
  const updatePanel = useMangaStore((state) => state.updatePanel);
  return (
    <div className="fieldGrid">
      <NumberField label="X" value={panel.x} min={0} onChange={(x) => updatePanel(panel.id, { x })} />
      <NumberField label="Y" value={panel.y} min={0} onChange={(y) => updatePanel(panel.id, { y })} />
      <NumberField label="幅" value={panel.width} min={80} onChange={(width) => updatePanel(panel.id, { width })} />
      <NumberField label="高さ" value={panel.height} min={80} onChange={(height) => updatePanel(panel.id, { height })} />
      <NumberField label="線幅" value={panel.strokeWidth ?? 3} min={1} max={16} step={0.5} onChange={(strokeWidth) => updatePanel(panel.id, { strokeWidth })} />
      <SelectField
        label="形"
        value={panel.shape ?? 'rect'}
        options={panelShapeOptions}
        onChange={(shape) => updatePanel(panel.id, { shape })}
      />
    </div>
  );
}

function ElementInspector({ element }: { element: MangaElement }) {
  if (element.type === 'image') {
    return <ImageInspector element={element} />;
  }
  if (element.type === 'bubble') {
    return <BubbleInspector element={element} />;
  }
  return <FocusLinesInspector element={element} />;
}

export function Inspector() {
  const project = useMangaStore((state) => state.project);
  const selectedElementId = useMangaStore((state) => state.selectedElementId);
  const selectedPanelId = useMangaStore((state) => state.selectedPanelId);
  const deleteSelected = useMangaStore((state) => state.deleteSelected);
  const page = project.pages.find((item) => item.id === project.activePageId) ?? project.pages[0];
  const selectedElement = useMemo(
    () => page.elements.find((element) => element.id === selectedElementId) ?? null,
    [page.elements, selectedElementId]
  );
  const selectedPanel = page.panels.find((panel) => panel.id === selectedPanelId) ?? null;

  return (
    <aside className="inspector">
      <div className="sectionHeader">
        <h2>Inspector</h2>
        {selectedElement && (
          <button type="button" className="dangerButton" onClick={deleteSelected}>
            削除
          </button>
        )}
      </div>
      {selectedElement ? (
        <>
          <h3>{selectedElement.name}</h3>
          <ElementInspector element={selectedElement} />
        </>
      ) : selectedPanel ? (
        <>
          <h3>{selectedPanel.name}</h3>
          <PanelInspector panel={selectedPanel} />
        </>
      ) : (
        <p className="emptyState">コマまたはオブジェクトを選択</p>
      )}
    </aside>
  );
}
