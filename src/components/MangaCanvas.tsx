import type Konva from 'konva';
import { type MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  Ellipse,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text
} from 'react-konva';
import { buildFocusLines } from '../lib/focusLines';
import { useMangaStore } from '../store/useMangaStore';
import { PAGE_HEIGHT, PAGE_WIDTH, type BubbleElement, type FocusLineElement, type ImageElement, type MangaElement, type Panel } from '../types/manga';

interface MangaCanvasProps {
  stageRef: MutableRefObject<Konva.Stage | null>;
}

function useContainerScale() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return undefined;
    }

    const update = () => {
      const rect = node.getBoundingClientRect();
      const next = Math.min(rect.width / PAGE_WIDTH, Math.max(0.24, (rect.height - 24) / PAGE_HEIGHT), 0.78);
      setScale(Math.max(0.24, Number.isFinite(next) ? next : 0.5));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, scale };
}

function useAssetImage(assetId: string): HTMLImageElement | undefined {
  const url = useMangaStore((state) => state.assetUrls[assetId]);
  const [image, setImage] = useState<HTMLImageElement | undefined>();

  useEffect(() => {
    if (!url) {
      setImage(undefined);
      return undefined;
    }

    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
    return () => {
      img.onload = null;
    };
  }, [url]);

  return image;
}

function panelShape(panel: Panel) {
  return panel.shape ?? 'rect';
}

function panelSlantOffset(panel: Panel): number {
  return Math.min(92, panel.width * 0.18);
}

function panelPolygonPoints(panel: Panel): number[] {
  const offset = panelSlantOffset(panel);
  if (panelShape(panel) === 'slantLeft') {
    return [
      panel.x + offset,
      panel.y,
      panel.x + panel.width,
      panel.y,
      panel.x + panel.width - offset,
      panel.y + panel.height,
      panel.x,
      panel.y + panel.height
    ];
  }

  return [
    panel.x,
    panel.y,
    panel.x + panel.width - offset,
    panel.y,
    panel.x + panel.width,
    panel.y + panel.height,
    panel.x + offset,
    panel.y + panel.height
  ];
}

function drawPanelClip(context: Konva.Context, panel: Panel): void {
  const shape = panelShape(panel);
  context.beginPath();
  if (shape === 'ellipse') {
    context.ellipse(
      panel.x + panel.width / 2,
      panel.y + panel.height / 2,
      panel.width / 2,
      panel.height / 2,
      0,
      0,
      Math.PI * 2
    );
    context.closePath();
    return;
  }

  if (shape === 'slantLeft' || shape === 'slantRight') {
    const points = panelPolygonPoints(panel);
    context.moveTo(points[0], points[1]);
    for (let index = 2; index < points.length; index += 2) {
      context.lineTo(points[index], points[index + 1]);
    }
    context.closePath();
    return;
  }

  context.rect(panel.x, panel.y, panel.width, panel.height);
  context.closePath();
}

function bubbleTailPoints(element: BubbleElement): number[] {
  const direction = element.tailDirection ?? 'bottom';
  if (direction === 'top') {
    return [element.width * 0.42, element.height * 0.18, element.tailX, element.tailY, element.width * 0.58, element.height * 0.18];
  }
  if (direction === 'left') {
    return [element.width * 0.18, element.height * 0.42, element.tailX, element.tailY, element.width * 0.18, element.height * 0.58];
  }
  if (direction === 'right') {
    return [element.width * 0.82, element.height * 0.42, element.tailX, element.tailY, element.width * 0.82, element.height * 0.58];
  }
  return [element.width * 0.55, element.height * 0.78, element.tailX, element.tailY, element.width * 0.42, element.height * 0.82];
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash || 1;
}

function seededRandom(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function bubbleBodyPoints(element: BubbleElement, variant: 'cloud' | 'handDrawn'): number[] {
  const points: number[] = [];
  const count = variant === 'cloud' ? 72 : 56;
  const centerX = element.width / 2;
  const centerY = element.height / 2;
  const radiusX = element.width / 2;
  const radiusY = element.height / 2;
  const rand = seededRandom(element.roughSeed ?? hashString(element.id));

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const lobe = variant === 'cloud' ? 1 + Math.sin(angle * 10) * 0.1 + Math.sin(angle * 5) * 0.035 : 1;
    const rough = variant === 'handDrawn' ? 1 + (rand() - 0.5) * 0.12 : lobe;
    points.push(centerX + Math.cos(angle) * radiusX * rough, centerY + Math.sin(angle) * radiusY * rough);
  }

  return points;
}

function BubbleBody({ element }: { element: BubbleElement }) {
  const strokeWidth = element.strokeWidth ?? 3;
  const style = element.bubbleStyle ?? 'ellipse';

  if (style === 'rounded') {
    return (
      <Rect
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        cornerRadius={Math.min(42, element.width * 0.18, element.height * 0.28)}
        fill={element.fill}
        stroke={element.stroke}
        strokeWidth={strokeWidth}
      />
    );
  }

  if (style === 'cloud' || style === 'handDrawn') {
    const points = bubbleBodyPoints(element, style);
    return (
      <>
        <Line
          points={points}
          closed
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={strokeWidth}
          tension={0.38}
          lineJoin="round"
        />
        {style === 'handDrawn' && (
          <Line
            points={points.map((point, index) => point + (index % 2 === 0 ? 2 : -1))}
            closed
            stroke={element.stroke}
            strokeWidth={Math.max(1, strokeWidth * 0.55)}
            opacity={0.55}
            tension={0.38}
            lineJoin="round"
          />
        )}
      </>
    );
  }

  return (
    <Ellipse
      x={element.width / 2}
      y={element.height / 2}
      radiusX={element.width / 2}
      radiusY={element.height / 2}
      fill={element.fill}
      stroke={element.stroke}
      strokeWidth={strokeWidth}
    />
  );
}

function ImageNode({ element, selected }: { element: ImageElement; selected: boolean }) {
  const image = useAssetImage(element.assetId);
  const updateElement = useMangaStore((state) => state.updateElement);
  const selectElement = useMangaStore((state) => state.selectElement);

  return (
    <>
      <KonvaImage
        image={image}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        crop={element.crop}
        rotation={element.rotation}
        opacity={element.opacity}
        draggable
        onClick={(event) => {
          event.cancelBubble = true;
          selectElement(element.id);
        }}
        onTap={(event) => {
          event.cancelBubble = true;
          selectElement(element.id);
        }}
        onDragEnd={(event) => {
          updateElement<ImageElement>(element.id, {
            x: event.target.x(),
            y: event.target.y()
          });
        }}
      />
      {selected && (
        <Rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rotation={element.rotation}
          stroke="#0f766e"
          strokeWidth={6}
          dash={[18, 12]}
          listening={false}
        />
      )}
    </>
  );
}

function BubbleNode({ element, selected }: { element: BubbleElement; selected: boolean }) {
  const updateElement = useMangaStore((state) => state.updateElement);
  const selectElement = useMangaStore((state) => state.selectElement);
  const textPadding = Math.max(20, element.fontSize * 0.55);
  const strokeWidth = element.strokeWidth ?? 3;

  return (
    <Group
      x={element.x}
      y={element.y}
      draggable
      onClick={(event) => {
        event.cancelBubble = true;
        selectElement(element.id);
      }}
      onTap={(event) => {
        event.cancelBubble = true;
        selectElement(element.id);
      }}
      onDragEnd={(event) => {
        updateElement<BubbleElement>(element.id, {
          x: event.target.x(),
          y: event.target.y()
        });
      }}
    >
      <Line
        points={bubbleTailPoints(element)}
        closed
        fill={element.fill}
        stroke={element.stroke}
        strokeWidth={strokeWidth}
        lineJoin="round"
      />
      <BubbleBody element={element} />
      <Text
        x={textPadding}
        y={textPadding * 0.7}
        width={Math.max(1, element.width - textPadding * 2)}
        height={Math.max(1, element.height - textPadding * 1.4)}
        text={element.text}
        fontSize={element.fontSize}
        fill="#111827"
        align="center"
        verticalAlign="middle"
        lineHeight={1.18}
      />
      {selected && (
        <Rect
          x={-8}
          y={-8}
          width={element.width + 16}
          height={element.height + 16}
          stroke="#0f766e"
          strokeWidth={Math.max(3, strokeWidth + 2)}
          dash={[16, 10]}
          listening={false}
        />
      )}
      {selected && (
        <Circle
          x={element.tailX}
          y={element.tailY}
          radius={14}
          fill="#ffffff"
          stroke="#0f766e"
          strokeWidth={3}
          draggable
          onDragEnd={(event) => {
            updateElement<BubbleElement>(element.id, {
              tailX: event.target.x(),
              tailY: event.target.y()
            });
          }}
        />
      )}
    </Group>
  );
}

function FocusLinesNode({ element, selected }: { element: FocusLineElement; selected: boolean }) {
  const updateElement = useMangaStore((state) => state.updateElement);
  const selectElement = useMangaStore((state) => state.selectElement);
  const lines = useMemo(() => buildFocusLines(element), [element]);

  return (
    <Group
      x={element.x}
      y={element.y}
      draggable
      onClick={(event) => {
        event.cancelBubble = true;
        selectElement(element.id);
      }}
      onTap={(event) => {
        event.cancelBubble = true;
        selectElement(element.id);
      }}
      onDragEnd={(event) => {
        updateElement<FocusLineElement>(element.id, {
          x: event.target.x(),
          y: event.target.y()
        });
      }}
    >
      <Circle radius={Math.max(28, element.innerRadius)} fill="rgba(255,255,255,0.01)" />
      {lines.map((line, index) => (
        <Line
          key={`${element.seed}-${index}`}
          points={line.points}
          stroke={element.color}
          strokeWidth={element.strokeWidth}
          lineCap="round"
          listening={index % 5 === 0}
        />
      ))}
      {selected && (
        <Circle
          radius={Math.max(18, element.innerRadius)}
          stroke="#0f766e"
          strokeWidth={4}
          dash={[14, 10]}
          listening={false}
        />
      )}
    </Group>
  );
}

function ElementNode({ element, selected }: { element: MangaElement; selected: boolean }) {
  if (element.type === 'image') {
    return <ImageNode element={element} selected={selected} />;
  }
  if (element.type === 'bubble') {
    return <BubbleNode element={element} selected={selected} />;
  }
  return <FocusLinesNode element={element} selected={selected} />;
}

function PanelFill({ panel, onSelect }: { panel: Panel; onSelect: () => void }) {
  const updatePanel = useMangaStore((state) => state.updatePanel);
  const commonHandlers = {
    onClick: (event: Konva.KonvaEventObject<MouseEvent>) => {
      event.cancelBubble = true;
      onSelect();
    },
    onTap: (event: Konva.KonvaEventObject<Event>) => {
      event.cancelBubble = true;
      onSelect();
    }
  };
  const shape = panelShape(panel);

  if (shape === 'ellipse') {
    return (
      <Ellipse
        x={panel.x + panel.width / 2}
        y={panel.y + panel.height / 2}
        radiusX={panel.width / 2}
        radiusY={panel.height / 2}
        fill="#ffffff"
        draggable
        {...commonHandlers}
        onDragEnd={(event) => {
          updatePanel(panel.id, {
            x: event.target.x() - panel.width / 2,
            y: event.target.y() - panel.height / 2
          });
        }}
      />
    );
  }

  if (shape === 'slantLeft' || shape === 'slantRight') {
    return (
      <Line
        points={panelPolygonPoints(panel)}
        closed
        fill="#ffffff"
        draggable
        {...commonHandlers}
        onDragEnd={(event) => {
          updatePanel(panel.id, {
            x: panel.x + event.target.x(),
            y: panel.y + event.target.y()
          });
        }}
      />
    );
  }

  return (
    <Rect
      x={panel.x}
      y={panel.y}
      width={panel.width}
      height={panel.height}
      fill="#ffffff"
      draggable
      {...commonHandlers}
      onDragEnd={(event) => {
        updatePanel(panel.id, {
          x: event.target.x(),
          y: event.target.y()
        });
      }}
    />
  );
}

function PanelBorder({ panel, selected }: { panel: Panel; selected: boolean }) {
  const shape = panelShape(panel);
  const stroke = selected ? '#0f766e' : '#111827';
  const baseStrokeWidth = panel.strokeWidth ?? 3;
  const strokeWidth = selected ? baseStrokeWidth + 3 : baseStrokeWidth;

  if (shape === 'ellipse') {
    return (
      <Ellipse
        x={panel.x + panel.width / 2}
        y={panel.y + panel.height / 2}
        radiusX={panel.width / 2}
        radiusY={panel.height / 2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        listening={false}
      />
    );
  }

  if (shape === 'slantLeft' || shape === 'slantRight') {
    return (
      <Line
        points={panelPolygonPoints(panel)}
        closed
        stroke={stroke}
        strokeWidth={strokeWidth}
        lineJoin="round"
        listening={false}
      />
    );
  }

  return (
    <Rect
      x={panel.x}
      y={panel.y}
      width={panel.width}
      height={panel.height}
      stroke={stroke}
      strokeWidth={strokeWidth}
      listening={false}
    />
  );
}

function PanelResizeHandle({ panel }: { panel: Panel }) {
  const updatePanel = useMangaStore((state) => state.updatePanel);
  return (
    <Rect
      x={panel.x + panel.width - 18}
      y={panel.y + panel.height - 18}
      width={36}
      height={36}
      fill="#ffffff"
      stroke="#0f766e"
      strokeWidth={3}
      cornerRadius={6}
      draggable
      onDragEnd={(event) => {
        updatePanel(panel.id, {
          width: event.target.x() + 18 - panel.x,
          height: event.target.y() + 18 - panel.y
        });
      }}
    />
  );
}

function PanelContent({ panel, elements, selectedPanelId, selectedElementId }: { panel: Panel; elements: MangaElement[]; selectedPanelId: string | null; selectedElementId: string | null }) {
  const selectPanel = useMangaStore((state) => state.selectPanel);
  const panelElements = elements.filter((element) => element.panelId === panel.id);
  const isSelected = selectedPanelId === panel.id && !selectedElementId;

  return (
    <>
      <Group
        clipFunc={(context) => {
          drawPanelClip(context, panel);
        }}
      >
        <PanelFill panel={panel} onSelect={() => selectPanel(panel.id)} />
        {panelElements.map((element) => (
          <ElementNode key={element.id} element={element} selected={selectedElementId === element.id} />
        ))}
      </Group>
      <PanelBorder panel={panel} selected={isSelected} />
      {isSelected && <PanelResizeHandle panel={panel} />}
      <Text
        x={panel.x + 14}
        y={panel.y + 12}
        text={panel.name}
        fontSize={28}
        fontStyle="bold"
        fill={isSelected ? '#0f766e' : '#6b7280'}
        listening={false}
      />
    </>
  );
}

export function MangaCanvas({ stageRef }: MangaCanvasProps) {
  const project = useMangaStore((state) => state.project);
  const selectedPanelId = useMangaStore((state) => state.selectedPanelId);
  const selectedElementId = useMangaStore((state) => state.selectedElementId);
  const selectPanel = useMangaStore((state) => state.selectPanel);
  const page = project.pages.find((item) => item.id === project.activePageId) ?? project.pages[0];
  const { ref, scale } = useContainerScale();

  return (
    <main className="canvasPanel" ref={ref}>
      <div
        className="pageScaleBox"
        style={{
          width: PAGE_WIDTH * scale,
          height: PAGE_HEIGHT * scale
        }}
      >
        <div
          className="pageScaleInner"
          style={{
            transform: `scale(${scale})`,
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT
          }}
        >
          <Stage
            ref={stageRef}
            width={PAGE_WIDTH}
            height={PAGE_HEIGHT}
            onMouseDown={(event) => {
              if (event.target === event.target.getStage()) {
                selectPanel(null);
              }
            }}
            onTouchStart={(event) => {
              if (event.target === event.target.getStage()) {
                selectPanel(null);
              }
            }}
          >
            <Layer>
              <Rect x={0} y={0} width={PAGE_WIDTH} height={PAGE_HEIGHT} fill="#f8fafc" />
              <Rect x={26} y={26} width={PAGE_WIDTH - 52} height={PAGE_HEIGHT - 52} fill="#ffffff" stroke="#d1d5db" strokeWidth={2} />
              {page.panels.map((panel) => (
                <PanelContent
                  key={panel.id}
                  panel={panel}
                  elements={page.elements}
                  selectedPanelId={selectedPanelId}
                  selectedElementId={selectedElementId}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>
    </main>
  );
}
