import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useUserStore } from '../store';
import type { SpaceElement } from './arena/ElementsPanel';

import { StudioRail, type StudioTool } from './studio/StudioRail';
import { StudioLibrary } from './studio/StudioLibrary';
import { StudioCanvas } from './studio/StudioCanvas';
import type { Prefab, AreaType } from './studio/types';
export function Studio() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const myUserId = useUserStore((s) => s.userId);

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
  const [canEdit, setCanEdit] = useState<boolean | null>(null);

  // History state for Undo/Redo
  const [history, setHistory] = useState<SpaceElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoActive = useRef(false);

  // Auto-save & History tracking
  useEffect(() => {
    if (canEdit !== true) return;
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
  }, [elements, areas, historyIndex, history.length, areas.length, spaceId, canEdit]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get('/elements').catch(() => ({ data: { element: [] } })),
      api.get('/maps').catch(() => ({ data: { maps: [] } }))
    ]).then(([elemRes, mapRes]) => {
      if (!mounted) return;
      
      const mappedElements = elemRes.data.element.map((e: any) => ({
        title: e.name,
        kind: e.id,
        area: e.category || 'Machines',
        size: `${e.width} x ${e.height}`,
        color: '#aaaaaa',
        thumb: e.imageUrl.startsWith('/') ? e.imageUrl : `/${e.imageUrl}`,
      }));

      const roomPrefabs = (mapRes.data.maps || []).filter((m: any) => m.type === 'room').map((m: any) => ({
        title: m.name,
        kind: m.id,
        area: 'Rooms', // Add to Rooms category
        size: m.dimensions.replace('x', ' x '),
        thumb: m.thumbnail,
        items: m.elements.map((e: any) => ({
          kind: e.element.id,
          dx: e.x,
          dy: e.y
        }))
      }));

      const allPrefabs = [...roomPrefabs, ...mappedElements];
      setAvailableElements(allPrefabs);
      if (allPrefabs.length > 0 && !selectedPrefab) setSelectedPrefab(allPrefabs[0]);
    });

    api.get(`/space/${spaceId}`).then(space => {
      if (!mounted) return;
      setName(space.data.name ?? 'Office');
      setMapImage(space.data.thumbnail || '/map-template.jpg');
      const dim = (space.data.dimensions || '100x100').split('x');
      setDimensions({ w: parseInt(dim[0]) || 100, h: parseInt(dim[1]) || 100 });
      const allowedToEdit = Boolean(space.data.canEdit ?? (myUserId && space.data.ownerId === myUserId));
      setCanEdit(allowedToEdit);
      if (!allowedToEdit) {
        setStatus('Only the space owner can edit this office.');
        window.setTimeout(() => navigate(`/space/${spaceId}`), 900);
        return;
      }
      
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
  }, [spaceId, selectedPrefab, myUserId, navigate]);

  const closeWelcome = () => {
    sessionStorage.setItem('studio-welcome-seen', '1');
    setWelcome(false);
  };

  const goBack = () => navigate(`/space/${spaceId}`);

  const validatePortalTargets = () => {
    for (const area of areas) {
      if (area.type !== 'portal') continue;
      const label = area.name || 'Portal';
      const hasX = area.targetX !== undefined;
      const hasY = area.targetY !== undefined;
      if (hasX !== hasY) return `${label}: target X and Y dono set karo.`;
      if (hasX && hasY) {
        if (!Number.isInteger(area.targetX) || !Number.isInteger(area.targetY)) return `${label}: target coordinates valid numbers hone chahiye.`;
        if (!area.targetSpaceId && (area.targetX! < 0 || area.targetX! >= dimensions.w || area.targetY! < 0 || area.targetY! >= dimensions.h)) {
          return `${label}: target coordinates map ke andar hone chahiye.`;
        }
      }
      if (area.targetUrl) {
        const url = area.targetUrl.trim();
        const isValidUrl = url.startsWith('/') || /^https?:\/\//i.test(url);
        if (!isValidUrl) return `${label}: URL /space/... ya https:// se start hona chahiye.`;
      }
      if (area.targetRoomId && !area.targetSpaceId && !areas.some(candidate => candidate.id === area.targetRoomId && (candidate.type === 'room' || candidate.type === 'private'))) {
        return `${label}: destination room id current map me nahi mila.`;
      }
    }
    return '';
  };

  const publish = async () => {
    if (canEdit !== true) {
      setStatus('Only the space owner can publish changes.');
      return;
    }
    const validationError = validatePortalTargets();
    if (validationError) {
      setStatus(validationError);
      return;
    }
    setPublishing(true);
    setStatus('Publishing...');
    try {
      await api.put(`/office/${spaceId}/draft`, { data: { elements, areas, elementCount: elements.length, savedAt: new Date().toISOString() } });
      await api.post(`/office/${spaceId}/publish`, {});
      setStatus('Published!');
    } catch (error: any) {
      setStatus(error?.response?.data?.message || 'Publish failed. Please try again.');
    } finally {
      setPublishing(false);
    }
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
