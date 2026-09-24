import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, MoreHorizontal, Plus, Search, Settings, User2 } from 'lucide-react';
import { useUserStore } from '../store';
import { api } from '../utils/api';
import { useToast } from '../utils/toast';

interface Space { id: string; name: string; dimensions: string; thumbnail?: string; }

const OFFICE_THUMBNAIL_FALLBACK = "/map-template.jpg";

export function Dashboard() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const { logout, type } = useUserStore();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();

  useEffect(() => {
    api.get('/space/all')
      .then(res => setSpaces(res.data.spaces ?? []))
      .catch(() => toast('Failed to load spaces', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const filtered = spaces.filter(space => space.name.toLowerCase().includes(query.toLowerCase()));

  const deleteSpace = async (space: Space) => {
    if (!await confirm(`Delete ${space.name}?`)) return;
    await api.delete(`/space/${space.id}`);
    setSpaces(prev => prev.filter(item => item.id !== space.id));
  };

  return (
    <div className="gather-dashboard">
      <header className="gather-dash-topbar">
        <div className="dash-logo-group">
          <div className="dash-logo">Clone</div>
          <span className="dash-badge">Beta</span>
        </div>
        <nav className="dash-nav-right">
          <button className="nav-ghost">Resources</button>
          {type === 'admin' && <button className="nav-ghost" onClick={() => navigate('/admin')}>Admin</button>}
          <div className="nav-divider"></div>
          <button className="account-pill"><User2 size={16} strokeWidth={2.5} /> <span>Account</span></button>
          <button className="create-space-btn" onClick={() => navigate('/create')}><Plus size={18} strokeWidth={2.5} /> Create Space</button>
          <button className="icon-plain logout-btn" onClick={() => { logout(); navigate('/login'); }} title="Sign out"><LogOut size={18} /></button>
        </nav>
      </header>

      <main className="gather-dash-main">
        <section className="dash-hero-banner">
          <img src="/dash-hero.jpg" alt="Virtual world" className="dash-hero-bg" />
          <div className="dash-hero-overlay"></div>
          <div className="dash-hero-content">
            <span className="eyebrow">Virtual HQ</span>
            <h1>Your spaces</h1>
            <p>Create an office, invite teammates, then customize rooms, desks, chat, video and map objects.</p>
            <div className="dash-hero-actions">
              <button className="create-space-btn big" onClick={() => navigate('/create')}><Plus size={18} strokeWidth={2.5} /> Create Space</button>
            </div>
          </div>
        </section>

        <div className="dash-tabs-row">
          <div className="dash-tabs"><button className="active">Last Visited</button><button>Created Spaces</button></div>
          <label className="dash-search"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search spaces" /></label>
        </div>

        {loading ? <div className="dash-loading">Setting up your lobby…</div> : (
          <div className="gather-space-grid">
            {filtered.map(space => (
              <article className="gather-space-card" key={space.id}>
                <button className="space-preview" onClick={() => navigate(`/space/${space.id}/join`)}>
                  <img src={space.thumbnail || OFFICE_THUMBNAIL_FALLBACK} alt="" onError={(event) => { event.currentTarget.src = OFFICE_THUMBNAIL_FALLBACK; }} />
                </button>
                <div className="space-card-row">
                  <div><h3>{space.name}</h3><p>Last visited today • {space.dimensions}</p></div>
                    <div className="space-menu-wrap">
                      <button className="icon-plain" aria-label="Menu"><MoreHorizontal size={20} /></button>
                      <div className="space-menu">
                        <button onClick={() => navigate(`/space/${space.id}`)}>Enter office</button>
                        <button onClick={() => navigate(`/studio/${space.id}`)}>Edit in Studio</button>
                        <button onClick={() => navigate(`/desk-manager/${space.id}`)}>Desk manager</button>
                        <div className="space-menu-divider"></div>
                        <button className="danger" onClick={() => deleteSpace(space)}>Delete space</button>
                      </div>
                    </div>
                </div>
              </article>
            ))}
            {!filtered.length && <div className="empty-spaces"><Settings size={28} /><p>No spaces yet. Create your first office.</p></div>}
          </div>
        )}
      </main>
    </div>
  );
}
