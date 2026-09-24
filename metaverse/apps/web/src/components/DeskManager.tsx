import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, Send } from 'lucide-react';
import { api } from '../utils/api';

interface Desk { id: string; label: string; teamName: string; x: number; y: number; user?: { username: string } | null; }
export function DeskManager() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const [desks, setDesks] = useState<Desk[]>([]);
  const [spaceObj, setSpaceObj] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState('Desk Manager locks desk claiming while you edit assignments.');
  
  const loadDesks = async () => { 
    try {
      let spaceData = null;
      let desksData = [];
      try {
        const spaceRes = await api.get(`/space/${spaceId}`);
        spaceData = spaceRes.data;
      } catch (e: any) {
        console.error("Space API failed:", e);
        throw new Error(`Space API: ${e.response?.data?.message || e.message}`);
      }
      
      try {
        const desksRes = await api.get(`/office/${spaceId}/desks`);
        desksData = desksRes.data.desks ?? [];
      } catch (e: any) {
        console.error("Desks API failed:", e);
        throw new Error(`Desks API: ${e.response?.data?.message || e.message}`);
      }

      setSpaceObj(spaceData); 
      setDesks(desksData); 
      setMsg('Click on the map to add a desk, or select a user from the list.');
    } catch (e: any) {
      console.error(e);
      const errMsg = e.message;
      setMsg(`Error: ${errMsg}`);
    }
  };

  useEffect(() => {
    loadDesks();
  }, [spaceId]);
  const handleMapClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!spaceObj) return;
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Parse dimensions "100x100"
    const dim = (spaceObj.dimensions || "100x100").split('x');
    const width = parseInt(dim[0]) || 100;
    const height = parseInt(dim[1]) || 100;

    const x = Math.floor(((e.clientX - rect.left) / rect.width) * width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * height);
    
    const label = prompt("Enter a label for this new desk (e.g. Employee Name):", `Desk ${desks.length + 1}`);
    if (!label) return;
    
    await api.post(`/office/${spaceId}/desks`, { label, teamName: 'Engineering', x, y })
      .catch(err => alert(err.response?.data?.message || err.message));
      
    await loadDesks();
  };

  const handleAssign = async (id: string) => {
    const username = prompt("Enter the exact Username to assign (or leave blank to unassign):");
    if (username !== null) {
      await api.put(`/office/${spaceId}/desks/${id}`, { username: username.trim() }).catch(err => alert(err.response?.data?.message || err.message));
      await loadDesks();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this desk?")) {
      await api.delete(`/office/${spaceId}/desks/${id}`).catch(err => alert(err.response?.data?.message || err.message));
      await loadDesks();
    }
  };

  const visible = desks.filter(d => `${d.label} ${d.teamName} ${d.user?.username ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  
  return (
    <div className="desk-page">
      <main className="desk-map">
        <header className="desk-header">
          <button className="desk-back" onClick={() => navigate(`/space/${spaceId}`)}><ArrowLeft size={18} /> Back to office</button>
          <div className="desk-header-title">
            <h1>{spaceObj?.name || 'Office'}</h1>
            <span className="badge">Draft Mode</span>
          </div>
          <button className="primary-next publish-btn" onClick={() => navigate(`/space/${spaceId}`)}><Send size={15} /> Publish Changes</button>
        </header>
        <div className="desk-map-frame" onClick={handleMapClick} style={{ cursor: 'pointer' }} title="Click anywhere to drop a desk">
          <img src={spaceObj?.thumbnail || "/map-template.jpg"} alt="Map background" className="desk-map-bg" />
          {visible.map(d => {
            const dim = (spaceObj?.dimensions || "100x100").split('x');
            const mapW = parseInt(dim[0]) || 100;
            const mapH = parseInt(dim[1]) || 100;
            const leftPct = (d.x / mapW) * 100;
            const topPct = (d.y / mapH) * 100;
            return (
              <div key={d.id} className="desk-pin" style={{ left: `${leftPct}%`, top: `${topPct}%` }} title={d.label}>
                <div className="desk-pin-dot"></div>
                <span>{d.label}</span>
              </div>
            );
          })}
        </div>
      </main>
      <aside className="desk-panel">
        <div className="panel-header">
          <h2>Desk Manager</h2>
          <p>{msg}</p>
        </div>
        <label className="studio-search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or desk..." /></label>
        
        <div className="desk-list">
          <div className="desk-overview">
            <b>All Desks</b>
            <small style={{ color: '#6b7280' }}>Click map to add desk</small>
          </div>
          {visible.length === 0 && <p className="muted" style={{textAlign: 'center', padding: '40px 0'}}>No desks found.</p>}
          {visible.map(d => (
            <div className="desk-row" key={d.id}>
              <div className="desk-avatar">{d.user?.username ? d.user.username[0].toUpperCase() : '?'}</div>
              <div className="desk-info">
                <b>{d.user?.username ?? 'Unassigned'}</b>
                <small>{d.label} • {d.teamName}</small>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="assign-btn" onClick={() => handleAssign(d.id)}>Assign</button>
                <button className="assign-btn" style={{ color: '#dc2626' }} onClick={(e) => handleDelete(d.id, e)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
