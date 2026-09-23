import React from 'react';
import { ArrowLeft, Users, Layers, Check, Link2, Menu } from 'lucide-react';

interface ArenaHeaderProps {
  spaceId: string | undefined;
  wsStatus: 'connecting' | 'connected' | 'error';
  showUsers: boolean;
  setShowUsers: (val: boolean | ((prev: boolean) => boolean)) => void;
  otherUsersCount: number;
  copied: boolean;
  handleCopyInvite: () => void;
  showPanel: boolean;
  setShowPanel: (val: boolean | ((prev: boolean) => boolean)) => void;
  fetchAvailableElements: () => void;
  onNavigateBack: () => void;
}

export const ArenaHeader: React.FC<ArenaHeaderProps> = ({
  spaceId,
  wsStatus,
  showUsers,
  setShowUsers,
  otherUsersCount,
  copied,
  handleCopyInvite,
  showPanel,
  setShowPanel,
  fetchAvailableElements,
  onNavigateBack,
}) => {
  return (
    <header className="arena-header glass">
      <button 
        className="btn-icon" 
        onClick={() => setShowUsers(prev => !prev)} 
        title={showUsers ? "Hide Sidebar Menu" : "Show Sidebar Menu"}
      >
        <Menu size={18} />
      </button>

      <button 
        className="btn-icon" 
        onClick={onNavigateBack} 
        title="Back to Dashboard"
      >
        <ArrowLeft size={18} />
      </button>

      <div className="arena-title">
        <span 
          className="arena-dot" 
          style={{ background: wsStatus === 'connected' ? 'var(--success)' : wsStatus === 'error' ? 'var(--danger)' : '#f59e0b' }} 
        />
        Space: <strong>{spaceId?.slice(0, 8)}…</strong>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', alignItems: 'center' }}>
        {/* Invite button */}
        <button
          className="btn"
          style={{
            fontSize: '0.8rem',
            padding: '0.45rem 0.9rem',
            background: copied ? 'rgba(16,185,129,0.2)' : undefined,
            borderColor: copied ? 'var(--success)' : undefined
          }}
          onClick={handleCopyInvite}
          title="Copy invite link"
        >
          {copied ? <><Check size={14} style={{ marginRight: 4 }} />Copied!</> : <><Link2 size={14} style={{ marginRight: 4 }} />Invite</>}
        </button>

        {/* Online users toggle */}
        <button
          className="btn"
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
          onClick={() => setShowUsers(prev => !prev)}
        >
          <Users size={14} style={{ marginRight: 4 }} /> {otherUsersCount + 1} Online
        </button>

        {/* Elements panel toggle */}
        <button
          className="btn"
          style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          onClick={() => { setShowPanel(prev => !prev); fetchAvailableElements(); }}
        >
          <Layers size={16} style={{ marginRight: 4 }} />
          {showPanel ? 'Hide' : 'Elements'}
        </button>
      </div>
    </header>
  );
};
