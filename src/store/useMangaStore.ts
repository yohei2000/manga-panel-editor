import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { clampCrop, coverCrop, panelCenter } from '../lib/crop';
import { createPage } from '../lib/templates';
import {
  type BubbleElement,
  type FocusLineElement,
  type ImageAssetMeta,
  type ImageElement,
  type MangaElement,
  type MangaPage,
  type MangaProject,
  type Panel,
  type TemplateId
} from '../types/manga';
import {
  listImageAssets,
  loadImageObjectUrls,
  loadLatestProject,
  putImageFile,
  saveProject
} from '../db/mangaDb';

type ElementPatch<T extends MangaElement = MangaElement> = Partial<Omit<T, 'id' | 'type'>>;

interface HistoryState {
  past: MangaProject[];
  future: MangaProject[];
}

interface MangaStore {
  project: MangaProject;
  assets: ImageAssetMeta[];
  assetUrls: Record<string, string>;
  selectedPanelId: string | null;
  selectedElementId: string | null;
  selectedAssetId: string | null;
  status: string;
  history: HistoryState;
  initialize: () => Promise<void>;
  setTemplate: (templateId: TemplateId) => void;
  selectPanel: (panelId: string | null) => void;
  selectElement: (elementId: string | null) => void;
  selectAsset: (assetId: string | null) => void;
  addAssetFile: (file: File) => Promise<void>;
  addImageToSelectedPanel: () => void;
  addBubble: () => void;
  addFocusLines: () => void;
  updateElement: <T extends MangaElement>(elementId: string, patch: ElementPatch<T>) => void;
  deleteSelected: () => void;
  undo: () => void;
  redo: () => void;
  saveCurrentProject: () => Promise<void>;
  restoreLatestProject: () => Promise<void>;
}

function now(): string {
  return new Date().toISOString();
}

function cloneProject(project: MangaProject): MangaProject {
  return structuredClone(project);
}

function createProject(): MangaProject {
  const page = createPage('twoVertical');
  const timestamp = now();
  return {
    id: nanoid(),
    name: 'Manga Project',
    createdAt: timestamp,
    updatedAt: timestamp,
    pages: [page],
    activePageId: page.id
  };
}

function activePage(project: MangaProject): MangaPage {
  return project.pages.find((page) => page.id === project.activePageId) ?? project.pages[0];
}

function findPanel(project: MangaProject, panelId: string | null): Panel | null {
  if (!panelId) {
    return null;
  }
  return activePage(project).panels.find((panel) => panel.id === panelId) ?? null;
}

function findElement(project: MangaProject, elementId: string | null): MangaElement | null {
  if (!elementId) {
    return null;
  }
  return activePage(project).elements.find((element) => element.id === elementId) ?? null;
}

function updateActivePage(project: MangaProject, updater: (page: MangaPage) => MangaPage): MangaProject {
  return {
    ...project,
    updatedAt: now(),
    pages: project.pages.map((page) => (page.id === project.activePageId ? updater(page) : page))
  };
}

export const useMangaStore = create<MangaStore>((set, get) => ({
  project: createProject(),
  assets: [],
  assetUrls: {},
  selectedPanelId: null,
  selectedElementId: null,
  selectedAssetId: null,
  status: 'Ready',
  history: { past: [], future: [] },

  initialize: async () => {
    const [assets, assetUrls, latestProject] = await Promise.all([
      listImageAssets(),
      loadImageObjectUrls(),
      loadLatestProject()
    ]);

    set((state) => ({
      assets,
      assetUrls,
      project: latestProject ?? state.project,
      selectedPanelId: latestProject ? activePage(latestProject).panels[0]?.id ?? null : state.selectedPanelId,
      status: latestProject ? 'IndexedDBから復元しました' : 'Ready'
    }));
  },

  setTemplate: (templateId) => {
    const previous = cloneProject(get().project);
    const page = createPage(templateId);
    const project = {
      ...previous,
      updatedAt: now(),
      activePageId: page.id,
      pages: [page]
    };

    set((state) => ({
      project,
      selectedPanelId: page.panels[0]?.id ?? null,
      selectedElementId: null,
      history: { past: [...state.history.past, previous], future: [] },
      status: 'テンプレートを変更しました'
    }));
  },

  selectPanel: (panelId) => {
    set({
      selectedPanelId: panelId,
      selectedElementId: null
    });
  },

  selectElement: (elementId) => {
    const element = findElement(get().project, elementId);
    set({
      selectedElementId: elementId,
      selectedPanelId: element?.panelId ?? get().selectedPanelId
    });
  },

  selectAsset: (assetId) => set({ selectedAssetId: assetId }),

  addAssetFile: async (file) => {
    const { meta, objectUrl } = await putImageFile(file);
    set((state) => ({
      assets: [meta, ...state.assets],
      assetUrls: { ...state.assetUrls, [meta.id]: objectUrl },
      selectedAssetId: meta.id,
      status: '画像を追加しました'
    }));
  },

  addImageToSelectedPanel: () => {
    const state = get();
    const selectedPanel = findPanel(state.project, state.selectedPanelId);
    const selectedAsset = state.assets.find((asset) => asset.id === state.selectedAssetId);
    if (!selectedPanel || !selectedAsset) {
      set({ status: 'コマと画像を選択してください' });
      return;
    }

    const previous = cloneProject(state.project);
    const element: ImageElement = {
      id: nanoid(),
      type: 'image',
      name: selectedAsset.name,
      panelId: selectedPanel.id,
      assetId: selectedAsset.id,
      x: selectedPanel.x,
      y: selectedPanel.y,
      width: selectedPanel.width,
      height: selectedPanel.height,
      rotation: 0,
      opacity: 1,
      crop: coverCrop(selectedAsset.width, selectedAsset.height, selectedPanel.width, selectedPanel.height)
    };

    const project = updateActivePage(previous, (page) => ({
      ...page,
      elements: [...page.elements, element]
    }));

    set((current) => ({
      project,
      selectedElementId: element.id,
      history: { past: [...current.history.past, previous], future: [] },
      status: '画像をコマに配置しました'
    }));
  },

  addBubble: () => {
    const state = get();
    const panel = findPanel(state.project, state.selectedPanelId);
    if (!panel) {
      set({ status: '吹き出しを置くコマを選択してください' });
      return;
    }

    const previous = cloneProject(state.project);
    const center = panelCenter(panel);
    const width = Math.min(360, panel.width * 0.72);
    const height = 170;
    const element: BubbleElement = {
      id: nanoid(),
      type: 'bubble',
      name: '吹き出し',
      panelId: panel.id,
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
      text: 'セリフ',
      fontSize: 38,
      tailX: width * 0.58,
      tailY: height + 64,
      fill: '#ffffff',
      stroke: '#111827'
    };

    const project = updateActivePage(previous, (page) => ({
      ...page,
      elements: [...page.elements, element]
    }));

    set((current) => ({
      project,
      selectedElementId: element.id,
      history: { past: [...current.history.past, previous], future: [] },
      status: '吹き出しを追加しました'
    }));
  },

  addFocusLines: () => {
    const state = get();
    const panel = findPanel(state.project, state.selectedPanelId);
    if (!panel) {
      set({ status: '集中線を置くコマを選択してください' });
      return;
    }

    const previous = cloneProject(state.project);
    const center = panelCenter(panel);
    const element: FocusLineElement = {
      id: nanoid(),
      type: 'focusLines',
      name: '集中線',
      panelId: panel.id,
      x: center.x,
      y: center.y,
      count: 72,
      innerRadius: Math.min(panel.width, panel.height) * 0.18,
      outerRadius: Math.max(panel.width, panel.height) * 0.9,
      strokeWidth: 5,
      seed: Math.floor(Math.random() * 100000),
      color: '#111827'
    };

    const project = updateActivePage(previous, (page) => ({
      ...page,
      elements: [...page.elements, element]
    }));

    set((current) => ({
      project,
      selectedElementId: element.id,
      history: { past: [...current.history.past, previous], future: [] },
      status: '集中線を追加しました'
    }));
  },

  updateElement: (elementId, patch) => {
    const state = get();
    const previous = cloneProject(state.project);
    const project = updateActivePage(previous, (page) => ({
      ...page,
      elements: page.elements.map((element) => {
        if (element.id !== elementId) {
          return element;
        }

        if (element.type === 'image' && patch && 'crop' in patch) {
          const imagePatch = patch as Partial<ImageElement>;
          const asset = state.assets.find((item) => item.id === element.assetId);
          if (asset && imagePatch.crop) {
            return {
              ...element,
              ...patch,
              crop: clampCrop(imagePatch.crop, asset.width, asset.height)
            } as MangaElement;
          }
        }

        return {
          ...element,
          ...patch
        } as MangaElement;
      })
    }));

    set((current) => ({
      project,
      history: { past: [...current.history.past, previous], future: [] },
      status: 'プロパティを更新しました'
    }));
  },

  deleteSelected: () => {
    const state = get();
    if (!state.selectedElementId) {
      return;
    }
    const previous = cloneProject(state.project);
    const project = updateActivePage(previous, (page) => ({
      ...page,
      elements: page.elements.filter((element) => element.id !== state.selectedElementId)
    }));

    set((current) => ({
      project,
      selectedElementId: null,
      history: { past: [...current.history.past, previous], future: [] },
      status: '選択オブジェクトを削除しました'
    }));
  },

  undo: () => {
    const { history, project } = get();
    const previous = history.past.at(-1);
    if (!previous) {
      return;
    }

    set({
      project: previous,
      selectedElementId: null,
      history: {
        past: history.past.slice(0, -1),
        future: [cloneProject(project), ...history.future]
      },
      status: 'Undo'
    });
  },

  redo: () => {
    const { history, project } = get();
    const next = history.future[0];
    if (!next) {
      return;
    }

    set({
      project: next,
      selectedElementId: null,
      history: {
        past: [...history.past, cloneProject(project)],
        future: history.future.slice(1)
      },
      status: 'Redo'
    });
  },

  saveCurrentProject: async () => {
    const project = {
      ...get().project,
      updatedAt: now()
    };
    await saveProject(project);
    set({
      project,
      status: 'IndexedDBに保存しました'
    });
  },

  restoreLatestProject: async () => {
    const project = await loadLatestProject();
    if (!project) {
      set({ status: '保存済みプロジェクトがありません' });
      return;
    }

    const assets = await listImageAssets();
    const assetUrls = await loadImageObjectUrls();
    set({
      project,
      assets,
      assetUrls,
      selectedPanelId: activePage(project).panels[0]?.id ?? null,
      selectedElementId: null,
      history: { past: [], future: [] },
      status: 'IndexedDBから復元しました'
    });
  }
}));
