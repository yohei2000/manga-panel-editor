import type { ChangeEvent } from 'react';
import { useMangaStore } from '../store/useMangaStore';

export function AssetLibrary() {
  const assets = useMangaStore((state) => state.assets);
  const assetUrls = useMangaStore((state) => state.assetUrls);
  const selectedAssetId = useMangaStore((state) => state.selectedAssetId);
  const addAssetFile = useMangaStore((state) => state.addAssetFile);
  const selectAsset = useMangaStore((state) => state.selectAsset);

  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'));
    for (const file of files) {
      await addAssetFile(file);
    }
    event.target.value = '';
  };

  return (
    <aside className="assetPanel">
      <div className="sectionHeader">
        <h2>画像</h2>
        <label className="primaryButton fileButton">
          追加
          <input type="file" accept="image/*" multiple onChange={onFiles} />
        </label>
      </div>
      <div className="assetGrid">
        {assets.map((asset) => (
          <button
            key={asset.id}
            className={`assetThumb ${selectedAssetId === asset.id ? 'isSelected' : ''}`}
            type="button"
            onClick={() => selectAsset(asset.id)}
            title={`${asset.name} (${asset.width}x${asset.height})`}
          >
            <img src={assetUrls[asset.id]} alt={asset.name} />
            <span>{asset.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
