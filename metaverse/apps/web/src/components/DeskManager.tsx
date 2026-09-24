import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, Send } from 'lucide-react';
import { api } from '../utils/api';

interface Desk { id: string; label: string; teamName: string; x: number; y: number; user?: { username: string } | null; }
export function DeskManager() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const [desks, setDesks] = useState<Desk[]>([]);
  const [name, setName] = useState('Office');
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState('Desk Manager locks desk claiming while you edit assignments.');
  const loadDesks = async () => { const [space, res] = await Promise.all([api.get(`/space/${spaceId}`), api.get(`/office/${spaceId}/desks`)]); setName(space.data.name); setDesks(res.data.desks ?? []); };
  useEffect(() => {
    async function load() { const [space, res] = await Promise.all([api.get(`/space/${spaceId}`), api.get(`/office/${spaceId}/desks`)]); setName(space.data.name); setDesks(res.data.desks ?? []); }
    load().catch(() => setMsg('Failed to load desks'));
  }, [spaceId]);
  const addDesk = async () => { await api.post(`/office/${spaceId}/desks`, { label: `Desk ${desks.length + 1}`, teamName: 'Team', x: 8 + desks.length, y: 18 }); await loadDesks(); };
  const publish = async () => { await api.post(`/office/${spaceId}/publish`, {}); setMsg('Desk assignments published.'); };
  const visible = desks.filter(d => `${d.label} ${d.teamName} ${d.user?.username ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="desk-page"><main className="desk-map"><button className="desk-back" onClick={() => navigate(`/space/${spaceId}`)}><ArrowLeft size={18} /> Back to office</button><div className="desk-map-frame"><h1>{name}</h1>{visible.map(d => <div key={d.id} className="desk-pin" style={{ left: `${Math.min(90, d.x)}%`, top: `${Math.min(90, d.y)}%` }}>🪑<span>{d.label}</span></div>)}</div></main><aside className="desk-panel"><h2>Desk Manager</h2><p>{msg}</p><div className="desk-actions"><button onClick={addDesk}>Add</button><button onClick={publish}><Send size={15} /> Publish</button></div><label className="studio-search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search people" /></label><div className="desk-overview"><b>Team</b><span>{Math.max(0, 5 - desks.length)} desks available</span></div>{visible.map(d => <div className="desk-row" key={d.id}><span>🧑‍💻</span><div><b>{d.user?.username ?? 'Unassigned'}</b><small>{d.label} • {d.teamName}</small></div></div>)}</aside></div>;
}
