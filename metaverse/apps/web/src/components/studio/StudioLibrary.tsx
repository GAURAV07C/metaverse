import { useMemo, useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { categories, prefabs, type Prefab } from './prefabs';

interface Props {
  selectedPrefab: Prefab;
  onSelect: (card: Prefab) => void;
  onClose: () => void;
  name?: string;
  status?: string;
}

export function StudioLibrary({ selectedPrefab, onSelect, onClose, name = 'Office', status = 'Ready' }: Props) {
  const [activeCategory, setActiveCategory] = useState('Rooms');
  const [search, setSearch] = useState('');

  const cards = useMemo(() => {
    let filtered = prefabs.filter(c => c.area === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = prefabs.filter(c => c.title.toLowerCase().includes(q) || c.kind.toLowerCase().includes(q));
    }
    return filtered;
  }, [activeCategory, search]);

  const handleDragStart = (e: React.DragEvent, card: Prefab) => {
    e.dataTransfer.setData('application/json', JSON.stringify(card));
    e.dataTransfer.effectAllowed = 'copy';
    (window as any).__draggedPrefab = card;
  };

  const handleDragEnd = () => {
    (window as any).__draggedPrefab = null;
  };

  return (
    <aside style={{ background: '#fff', borderRight: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>{name}</span>
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginTop: 2 }}>{status}</span>
        </div>
        <button onClick={onClose} style={{ border: '1px solid #e5e5e5', background: '#fff', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '0 16px 12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '1px solid #e5e5e5', borderRadius: 8, padding: '8px 12px' }}>
          <Search size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search for objects"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#111', width: '100%' }}
          />
        </label>
      </div>

      {/* Category Icon Tabs */}
      <div style={{ display: 'flex', gap: 2, padding: '0 16px 12px', overflowX: 'auto', flexShrink: 0 }}>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => { setActiveCategory(c.id); setSearch(''); }}
            title={c.id}
            style={{
              width: 32, height: 32, minWidth: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none',
              background: activeCategory === c.id && !search ? '#f3f4f6' : 'transparent',
              borderRadius: 6, cursor: 'pointer',
              color: activeCategory === c.id && !search ? '#111' : '#9ca3af',
              transition: 'all 0.15s',
            }}
          >
            <c.icon size={18} strokeWidth={1.5} />
          </button>
        ))}
        <button style={{ width: 32, height: 32, minWidth: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', color: '#9ca3af' }}>
          <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
        </button>
      </div>

      {/* Prefab Cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {cards.map(card => (
            <button
              key={card.title}
              onClick={() => onSelect(card)}
              draggable
              onDragStart={e => handleDragStart(e, card)}
              onDragEnd={handleDragEnd}
              style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                background: 'transparent', border: 'none', cursor: 'grab', padding: 0, textAlign: 'left',
              }}
            >
              <div style={{
                width: '100%', aspectRatio: '4/3', borderRadius: 8,
                border: selectedPrefab.title === card.title ? '2px solid #6366f1' : '1px solid #e5e5e5',
                overflow: 'hidden', background: '#f9fafb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {card.thumb ? (
                  <img src={card.thumb} alt={card.title} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
                ) : (
                  <div style={{ width: '70%', height: '70%', borderRadius: 6, background: card.color }} />
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{card.title}</span>
            </button>
          ))}
        </div>
        {cards.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>
            {search ? `No results for "${search}"` : 'No objects in this category yet.'}
          </div>
        )}
      </div>
    </aside>
  );
}
