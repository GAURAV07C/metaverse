import { X } from 'lucide-react';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null;

  return (
    <div className="shortcuts-backdrop" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <section className="shortcuts-modal">
        <header>
          <div>
            <strong>Keyboard shortcuts</strong>
            <span>Move faster around the office.</span>
          </div>
          <button onClick={onClose} aria-label="Close shortcuts" title="Close shortcuts"><X size={18} /></button>
        </header>
        <div className="shortcuts-grid">
          <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>Move avatar</span></div>
          <div><kbd>Arrow keys</kbd><span>Move avatar</span></div>
          <div><kbd>Click map</kbd><span>Walk to tile</span></div>
          <div><kbd>Drag map</kbd><span>Pan camera</span></div>
          <div><kbd>Mouse wheel</kbd><span>Zoom map</span></div>
          <div><kbd>X</kbd><span>Interact / use portal</span></div>
          <div><kbd>?</kbd><span>Open shortcuts</span></div>
          <div><kbd>Esc</kbd><span>Close panels</span></div>
        </div>
      </section>
    </div>
  );
}
