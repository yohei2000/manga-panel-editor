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
        points={[element.width * 0.55, element.height * 0.78, element.tailX, element.tailY, element.width * 0.42, element.height * 0.82]}
        closed
        fill={element.fill}
        stroke={element.stroke}
        strokeWidth={5}
        lineJoin="round"
      />
      <Ellipse
        x={element.width / 2}
        y={element.height / 2}
        radiusX={element.width / 2}
        radiusY={element.height / 2}
        fill={element.fill}
        stroke={element.stroke}
        strokeWidth={5}
      />
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
          strokeWidth={5}
          dash={[16, 10]}
          listening={false}
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
          strokeWidth={5}
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

function PanelContent({ panel, elements, selectedPanelId, selectedElementId }: { panel: Panel; elements: MangaElement[]; selectedPanelId: string | null; selectedElementId: string | null }) {
  const selectPanel = useMangaStore((state) => state.selectPanel);
  const panelElements = elements.filter((element) => element.panelId === panel.id);
  const isSelected = selectedPanelId === panel.id && !selectedElementId;

  return (
    <>
      <Group
        clipFunc={(context) => {
          context.rect(panel.x, panel.y, panel.width, panel.height);
        }}
      >
        <Rect
          x={panel.x}
          y={panel.y}
          width={panel.width}
          height={panel.height}
          fill="#ffffff"
          onClick={(event) => {
            event.cancelBubble = true;
            selectPanel(panel.id);
          }}
          onTap={(event) => {
            event.cancelBubble = true;
            selectPanel(panel.id);
          }}
        />
        {panelElements.map((element) => (
          <ElementNode key={element.id} element={element} selected={selectedElementId === element.id} />
        ))}
      </Group>
      <Rect
        x={panel.x}
        y={panel.y}
        width={panel.width}
        height={panel.height}
        stroke={isSelected ? '#0f766e' : '#111827'}
        strokeWidth={isSelected ? 8 : 5}
        listening={false}
      />
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
