import type Konva from 'konva';
import { useEffect, useRef, useState } from 'react';
import { AssetLibrary } from './components/AssetLibrary';
import { Inspector } from './components/Inspector';
import { MangaCanvas } from './components/MangaCanvas';
import { NamePlanner } from './components/NamePlanner';
import { Toolbar } from './components/Toolbar';
import { useMangaStore } from './store/useMangaStore';

export default function App() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const initialize = useMangaStore((state) => state.initialize);
  const [mode, setMode] = useState<'page' | 'name'>('page');

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <div className="appShell">
      <Toolbar stageRef={stageRef} />
      <nav className="modeTabs" aria-label="Editor mode">
        <button type="button" className={mode === 'page' ? 'isActive' : ''} onClick={() => setMode('page')}>
          ページ編集
        </button>
        <button type="button" className={mode === 'name' ? 'isActive' : ''} onClick={() => setMode('name')}>
          ネーム
        </button>
      </nav>
      {mode === 'page' ? (
        <div className="workspace">
          <AssetLibrary />
          <MangaCanvas stageRef={stageRef} />
          <Inspector />
        </div>
      ) : (
        <NamePlanner />
      )}
    </div>
  );
}
