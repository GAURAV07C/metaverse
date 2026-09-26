import { useState, useEffect, useMemo, useRef } from "react";
import type { ElementItem } from "../adminTypes";
import { StudioRail, type StudioTool } from "../../studio/StudioRail";
import { StudioLibrary } from "../../studio/StudioLibrary";
import { StudioCanvas } from "../../studio/StudioCanvas";
import type { Prefab, AreaType } from "../../studio/types";
import type { SpaceElement } from "../../arena/ElementsPanel";

interface RoomLabEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  elements: ElementItem[];
  initialMapData?: {
    id?: string;
    name: string;
    dimensions: string; // e.g. "30x30"
    thumbnail?: string;
    defaultElements?: { elementId: string; x: number; y: number }[];
    areas?: { id?: string; name: string; x: number; y: number; w: number; h: number; floor: string; color: string; texture: string }[];
  } | null;
  onSaveTemplate: (data: {
    id?: string;
    name: string;
    dimensions: string;
    thumbnail: string;
    defaultElements: { elementId: string; x: number; y: number }[];
    areas?: { name: string; x: number; y: number; w: number; h: number; floor: string; color: string; texture: string }[];
  }) => Promise<void>;
  isSaving: boolean;
}

export function RoomLabEditorModal({
  isOpen,
  onClose,
  elements,
  initialMapData,
  onSaveTemplate,
  isSaving,
}: RoomLabEditorModalProps) {
  const [name, setName] = useState("New Custom Room Template");
  const [dimensions, setDimensions] = useState({ w: 30, h: 30 });
  const [tool, setTool] = useState<StudioTool>('select');
  const [selectedPrefab, setSelectedPrefab] = useState<Prefab | undefined>(undefined);
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready');
  const [placedElements, setPlacedElements] = useState<SpaceElement[]>([]);
  const [areas, setAreas] = useState<AreaType[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  // History state for Undo/Redo
  const [history, setHistory] = useState<SpaceElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoActive = useRef(false);

  // Map elements to Prefabs
  const availablePrefabs = useMemo<Prefab[]>(() => {
    return elements.map(e => ({
      title: e.name || 'Element',
      kind: e.id,
      area: e.category || 'Misc',
      size: `${e.width} x ${e.height}`,
      color: '#aaaaaa',
      thumb: e.imageUrl.startsWith('/') ? e.imageUrl : `/${e.imageUrl}`,
    }));
  }, [elements]);

  useEffect(() => {
    if (initialMapData) {
      setName(initialMapData.name || "Custom Room Template");
      const dim = (initialMapData.dimensions || "30x30").split("x");
      setDimensions({ w: parseInt(dim[0]) || 30, h: parseInt(dim[1]) || 30 });
      
      if (initialMapData.defaultElements) {
        const hyd: SpaceElement[] = initialMapData.defaultElements.map((de, i) => {
          const el = elements.find(e => e.id === de.elementId);
          if (!el) return null;
          return {
            id: `init-${i}-${de.elementId}`,
            element: el,
            x: de.x,
            y: de.y,
          };
        }).filter(Boolean) as SpaceElement[];
        setPlacedElements(hyd);
        setHistory([hyd]);
        setHistoryIndex(0);
      } else {
        setPlacedElements([]);
        setHistory([[]]);
        setHistoryIndex(0);
      }
      
      if (initialMapData.areas) {
        setAreas(initialMapData.areas.map(a => ({
          id: a.id || `area-${Math.random()}`,
          name: a.name, x: a.x, y: a.y, w: a.w, h: a.h,
          floor: a.floor, color: a.color, texture: a.texture as any
        })));
      } else {
        setAreas([]);
      }
      setThumbnailUrl(initialMapData.thumbnail || "");
    } else {
      setName("New Custom Room Template");
      setDimensions({ w: 30, h: 30 });
      setPlacedElements([]);
      setAreas([]);
      setHistory([[]]);
      setHistoryIndex(0);
      setThumbnailUrl("");
    }
  }, [initialMapData?.id, isOpen]); // Removed elements and full initialMapData to prevent overwrite on save re-renders

  // Track history
  useEffect(() => {
    if (!isUndoRedoActive.current && placedElements !== history[historyIndex]) {
      setHistory(prev => {
        const newHist = prev.slice(0, historyIndex + 1);
        newHist.push(placedElements);
        return newHist.slice(-20); // Keep last 20 actions
      });
      setHistoryIndex(prev => Math.min(19, prev + 1));
    }
    isUndoRedoActive.current = false;
  }, [placedElements, history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoActive.current = true;
      setHistoryIndex(prev => prev - 1);
      setPlacedElements(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoActive.current = true;
      setHistoryIndex(prev => prev + 1);
      setPlacedElements(history[historyIndex + 1]);
    }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    const defaultElements = placedElements.map(pe => ({
      elementId: pe.element.id,
      x: pe.x,
      y: pe.y,
    }));
    await onSaveTemplate({
      id: initialMapData?.id,
      name,
      dimensions: `${dimensions.w}x${dimensions.h}`,
      thumbnail: thumbnailUrl || "https://placehold.co/600x400/0f172a/3b82f6?text=Room+Template",
      defaultElements,
      areas: areas.map(a => ({
        name: a.name, x: a.x, y: a.y, w: a.w, h: a.h,
        floor: a.floor, color: a.color, texture: a.texture || 'solid'
      }))
    });
  };

  const selectPrefab = (card: Prefab) => {
    setSelectedPrefab(card);
    setTool(card.area === 'Rooms' ? 'room' : 'object');
    setStatus(`${card.title} selected — click or drag onto the map`);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      backgroundColor: "#000", zIndex: 999999, display: 'grid', 
      gridTemplateColumns: '56px 280px 1fr', overflow: 'hidden', fontFamily: 'Inter, sans-serif'
    }}>
      <StudioRail
        tool={tool}
        onToolChange={t => { setTool(t); setStatus(`${t} tool active`); }}
        onBack={onClose}
        onPublish={handleSave}
        onHelp={() => {}}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        publishing={isSaving}
      />
      <StudioLibrary
        prefabs={availablePrefabs}
        selectedPrefab={selectedPrefab}
        onSelect={selectPrefab}
        onClose={onClose}
        name={name}
        status={status}
        thumbnail={thumbnailUrl}
        onThumbnailChange={setThumbnailUrl}
      />
      <StudioCanvas
        tool={tool}
        availableElements={availablePrefabs}
        elements={placedElements}
        setElements={setPlacedElements}
        areas={areas}
        setAreas={setAreas}
        mapImage=""
        dimensions={dimensions}
        selectedElId={selectedElId}
        setSelectedElId={setSelectedElId}
        setStatus={setStatus}
        onExit={onClose}
      />
    </div>
  );
}
