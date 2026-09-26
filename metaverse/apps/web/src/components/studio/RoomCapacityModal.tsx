import { useState } from "react";
import { X, Users, Sparkles, Check } from "lucide-react";

interface RoomCapacityModalProps {
  roomName?: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (capacity: number) => void;
}

export function RoomCapacityModal({
  roomName = "Dynamic Meeting Room",
  isOpen,
  onClose,
  onConfirm,
}: RoomCapacityModalProps) {
  const [capacity, setCapacity] = useState(8);

  if (!isOpen) return null;

  const capacityOptions = [
    { count: 2, label: "2 People", tag: "Private Focus Pod", dims: "5×5 tiles" },
    { count: 4, label: "4 People", tag: "Small Team Huddle", dims: "6×5 tiles" },
    { count: 8, label: "8 People", tag: "Executive Conference", dims: "8×6 tiles" },
    { count: 12, label: "12 People", tag: "Large Boardroom", dims: "10×7 tiles" },
    { count: 16, label: "16 People", tag: "Full Assembly Hall", dims: "12×8 tiles" },
  ];

  const handleConfirm = () => {
    onConfirm(capacity);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: "1rem",
      }}
    >
      <div
        className="glass animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "540px",
          background: "#0f172a",
          color: "#f8fafc",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
          padding: "1.5rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <Users size={22} color="#3b82f6" /> Select Room Capacity
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 4, marginBottom: 0 }}>
              Choose capacity for <b>{roomName}</b>. Chairs, tables & walls auto-scale instantly from DB!
            </p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#f8fafc",
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Capacity Options Grid */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: "0.5rem" }}>
            How many seats / people?
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
            {capacityOptions.map((opt) => {
              const isSelected = capacity === opt.count;
              return (
                <div
                  key={opt.count}
                  onClick={() => setCapacity(opt.count)}
                  style={{
                    padding: "0.85rem",
                    borderRadius: "12px",
                    background: isSelected ? "rgba(59, 130, 246, 0.25)" : "rgba(30, 41, 59, 0.6)",
                    border: `2px solid ${isSelected ? "#3b82f6" : "rgba(255,255,255,0.1)"}`,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>{opt.label}</div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{opt.tag}</div>
                    <div style={{ fontSize: "0.68rem", color: "#60a5fa", fontWeight: 600, marginTop: 4 }}>
                      📐 Auto-Scale: {opt.dims}
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={14} color="#fff" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "#f8fafc",
              border: "1px solid rgba(255,255,255,0.15)",
              padding: "0.6rem 1.25rem",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleConfirm}
            style={{
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              color: "#ffffff",
              border: "none",
              padding: "0.6rem 1.5rem",
              borderRadius: "10px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Sparkles size={16} /> Place {capacity}-Person Room
          </button>
        </div>
      </div>
    </div>
  );
}
