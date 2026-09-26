import { ArrowLeft, MousePointer2, Hand, BoxSelect, Grid3X3, Eraser, Undo2, Redo2, Send, HelpCircle, SquareDashed } from 'lucide-react';

export type StudioTool = 'select' | 'hand' | 'erase' | 'room' | 'object' | 'area';

const tools: { id: StudioTool; label: string; icon: any }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'hand', label: 'Pan', icon: Hand },
  { id: 'area', label: 'Area', icon: SquareDashed },
  { id: 'room', label: 'Room', icon: BoxSelect },
  { id: 'object', label: 'Object', icon: Grid3X3 },
  { id: 'erase', label: 'Erase', icon: Eraser },
];

interface Props {
  tool: StudioTool;
  onToolChange: (tool: StudioTool) => void;
  onBack: () => void;
  onPublish: () => void;
  onHelp: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  publishing?: boolean;
}

const railBtn = (active = false, disabled = false): React.CSSProperties => ({
  width: 38, height: 38, border: 'none', borderRadius: 10,
  background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
  color: disabled ? '#555' : (active ? '#fff' : '#d8d8d8'),
  cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
  opacity: disabled ? 0.5 : 1,
});

const divider: React.CSSProperties = { width: 28, height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' };

export function StudioRail({ tool, onToolChange, onBack, onPublish, onHelp, onUndo, onRedo, canUndo, canRedo, publishing }: Props) {
  return (
    <nav style={{ background: '#1b1b1c', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 6 }}>
      <button title="Exit Studio" onClick={onBack} style={railBtn()}><ArrowLeft size={20} /></button>
      <div style={divider} />
      {tools.map(({ id, label, icon: Icon }) => (
        <button key={id} title={label} onClick={() => onToolChange(id)} style={railBtn(tool === id)}>
          <Icon size={18} />
        </button>
      ))}
      <div style={divider} />
      <button title="Undo" onClick={onUndo} disabled={!canUndo} style={railBtn(false, !canUndo)}><Undo2 size={18} /></button>
      <button title="Redo" onClick={onRedo} disabled={!canRedo} style={railBtn(false, !canRedo)}><Redo2 size={18} /></button>
      <div style={{ flex: 1 }} />
      <button 
        title={publishing ? "Publishing..." : "Publish"} 
        onClick={onPublish} 
        disabled={publishing}
        style={{ ...railBtn(), background: publishing ? '#555' : '#6f55d8', color: '#fff', boxShadow: publishing ? 'none' : '0 8px 18px rgba(111,85,216,0.35)', cursor: publishing ? 'wait' : 'pointer' }}
      >
        <Send size={18} opacity={publishing ? 0.5 : 1} />
      </button>
      <button title="Help" onClick={onHelp} style={railBtn()}><HelpCircle size={18} /></button>
    </nav>
  );
}
