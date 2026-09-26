import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import type { SpaceElement } from './arena/ElementsPanel';

import { StudioRail, type StudioTool } from './studio/StudioRail';
import { StudioLibrary } from './studio/StudioLibrary';
import { StudioCanvas } from './studio/StudioCanvas';
import type { Prefab, AreaType } from './studio/types';
export function Studio() {
  const { spaceId } = useParams();
  const navigate = useNavigate();

  // UI state
  const [welcome, setWelcome] = useState(() => sessionStorage.getItem('studio-welcome-seen') !== '1');
  const [tool, setTool] = useState<StudioTool>('select');
  const [availableElements, setAvailableElements] = useState<Prefab[]>([]);
  const [selectedPrefab, setSelectedPrefab] = useState<Prefab | undefined>(undefined);
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready');

  // Space data
  const [name, setName] = useState('Office');
  const [mapImage, setMapImage] = useState('');
  const [dimensions, setDimensions] = useState({ w: 100, h: 100 });
  const [elements, setElements] = useState<SpaceElement[]>([]);
  const [areas, setAreas] = useState<AreaType[]>([]);
  const [publishing, setPublishing] = useState(false);

  // History state for Undo/Redo
  const [history, setHistory] = useState<SpaceElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoActive = useRef(false);

  // Auto-save & History tracking
  useEffect(() => {
    if (elements.length === 0 && areas.length === 0 && history.length === 0) return;
    
    // Auto-save to draft (debounce to avoid spamming API)
    const timer = setTimeout(() => {
      api.put(`/office/${spaceId}/draft`, { data: { elements, areas, elementCount: elements.length, savedAt: new Date().toISOString() } }).catch(() => null);
    }, 1500);

    // Track history
    if (!isUndoRedoActive.current) {
      setHistory(prev => {
        const newHist = prev.slice(0, historyIndex + 1);
        newHist.push(elements);
        return newHist.slice(-20); // Keep last 20 actions
      });
      setHistoryIndex(prev => Math.min(19, prev + 1));
    }
    isUndoRedoActive.current = false;

    return () => clearTimeout(timer);
  }, [elements]);

  useEffect(() => {
    let mounted = true;
    api.get('/elements').then(res => {
      if (!mounted) return;
      const mapped = res.data.element.map((e: any) => ({
        title: e.name,
        kind: e.id,
        area: e.category || 'Machines',
        size: `${e.width} x ${e.height}`,
        color: '#aaaaaa',
        thumb: e.imageUrl.startsWith('/') ? e.imageUrl : `/${e.imageUrl}`,
      }));
      setAvailableElements(mapped);
      if (mapped.length > 0 && !selectedPrefab) setSelectedPrefab(mapped[0]);
    }).catch(() => console.error('Failed to load elements'));

    api.get(`/space/${spaceId}`).then(space => {
      if (!mounted) return;
      setName(space.data.name ?? 'Office');
      setMapImage(space.data.thumbnail || '/map-template.jpg');
      const dim = (space.data.dimensions || '100x100').split('x');
      setDimensions({ w: parseInt(dim[0]) || 100, h: parseInt(dim[1]) || 100 });
      
      // Look for draft first, otherwise load published elements
      api.get(`/office/${spaceId}/draft`).then(draftRes => {
        if (!mounted) return;
        if (draftRes.data.draft?.data?.elements) {
          const draftEls = draftRes.data.draft.data.elements;
          const draftAreas = draftRes.data.draft.data.areas || [];
          setElements(draftEls);
          setAreas(draftAreas);
          setHistory([draftEls]);
          setHistoryIndex(0);
        } else {
          setElements(space.data.elements ?? []);
          setAreas([]);
          setHistory([space.data.elements ?? []]);
          setHistoryIndex(0);
        }
      }).catch(() => {
        if (!mounted) return;
        setElements(space.data.elements ?? []);
        setHistory([space.data.elements ?? []]);
        setHistoryIndex(0);
      });
      
    }).catch(() => setStatus('Preview mode'));
    return () => { mounted = false; };
  }, [spaceId]);

  const closeWelcome = () => {
    sessionStorage.setItem('studio-welcome-seen', '1');
    setWelcome(false);
  };

  const goBack = () => navigate(`/space/${spaceId}`);

  const publish = async () => {
    setPublishing(true);
    setStatus('Publishing...');
    await api.put(`/office/${spaceId}/draft`, { data: { elements, areas, elementCount: elements.length, savedAt: new Date().toISOString() } }).catch(() => null);
    await api.post(`/office/${spaceId}/publish`, {}).catch(() => null);
    setPublishing(false);
    setStatus('Published!');
  };

  const selectPrefab = (card: Prefab) => {
    setSelectedPrefab(card);
    setTool(card.area === 'Rooms' ? 'room' : 'object');
    setStatus(`${card.title} selected — click or drag onto the map`);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoActive.current = true;
      setHistoryIndex(prev => prev - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoActive.current = true;
      setHistoryIndex(prev => prev + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '56px 280px 1fr', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

      <StudioRail
        tool={tool}
        onToolChange={t => { setTool(t); setStatus(`${t} tool active`); }}
        onBack={goBack}
        onPublish={publish}
        onHelp={() => setWelcome(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        publishing={publishing}
      />

      <StudioLibrary
        prefabs={availableElements}
        selectedPrefab={selectedPrefab}
        onSelect={selectPrefab}
        onClose={goBack}
        name={name}
        status={status}
      />

      <StudioCanvas
        tool={tool}
        availableElements={availableElements}
        elements={elements}
        setElements={setElements}
        areas={areas}
        setAreas={setAreas}
        mapImage={mapImage}
        dimensions={dimensions}
        selectedElId={selectedElId}
        setSelectedElId={setSelectedElId}
        setStatus={setStatus}
        onExit={goBack}
      />

      {/* Welcome modal */}
      {welcome && (
        <div className="studio-modal-backdrop">
          <div className="studio-welcome">
            <h1>Welcome to Studio! <span>Beta</span></h1>
            <p>Design your office by dragging rooms, desks, and objects from the sidebar onto the canvas. Click placed items to copy or delete them.</p>
            <p>Changes stay in draft until you click <b>Publish</b>.</p>
            <button className="primary-next" onClick={closeWelcome}>Start editing</button>
          </div>
        </div>
      )}
    </div>
  );
}
