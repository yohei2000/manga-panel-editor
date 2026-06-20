import Dexie, { type Table } from 'dexie';
import { nanoid } from 'nanoid';
import type { ImageAssetMeta, MangaProject } from '../types/manga';

interface ProjectRecord {
  id: string;
  project: MangaProject;
  updatedAt: string;
}

interface ImageAssetRecord extends ImageAssetMeta {
  blob: Blob;
}

class MangaEditorDb extends Dexie {
  projects!: Table<ProjectRecord, string>;
  images!: Table<ImageAssetRecord, string>;

  constructor() {
    super('manga-panel-editor');
    this.version(1).stores({
      projects: 'id, updatedAt',
      images: 'id, createdAt'
    });
  }
}

export const mangaDb = new MangaEditorDb();

function readImageSize(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const size = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(size);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像サイズを読み取れませんでした'));
    };
    image.src = url;
  });
}

export async function putImageFile(file: File): Promise<{ meta: ImageAssetMeta; objectUrl: string }> {
  const { width, height } = await readImageSize(file);
  const meta: ImageAssetMeta = {
    id: nanoid(),
    name: file.name,
    mimeType: file.type || 'image/png',
    width,
    height,
    createdAt: new Date().toISOString()
  };

  await mangaDb.images.put({
    ...meta,
    blob: file
  });

  return {
    meta,
    objectUrl: URL.createObjectURL(file)
  };
}

export async function listImageAssets(): Promise<ImageAssetMeta[]> {
  const records = await mangaDb.images.orderBy('createdAt').reverse().toArray();
  return records.map(({ blob: _blob, ...meta }) => meta);
}

export async function loadImageObjectUrls(): Promise<Record<string, string>> {
  const records = await mangaDb.images.toArray();
  const urls: Record<string, string> = {};
  for (const record of records) {
    urls[record.id] = URL.createObjectURL(record.blob);
  }
  return urls;
}

export async function saveProject(project: MangaProject): Promise<void> {
  await mangaDb.projects.put({
    id: project.id,
    project,
    updatedAt: project.updatedAt
  });
}

export async function loadLatestProject(): Promise<MangaProject | null> {
  const latest = await mangaDb.projects.orderBy('updatedAt').last();
  return latest?.project ?? null;
}
