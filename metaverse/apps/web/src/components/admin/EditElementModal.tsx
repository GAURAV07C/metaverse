import { useState, useEffect } from "react";
import { Pencil, X } from "lucide-react";
import type { ElementItem } from "./adminTypes";
import { VariantsBuilder } from "./VariantsBuilder";

interface EditElementModalProps {
  element: ElementItem | null;
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

export function EditElementModal({
  element,
  onClose,
  onSubmit,
  isLoading,
  error,
}: EditElementModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("seating");
  const [imageUrl, setImageUrl] = useState("");
  const [colorMaskUrl, setColorMaskUrl] = useState("");
  const [width, setWidth] = useState("1");
  const [height, setHeight] = useState("1");
  const [isStatic, setIsStatic] = useState(true);
  const [variants, setVariants] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (element) {
      setName(element.name || "");
      setCategory(element.category || "seating");
      setImageUrl(element.imageUrl || "");
      setColorMaskUrl(element.colorMaskUrl || "");
      setWidth(element.width.toString());
      setHeight(element.height.toString());
      setIsStatic(element.static);
      setVariants(element.variants || {});
    }
  }, [element]);

  if (!element) return null;

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
            <Pencil size={18} color="var(--accent)" /> Edit Element Attributes
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && <div className="error-banner">{error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="field">
              <label className="field-label">Element Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chair"
              />
            </div>
            <div className="field">
              <label className="field-label">Category</label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="seating">🪑 Seating</option>
                <option value="desks">🖥️ Desks & Tables</option>
                <option value="electronics">🕹️ Electronics</option>
                <option value="decor">🛋️ Decor & Plants</option>
                <option value="walls">🏢 Walls & Doors</option>
                <option value="misc">🧩 Other / Misc</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Image URL</label>
            <input
              className="input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label">Color Mask URL (For customizable colors)</label>
            <input
              className="input"
              value={colorMaskUrl}
              onChange={(e) => setColorMaskUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <VariantsBuilder variants={variants} onChange={setVariants} />

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
              id="editStaticCheck"
              checked={isStatic}
              onChange={(e) => setIsStatic(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <div>
              <label
                htmlFor="editStaticCheck"
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                {isStatic ? "🚫 Static (Obstacle)" : "✅ Walkable / Seating (Passable)"}
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-full" disabled={isLoading}>
              {isLoading ? <span className="spinner" /> : "Update Element →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
