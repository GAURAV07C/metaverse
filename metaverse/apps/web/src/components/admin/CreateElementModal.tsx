import { useState } from "react";
import { Plus, X } from "lucide-react";
import { VariantsBuilder } from "./VariantsBuilder";

interface CreateElementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    imageUrl: string;
    width: number;
    height: number;
    static: boolean;
    name?: string;
    category?: string;
    colorMaskUrl?: string;
    variants?: any;
  }) => Promise<void>;
  isLoading: boolean;
  error?: string;
}

export function CreateElementModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  error,
}: CreateElementModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("seating");
  const [imageUrl, setImageUrl] = useState("");
  const [colorMaskUrl, setColorMaskUrl] = useState("");
  const [width, setWidth] = useState("1");
  const [height, setHeight] = useState("1");
  const [isStatic, setIsStatic] = useState(true);
  const [variants, setVariants] = useState<Record<string, Record<string, string>>>({});

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      imageUrl,
      width: parseInt(width) || 1,
      height: parseInt(height) || 1,
      static: isStatic,
      name: name || undefined,
      category: category || undefined,
      colorMaskUrl: colorMaskUrl || undefined,
      variants: Object.keys(variants).length > 0 ? variants : undefined,
    });
    // Reset on success
    setName("");
    setImageUrl("");
    setColorMaskUrl("");
    setWidth("1");
    setHeight("1");
    setIsStatic(true);
    setVariants({});
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-large glass animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "650px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <h2
            style={{
              fontWeight: 700,
              fontSize: "1.2rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Plus size={20} color="var(--accent)" /> Create New Office Element
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && <div className="error-banner">{error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="field">
              <label className="field-label">Element Name (Optional)</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Executive Leather Chair"
              />
            </div>
            <div className="field">
              <label className="field-label">Category</label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ cursor: "pointer" }}
              >
                <option value="seating">🪑 Seating (Chairs, Sofas)</option>
                <option value="desks">🖥️ Desks & Tables</option>
                <option value="electronics">🕹️ Electronics & Machines</option>
                <option value="decor">🛋️ Decor & Plants</option>
                <option value="walls">🏢 Walls & Doors</option>
                <option value="misc">🧩 Other / Misc</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Image URL (PNG Asset Link)</label>
            <input
              className="input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              required
            />
          </div>

          <div className="field">
            <label className="field-label">Color Mask URL (Optional - For custom colors)</label>
            <input
              className="input"
              value={colorMaskUrl}
              onChange={(e) => setColorMaskUrl(e.target.value)}
              placeholder="https://... (Color mask PNG layer)"
            />
          </div>

          <VariantsBuilder variants={variants} onChange={setVariants} />

          {/* Live Preview Box */}
          {imageUrl && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                background: "#080e1c",
                backgroundImage: "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 0)",
                backgroundSize: "8px 8px",
                borderRadius: "10px",
                border: "1px solid var(--glass-border)",
                padding: "10px",
              }}
            >
              <img
                src={imageUrl}
                alt="Preview"
                style={{ height: "60px", width: "60px", objectFit: "contain" }}
              />
              {colorMaskUrl && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Color Mask Preview:
                  </span>
                  <img
                    src={colorMaskUrl}
                    alt="Mask"
                    style={{
                      height: "40px",
                      width: "40px",
                      objectFit: "contain",
                      filter: "hue-rotate(90deg)",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="field">
              <label className="field-label">Width (tiles)</label>
              <input
                className="input"
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                min={1}
              />
            </div>
            <div className="field">
              <label className="field-label">Height (tiles)</label>
              <input
                className="input"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                min={1}
              />
            </div>
          </div>

          {/* Quick Dimensions Presets */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Presets:</span>
            {[
              { label: "1x1", w: "1", h: "1" },
              { label: "1x2", w: "1", h: "2" },
              { label: "2x2", w: "2", h: "2" },
              { label: "3x3", w: "3", h: "3" },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setWidth(p.w);
                  setHeight(p.h);
                }}
                style={{ padding: "2px 8px", fontSize: "0.75rem" }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Static / Walkable Checkbox */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              padding: "0.85rem 1rem",
              borderRadius: "10px",
              border: "1px solid var(--glass-border)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <input
              type="checkbox"
              id="modalStaticCheck"
              checked={isStatic}
              onChange={(e) => setIsStatic(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <div>
              <label
                htmlFor="modalStaticCheck"
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                {isStatic ? "🚫 Static (Non-walkable Obstacle)" : "✅ Walkable / Seating (Passable)"}
              </label>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginTop: 2 }}>
                {isStatic
                  ? "Avatars CANNOT walk through or sit on this element."
                  : "Avatars CAN step into this tile and sit on chairs/sofas!"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-full" disabled={isLoading}>
              {isLoading ? <span className="spinner" /> : "Save & Create Element →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
