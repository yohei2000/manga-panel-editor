import type Konva from 'konva';
import { useEffect, useRef } from 'react';
import { AssetLibrary } from './components/AssetLibrary';
import { Inspector } from './components/Inspector';
import { MangaCanvas } from './components/MangaCanvas';
import { Toolbar } from './components/Toolbar';
import { useMangaStore } from './store/useMangaStore';

export default function App() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const initialize = useMangaStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <div className="appShell">
      <Toolbar stageRef={stageRef} />
      <div className="workspace">
        <AssetLibrary />
        <MangaCanvas stageRef={stageRef} />
        <Inspector />
      </div>
    </div>
  );
}
