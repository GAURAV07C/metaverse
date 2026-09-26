import { useState } from "react";
import { Plus, X, Image as ImageIcon } from "lucide-react";

interface VariantsBuilderProps {
  variants: Record<string, Record<string, string>>;
  onChange: (v: Record<string, Record<string, string>>) => void;
}

export function VariantsBuilder({ variants, onChange }: VariantsBuilderProps) {
  const [newColor, setNewColor] = useState("#ffffff");

  const addColor = () => {
    if (variants[newColor]) return;
    onChange({
      ...variants,
      [newColor]: { "0": "", "90": "", "180": "", "270": "" },
    });
  };

  const removeColor = (color: string) => {
    const next = { ...variants };
    delete next[color];
    onChange(next);
  };

  const updateUrl = (color: string, rotation: string, url: string) => {
    onChange({
      ...variants,
      [color]: {
        ...variants[color],
        [rotation]: url,
      },
    });
  };

  // Initialize default if not present
  if (!variants["default"]) {
    variants["default"] = {};
  }

  return (
    <div style={{
      background: "rgba(15, 23, 42, 0.4)",
      padding: "1rem",
      borderRadius: "10px",
      border: "1px solid var(--glass-border)",
      display: "flex",
      flexDirection: "column",
      gap: "1rem"
    }}>
      <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
        <ImageIcon size={16} /> Variants (Colors & Rotations)
      </h3>
      
      {/* DEFAULT COLOR (Main Image) */}
      <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#888", border: "1px solid rgba(255,255,255,0.2)" }} />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Default Color (Main Image)</span>
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>0° is Main Image URL</span>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {["90", "180", "270"].map(deg => (
            <div key={`default-${deg}`}>
              <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>{deg}° Image URL</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input 
                  className="input" 
                  style={{ padding: "0.4rem", fontSize: "0.75rem" }}
                  placeholder={`https://...`}
                  value={variants["default"]?.[deg] || ""}
                  onChange={e => updateUrl("default", deg, e.target.value)}
                />
                {variants["default"]?.[deg] && (
                  <img src={variants["default"][deg]} style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 4, background: "#111" }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "0.5rem 0" }} />

      {/* CUSTOM COLORS */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input 
          type="color" 
          value={newColor} 
          onChange={e => setNewColor(e.target.value)}
          style={{ width: 36, height: 36, padding: 0, border: "none", borderRadius: 4, cursor: "pointer" }}
        />
        <button 
          type="button"
          onClick={addColor}
          className="btn btn-secondary"
          style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
        >
          <Plus size={14} /> Add New Color Variant
        </button>
      </div>

      {Object.entries(variants).filter(([color]) => color !== "default").map(([color, rotations]) => (
        <div key={color} style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: 16, height: 16, borderRadius: 8, background: color, border: "1px solid rgba(255,255,255,0.2)" }} />
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{color}</span>
            </div>
            <button type="button" onClick={() => removeColor(color)} className="btn-icon" style={{ padding: 4 }}>
              <X size={14} />
            </button>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {["0", "90", "180", "270"].map(deg => (
              <div key={`${color}-${deg}`}>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>{deg}° Image URL</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input 
                    className="input" 
                    style={{ padding: "0.4rem", fontSize: "0.75rem" }}
                    placeholder={`https://...`}
                    value={rotations[deg] || ""}
                    onChange={e => updateUrl(color, deg, e.target.value)}
                  />
                  {rotations[deg] && (
                    <img src={rotations[deg]} style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 4, background: "#111" }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
