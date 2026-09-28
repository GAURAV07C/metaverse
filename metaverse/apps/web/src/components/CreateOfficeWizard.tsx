import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Link as LinkIcon, Mail, Sparkles } from 'lucide-react';
import { api } from '../utils/api';

interface MapTemplate { id: string; name: string; dimensions: string; thumbnail?: string; elementCount: number; type?: string; }

export function CreateOfficeWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [maps, setMaps] = useState<MapTemplate[]>([]);
  const [name, setName] = useState('');
  const [mapId, setMapId] = useState<string>('');
  const [spaceId, setSpaceId] = useState<string>('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/maps')
      .then(res => { 
        const list = (res.data.maps ?? []).filter((m: any) => m.type !== 'room'); 
        setMaps(list); 
        setMapId(list.find((m: MapTemplate) => /gather/i.test(m.name))?.id ?? list[0]?.id ?? ''); 
      })
      .catch(() => setMaps([]));
  }, []);

  const create = async () => {
    setBusy(true);
    try {
      const res = await api.post('/space', { name, dimensions: '96x64', mapId: mapId || undefined });
      const id = res.data.spaceId;
      setSpaceId(id);
      const invite = await api.post(`/office/${id}/invites`, { role: 'Member' });
      setInviteUrl(`${window.location.origin}${invite.data.url}`);
      setStep(2);
    } catch (e: any) {
      console.error(e);
      alert('Failed to create space: ' + (e.response?.data?.message || e.message));
    } finally {
      setBusy(false);
    }
  };

  return <div className="create-wizard-page">
    <div className="wizard-bg-layer">
      <img src="/wizard-bg.jpg" alt="Dreamy landscape" />
      <div className="wizard-bg-overlay"></div>
    </div>
    
    <header className="wizard-topbar">
      <div className="wizard-top-left">
        {step > 0 && step < 2 ? (
          <button className="wizard-back-btn" onClick={() => setStep(step - 1)}><ArrowLeft size={18} /> Back</button>
        ) : (
          <button onClick={() => navigate('/dashboard')} className="gather-classic">Clone</button>
        )}
      </div>
      <div className="step-dots">{Array.from({ length: 3 }).map((_, i) => <span key={i} className={i <= step ? 'active' : ''} />)}</div>
      <button className="wizard-close-btn" onClick={() => navigate('/dashboard')}>Cancel</button>
    </header>

    <main className="create-flow-card glass-panel">
      {step === 0 && <><div className="wizard-step-header"><h1>What should we call your office?</h1><p>Give your new virtual workspace a name.</p></div><input className="wizard-input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Corp HQ" /><button className="primary-next" disabled={!name.trim()} onClick={() => setStep(1)}>Next</button></>}
      {step === 1 && <><div className="wizard-step-header"><h1>Choose a Map Template</h1><p>Select the starting layout and style for your office.</p></div><div className="template-grid">{maps.map(m => <button key={m.id} className={mapId === m.id ? 'selected' : ''} onClick={() => setMapId(m.id)}><div className="template-img-wrap"><img src={m.thumbnail || "/map-template.jpg"} alt={m.name} /></div><b>{m.name}</b><small>{m.dimensions} • {m.elementCount} objects</small></button>)}</div><button className="primary-next" disabled={busy} onClick={create}>{busy ? 'Setting your office up…' : 'Set up office'}</button></>}
      {step === 2 && <><div className="wizard-step-header"><div className="ready-badge"><Sparkles size={28} /></div><h1>Invite your team</h1><p className="muted">Copy this office invite link or continue straight into browser.</p></div><div className="invite-copy"><LinkIcon size={18} /><input readOnly value={inviteUrl} /><button onClick={() => navigator.clipboard.writeText(inviteUrl)}><Copy size={16} /> Copy</button></div><div className="wizard-actions-row"><button className="ghost-next"><Mail size={16} /> Invite with email</button><button className="primary-next" onClick={() => navigate(`/space/${spaceId}/join`)}>Continue in browser</button></div></>}
    </main>
  </div>;
}

