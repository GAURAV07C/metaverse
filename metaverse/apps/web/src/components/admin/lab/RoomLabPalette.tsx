import { useState } from "react";
import { Search, X, Check, Map, Monitor, Armchair, Lamp, Settings, Sparkles, Box } from "lucide-react";
import type { ElementItem, ElementCategory } from "../adminTypes";
import { getElementCategory } from "../adminTypes";

interface RoomLabPaletteProps {
  elements: ElementItem[];
  selectedElement: ElementItem | null;
  onSelectElement: (el: ElementItem) => void;
}

export function RoomLabPalette({
  elements,
  selectedElement,
  onSelectElement,
}: RoomLabPaletteProps) {
  const [activeCategory, setActiveCategory] = useState<ElementCategory>("walls");
  const [searchQuery, setSearchQuery] = useState("");

  const categories: { key: ElementCategory; label: string; icon: any }[] = [
    { key: "walls", label: "Walls & Doors", icon: Box },
    { key: "seating", label: "Seating", icon: Armchair },
    { key: "desks", label: "Desks & Tables", icon: Monitor },
    { key: "electronics", label: "Electronics", icon: Settings },
    { key: "decor", label: "Decor & Plants", icon: Lamp },
    { key: "misc", label: "Other / Misc", icon: Map },
    { key: "all", label: "All DB Objects", icon: Sparkles },
  ];

  // Category counts for DB elements
  const categoryCounts = elements.reduce((acc, el) => {
    const cat = getElementCategory(el);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredElements = elements.filter((el) => {
    if (activeCategory !== "all" && getElementCategory(el) !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const cat = getElementCategory(el);
      const name = (el.name || "").toLowerCase();
      if (!el.id.toLowerCase().includes(q) && !el.imageUrl.toLowerCase().includes(q) && !cat.includes(q) && !name.includes(q)) return false;
    }
    return true;
  });

  return (
    <div
      style={{
        width: "290px",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
        borderRight: "1px solid rgba(255,255,255,0.1)",
        height: "100%",
        overflow: "hidden",
        color: "#f8fafc",
      }}
    >
      {/* Search Input */}
      <div style={{ padding: "0.85rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            className="input"
            placeholder="Search raw components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: "2.1rem",
              fontSize: "0.82rem",
              height: "36px",
              background: "rgba(30, 41, 59, 0.7)",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "8px",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "8px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          overflowX: "auto",
          flexShrink: 0,
          background: "#1e293b",
        }}
      >
        {categories.map((c) => {
          const Icon = c.icon;
          const isActive = activeCategory === c.key;
          const count = c.key === "all" ? elements.length : (categoryCounts[c.key] || 0);
          return (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              title={`${c.label} (${count})`}
              style={{
                padding: "6px 10px",
                fontSize: "0.75rem",
                fontWeight: 600,
                borderRadius: "8px",
                border: "none",
                background: isActive ? "#3b82f6" : "transparent",
                color: isActive ? "#ffffff" : "#94a3b8",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={14} />
              <span>{c.label}</span>
              <span style={{ fontSize: "0.65rem", opacity: 0.75, background: "rgba(0,0,0,0.2)", padding: "1px 5px", borderRadius: 10 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* RAW ELEMENTS LISTING */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {filteredElements.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
            {filteredElements.map((el) => {
              const isSelected = selectedElement?.id === el.id;
              return (
                <div
                  key={el.id}
                  onClick={() => onSelectElement(el)}
                  style={{
                    padding: "0.5rem",
                    borderRadius: "10px",
                    background: isSelected ? "rgba(59, 130, 246, 0.25)" : "rgba(30, 41, 59, 0.6)",
                    border: `1.5px solid ${isSelected ? "#3b82f6" : "rgba(255,255,255,0.08)"}`,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  {isSelected && (
                    <div style={{ position: "absolute", top: 4, right: 4, background: "#3b82f6", borderRadius: "50%", padding: 2 }}>
                      <Check size={10} color="#fff" />
                    </div>
                  )}
                  <div
                    style={{
                      width: "100%",
                      height: 52,
                      background: "rgba(15, 23, 42, 0.8)",
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 4,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={el.imageUrl}
                      alt={el.name || "Element"}
                      style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#ffffff", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {el.name || `Item ${el.id.slice(0, 4)}`}
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                    {el.width}×{el.height} • {el.static ? "static" : "walkable"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#94a3b8", fontSize: "0.85rem" }}>
            No components match "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
}
