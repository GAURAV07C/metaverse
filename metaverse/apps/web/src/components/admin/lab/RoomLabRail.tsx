import { ArrowLeft, MousePointer2, Hand, BoxSelect, Grid3X3, Eraser, Undo2, Redo2, Send } from "lucide-react";

export type RoomLabTool = "select" | "hand" | "room" | "object" | "erase";

interface RoomLabRailProps {
  tool: RoomLabTool;
  onToolChange: (tool: RoomLabTool) => void;
  onBack: () => void;
  onPublish: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isPublishing?: boolean;
}

const railBtn = (active = false, disabled = false): React.CSSProperties => ({
  width: 38,
  height: 38,
  border: "none",
  borderRadius: 10,
  background: active ? "rgba(255,255,255,0.18)" : "transparent",
  color: disabled ? "#475569" : active ? "#ffffff" : "#94a3b8",
  cursor: disabled ? "not-allowed" : "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.15s ease",
  opacity: disabled ? 0.5 : 1,
});

const divider: React.CSSProperties = {
  width: 26,
  height: 1,
  background: "rgba(255,255,255,0.1)",
  margin: "4px 0",
};

export function RoomLabRail({
  tool,
  onToolChange,
  onBack,
  onPublish,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isPublishing,
}: RoomLabRailProps) {
  const tools: { id: RoomLabTool; label: string; icon: any }[] = [
    { id: "select", label: "Select Item", icon: MousePointer2 },
    { id: "hand", label: "Pan Canvas", icon: Hand },
    { id: "room", label: "Place Room Prefab", icon: BoxSelect },
    { id: "object", label: "Place Object", icon: Grid3X3 },
    { id: "erase", label: "Eraser Tool", icon: Eraser },
  ];

  return (
    <nav
      style={{
        width: 56,
        background: "#0f172a",
        borderRight: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "12px 0",
        gap: 6,
        zIndex: 10,
      }}
    >
      <button type="button" title="Close Studio" onClick={onBack} style={railBtn()}>
        <ArrowLeft size={18} />
      </button>

      <div style={divider} />

      {tools.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={label}
          onClick={() => onToolChange(id)}
          style={railBtn(tool === id)}
        >
          <Icon size={18} />
        </button>
      ))}

      <div style={divider} />

      <button
        type="button"
        title="Undo (Ctrl+Z)"
        onClick={onUndo}
        disabled={!canUndo}
        style={railBtn(false, !canUndo)}
      >
        <Undo2 size={18} />
      </button>

      <button
        type="button"
        title="Redo (Ctrl+Y)"
        onClick={onRedo}
        disabled={!canRedo}
        style={railBtn(false, !canRedo)}
      >
        <Redo2 size={18} />
      </button>

      <div style={{ flex: 1 }} />

      <button
        type="button"
        title={isPublishing ? "Publishing Template..." : "Publish Template to Store"}
        onClick={onPublish}
        disabled={isPublishing}
        style={{
          ...railBtn(),
          background: isPublishing ? "#475569" : "#6366f1",
          color: "#ffffff",
          boxShadow: isPublishing ? "none" : "0 6px 16px rgba(99, 102, 241, 0.4)",
          cursor: isPublishing ? "wait" : "pointer",
        }}
      >
        <Send size={18} opacity={isPublishing ? 0.5 : 1} />
      </button>
    </nav>
  );
}
