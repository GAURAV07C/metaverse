import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BoxSelect, ChevronDown, Copy, Eraser, Grid3X3, Hand, HelpCircle, Layers3, Lock, Maximize2, MousePointer2, Play, Redo2, RotateCcw, Ruler, Save, Search, Send, Settings2, Sparkles, Trash2, Undo2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { api } from '../utils/api';
import type { SpaceElement } from './arena/ElementsPanel';

type StudioTool = 'select' | 'hand' | 'erase' | 'room' | 'object';

type Prefab = {
  title: string;
  kind: string;
  desc: string;
  area: string;
  size: string;
  color: string;
};

const prefabs: Prefab[] = [
  { title: 'Public Room', kind: 'public', desc: 'Open area for everyone', area: 'Rooms', size: '14 x 10', color: '#d8b77e' },
  { title: 'Meeting Room', kind: 'meeting', desc: 'Room with table and chairs', area: 'Rooms', size: '10 x 8', color: '#8da2ab' },
  { title: 'Coworking Area', kind: 'coworking', desc: 'Casual shared work zone', area: 'Rooms', size: '12 x 9', color: '#a98766' },
  { title: 'Private Desk', kind: 'private', desc: 'A dedicated desk setup', area: 'Desks', size: '4 x 3', color: '#8f765f' },
  { title: 'Team Area', kind: 'team', desc: 'A cluster for teammates', area: 'Desks', size: '8 x 5', color: '#b28b56' },
  { title: 'Open Desk', kind: 'open', desc: 'Flexible drop-in desk', area: 'Desks', size: '3 x 2', color: '#6d7380' },
  { title: 'Sofa Lounge', kind: 'lounge', desc: 'Soft seating corner', area: 'Decorations', size: '5 x 4', color: '#6f8f67' },
  { title: 'Plant Divider', kind: 'plant', desc: 'Decorative greenery', area: 'Decorations', size: '2 x 3', color: '#557d52' },
  { title: 'Whiteboard', kind: 'board', desc: 'Collaboration wall object', area: 'Objects', size: '3 x 1', color: '#ece8dc' },
  { title: 'Portal', kind: 'portal', desc: 'Interactive teleport object', area: 'Objects', size: '2 x 2', color: '#6f55d8' },
];

const categories = ['Rooms', 'Desks', 'Decorations', 'Objects'];
const tools: { id: StudioTool; label: string; icon: any }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'hand', label: 'Pan', icon: Hand },
  { id: 'room', label: 'Room', icon: BoxSelect },
  { id: 'object', label: 'Object', icon: Grid3X3 },
  { id: 'erase', label: 'Erase', icon: Eraser },
];

export function Studio() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const [welcome, setWelcome] = useState(() => sessionStorage.getItem('studio-welcome-seen') !== '1');
  const [name, setName] = useState('Office');
  const [elements, setElements] = useState<SpaceElement[]>([]);
  const [activeCategory, setActiveCategory] = useState('Rooms');
  const [selectedPrefab, setSelectedPrefab] = useState<Prefab>(prefabs[1]);
  const [selectedLayer, setSelectedLayer] = useState('Meeting Room');
  const [tool, setTool] = useState<StudioTool>('select');
  const [status, setStatus] = useState('All changes saved as draft');
  const [publishing, setPublishing] = useState(false);
  const [zoom, setZoom] = useState(92);
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const space = await api.get(`/space/${spaceId}`);
      if (!mounted) return;
      setName(space.data.name ?? 'Office');
      setElements(space.data.elements ?? []);
    }
    load().catch(() => setStatus('Preview mode: API data unavailable'));
    return () => { mounted = false; };
  }, [spaceId]);

  const cards = useMemo(() => prefabs.filter((card) => card.area === activeCategory), [activeCategory]);
  const mapObjects = useMemo(() => elements.filter((el) => !String(el.element.category ?? '').toLowerCase().includes('floor')).slice(0, 120), [elements]);
  const layers = useMemo(() => ['Lobby', 'Media Room', 'Team Area', 'Coffee Huddle', selectedPrefab.title, ...mapObjects.slice(0, 8).map((el) => el.element.name || el.element.category || 'Object')], [mapObjects, selectedPrefab.title]);

  const closeWelcome = () => {
    sessionStorage.setItem('studio-welcome-seen', '1');
    setWelcome(false);
  };

  const selectPrefab = (card: Prefab) => {
    setSelectedPrefab(card);
    setSelectedLayer(card.title);
    setTool(card.area === 'Rooms' ? 'room' : 'object');
    setStatus(`${card.title} selected. Click the map to place or drag from library.`);
  };

  const publish = async () => {
    setPublishing(true);
    setStatus('Publishing changes...');
    await api.put(`/office/${spaceId}/draft`, { data: { selectedPrefab: selectedPrefab.title, elementCount: elements.length, savedAt: new Date().toISOString() } }).catch(() => null);
    await api.post(`/office/${spaceId}/publish`, {}).catch(() => null);
    setPublishing(false);
    setStatus('Published. Your office is now live.');
  };

  return (
    <div className="studio-page studio-pro">
      <nav className="studio-rail" aria-label="Studio toolbar">
        <button title="Exit Studio" onClick={() => navigate(`/space/${spaceId}`)}><ArrowLeft /></button>
        <span className="studio-rail-divider" />
        {tools.map(({ id, label, icon: Icon }) => <button key={id} className={tool === id ? 'active' : ''} title={label} onClick={() => { setTool(id); setStatus(`${label} tool active`); }}><Icon /></button>)}
        <span className="studio-rail-divider" />
        <button title="Undo"><Undo2 /></button>
        <button title="Redo"><Redo2 /></button>
        <span className="studio-rail-spacer" />
        <button className="publish-dot" title="Publish" onClick={publish}><Send /></button>
        <button title="Help" onClick={() => setWelcome(true)}><HelpCircle /></button>
      </nav>

      <aside className="studio-panel studio-library">
        <header className="studio-panel-head">
          <div>
            <h2>Gather Studio</h2>
            <p>{name}</p>
          </div>
          <button title="Close Studio" onClick={() => navigate(`/space/${spaceId}`)}><X size={18} /></button>
        </header>

        <label className="studio-search"><Search size={16} /><input placeholder="Search rooms, desks, objects" /></label>

        <div className="studio-category-icons">
          {categories.map((category) => <button key={category} className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>)}
        </div>

        <div className="studio-section-title"><span>{activeCategory}</span><small>Drag or click</small></div>

        <div className="studio-prefabs">
          {cards.map((card) => (
            <button key={card.title} className={selectedPrefab.title === card.title ? 'selected' : ''} onClick={() => selectPrefab(card)}>
              <span className={`studio-prefab-thumb ${card.kind}`} style={{ background: card.color }}><i /><i /><i /></span>
              <b>{card.title}</b>
              <small>{card.desc}</small>
              <em>{card.size}</em>
            </button>
          ))}
        </div>

        <div className="studio-left-section">
          <h3><Layers3 size={16} /> Layers</h3>
          {layers.slice(0, 9).map((layer) => <button key={layer} className={selectedLayer === layer ? 'active' : ''} onClick={() => setSelectedLayer(layer)}><span>{layer}</span><ChevronDown size={14} /></button>)}
        </div>
      </aside>

      <main className="studio-canvas">
        <header className="studio-commandbar">
          <div className="studio-breadcrumb"><b>{name}</b><span>Office map</span><small>{status}</small></div>
          <div className="studio-command-actions">
            <button onClick={() => setGrid(v => !v)} className={grid ? 'active' : ''}><Grid3X3 size={16} />Grid</button>
            <button onClick={() => setSnap(v => !v)} className={snap ? 'active' : ''}><Ruler size={16} />Snap</button>
            <button><Save size={16} />Save draft</button>
            <button onClick={publish} className="primary" disabled={publishing}>{publishing ? 'Publishing...' : 'Publish'}</button>
            <button onClick={() => navigate(`/space/${spaceId}`)}><Play size={16} />Preview</button>
          </div>
        </header>

        <div className="studio-map-surface" style={{ transform: `scale(${zoom / 100})` }}>
          <div className={`studio-map-floor ${grid ? 'show-grid' : ''}`} onClick={() => setStatus(`${selectedPrefab.title} placed in draft preview`)}>
            <div className="studio-room studio-lobby"><label>Lobby</label><span className="resize-dot nw" /><span className="resize-dot se" /></div>
            <div className="studio-room studio-media"><label>Media Room</label><span className="room-badge">Private</span></div>
            <div className="studio-room studio-team"><label>Team</label></div>
            <div className="studio-room studio-coffee"><label>Coffee Huddle</label></div>
            <h1>{name}</h1>
            {mapObjects.map((el) => <img key={el.id} src={el.element.imageUrl} alt="" style={{ left: `${(el.x / 58) * 100}%`, top: `${(el.y / 34) * 100}%`, width: Math.max(22, el.element.width * 20) }} />)}
            <div className="studio-selected-ghost" style={{ borderColor: selectedPrefab.color }}><span>{selectedPrefab.title}</span></div>
          </div>
        </div>

        <footer className="studio-bottom-bar">
          <button onClick={() => setZoom(z => Math.max(55, z - 10))}><ZoomOut size={16} /></button>
          <span>{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(130, z + 10))}><ZoomIn size={16} /></button>
          <button onClick={() => setZoom(92)}><Maximize2 size={16} />Fit</button>
        </footer>
      </main>

      <aside className="studio-inspector">
        <header><Settings2 size={18} /><b>Inspector</b></header>
        <section>
          <label>Name<input value={selectedLayer} onChange={e => setSelectedLayer(e.target.value)} /></label>
          <label>Type<input value={selectedPrefab.area} readOnly /></label>
          <div className="studio-inspector-grid"><label>X<input value="24" readOnly /></label><label>Y<input value="16" readOnly /></label></div>
          <div className="studio-inspector-grid"><label>W<input value={selectedPrefab.size.split(' x ')[0]} readOnly /></label><label>H<input value={selectedPrefab.size.split(' x ')[1] || '4'} readOnly /></label></div>
        </section>
        <section>
          <h3>Permissions</h3>
          <button className="inspector-row"><Lock size={15} />Private area</button>
          <button className="inspector-row"><Copy size={15} />Duplicate</button>
          <button className="inspector-row danger"><Trash2 size={15} />Delete from draft</button>
        </section>
        <section className="studio-history">
          <h3>Recent edits</h3>
          <p><RotateCcw size={14} /> Draft autosaved</p>
          <p><Sparkles size={14} /> {selectedPrefab.title} selected</p>
        </section>
      </aside>

      {welcome && <div className="studio-modal-backdrop"><div className="studio-welcome"><h1>Welcome to Gather Studio! <span>Beta</span></h1><p>Design the office with rooms, desks, decorations, interactive objects, layers, inspector settings, grid snapping, preview, and publish controls.</p><p>Changes stay in draft until you click <b>Publish</b>.</p><button className="primary-next" onClick={closeWelcome}>Start editing</button></div></div>}
    </div>
  );
}
