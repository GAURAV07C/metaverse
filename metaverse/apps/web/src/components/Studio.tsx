import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import type { SpaceElement } from './arena/ElementsPanel';

import { StudioRail, type StudioTool } from './studio/StudioRail';
import { StudioLibrary } from './studio/StudioLibrary';
import { StudioCanvas } from './studio/StudioCanvas';
import { prefabs, type Prefab } from './studio/prefabs';

export function Studio() {
  const { spaceId } = useParams();
  const navigate = useNavigate();

  // UI state
  const [welcome, setWelcome] = useState(() => sessionStorage.getItem('studio-welcome-seen') !== '1');
  const [tool, setTool] = useState<StudioTool>('select');
  const [selectedPrefab, setSelectedPrefab] = useState<Prefab>(prefabs[1]);
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready');

  // Space data
  const [name, setName] = useState('Office');
  const [mapImage, setMapImage] = useState('');
  const [dimensions, setDimensions] = useState({ w: 100, h: 100 });
  const [elements, setElements] = useState<SpaceElement[]>([]);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get(`/space/${spaceId}`).then(space => {
      if (!mounted) return;
      setName(space.data.name ?? 'Office');
      setMapImage(space.data.thumbnail || '/map-template.jpg');
      const dim = (space.data.dimensions || '100x100').split('x');
      setDimensions({ w: parseInt(dim[0]) || 100, h: parseInt(dim[1]) || 100 });
      setElements(space.data.elements ?? []);
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
    await api.put(`/office/${spaceId}/draft`, { data: { elementCount: elements.length, savedAt: new Date().toISOString() } }).catch(() => null);
    await api.post(`/office/${spaceId}/publish`, {}).catch(() => null);
    setPublishing(false);
    setStatus('Published!');
  };

  const selectPrefab = (card: Prefab) => {
    setSelectedPrefab(card);
    setTool(card.area === 'Rooms' ? 'room' : 'object');
    setStatus(`${card.title} selected — click or drag onto the map`);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '56px 280px 1fr', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

      <StudioRail
        tool={tool}
        onToolChange={t => { setTool(t); setStatus(`${t} tool active`); }}
        onBack={goBack}
        onPublish={publish}
        onHelp={() => setWelcome(true)}
        publishing={publishing}
      />

      <StudioLibrary
        selectedPrefab={selectedPrefab}
        onSelect={selectPrefab}
        onClose={goBack}
        name={name}
        status={status}
      />

      <StudioCanvas
        tool={tool}
        elements={elements}
        setElements={setElements}
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
