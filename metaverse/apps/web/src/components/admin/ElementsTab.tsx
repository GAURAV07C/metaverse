import { useState } from "react";
import { Plus, Search, X, SlidersHorizontal } from "lucide-react";
import type { ElementItem, ElementCategory } from "./adminTypes";
import { getElementCategory } from "./adminTypes";
import { ElementCategoryPills } from "./ElementCategoryPills";
import { ElementCard } from "./ElementCard";
import { CreateElementModal } from "./CreateElementModal";
import { EditElementModal } from "./EditElementModal";
import { ElementCanvasTesterModal } from "../ElementCanvasTesterModal";

interface ElementsTabProps {
  elements: ElementItem[];
  onCreateElement: (data: {
    imageUrl: string;
    width: number;
    height: number;
    static: boolean;
    name?: string;
    category?: string;
    colorMaskUrl?: string;
    variants?: any;
  }) => Promise<void>;
  onUpdateElement: (
    id: string,
    data: {
      imageUrl: string;
      width: number;
      height: number;
      static: boolean;
      name?: string;
      category?: string;
      colorMaskUrl?: string;
      variants?: any;
    }
  ) => Promise<void>;
  onDeleteElement: (id: string) => Promise<void>;
  isCreating: boolean;
  createError?: string;
  isUpdating: boolean;
  updateMsg?: string;
  deletingElId: string | null;
}

export function ElementsTab({
  elements,
  onCreateElement,
  onUpdateElement,
  onDeleteElement,
  isCreating,
  createError,
  isUpdating,
  updateMsg,
  deletingElId,
}: ElementsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<ElementCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "static" | "walkable">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<ElementItem | null>(null);
  const [testingElement, setTestingElement] = useState<ElementItem | null>(null);

  // Filter out composite room prefabs from atomic elements catalog
  const isCompositeRoom = (el: ElementItem) => {
    const name = (el.name || "").toLowerCase();
    const cat = (el.category || "").toLowerCase();
    if (cat === "rooms" || cat === "room") return true;
    return /meeting room|public room|team area|coworking area|open desk|private desk/i.test(name);
  };

  const atomicElements = elements.filter((el) => !isCompositeRoom(el));

  // Category counts
  const categoryCounts = atomicElements.reduce((acc, el) => {
    const cat = getElementCategory(el);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filtered elements
  const filteredElements = atomicElements.filter((el) => {
    if (selectedCategory !== "all" && getElementCategory(el) !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const cat = getElementCategory(el);
      const name = (el.name || "").toLowerCase();
      if (!el.id.toLowerCase().includes(q) && !el.imageUrl.toLowerCase().includes(q) && !cat.includes(q) && !name.includes(q)) return false;
    }
    if (filterType === "static" && !el.static) return false;
    if (filterType === "walkable" && el.static) return false;
    return true;
  });

  const handleCreate = async (data: {
    imageUrl: string;
    width: number;
    height: number;
    static: boolean;
    name?: string;
    category?: string;
    colorMaskUrl?: string;
  }) => {
    await onCreateElement(data);
    setIsCreateModalOpen(false);
  };

  const handleUpdate = async (data: {
    imageUrl: string;
    width: number;
    height: number;
    static: boolean;
    name?: string;
    category?: string;
    colorMaskUrl?: string;
  }) => {
    if (!editingElement) return;
    await onUpdateElement(editingElement.id, data);
    setEditingElement(null);
  };

  return (
    <div className="animate-fade-in">
      {/* Header with Title & Create Button */}
      <div
        className="dash-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h1>🪑 Elements Catalog</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 4 }}>
            Manage office furniture, seating, decorations, walls, color masks, and test canvas collision & walking!
          </p>
        </div>
        <button
          className="btn"
          onClick={() => setIsCreateModalOpen(true)}
          style={{ boxShadow: "0 4px 14px var(--accent-glow)" }}
        >
          <Plus size={18} style={{ marginRight: 6 }} /> Create New Element
        </button>
      </div>

      {/* Category Filter Pills (placed BELOW Create Action) */}
      <ElementCategoryPills
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        categoryCounts={categoryCounts}
        totalElementsCount={elements.length}
      />

      {/* Search & Filter Toolbar */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          background: "rgba(15, 23, 42, 0.4)",
          padding: "0.75rem 1rem",
          borderRadius: "12px",
          border: "1px solid var(--glass-border)",
        }}
      >
        {/* Search input */}
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-secondary)",
            }}
          />
          <input
            className="input"
            placeholder="Search element by name, ID or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "2.3rem" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Type Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <SlidersHorizontal size={14} /> Collision:
          </span>
          <button
            className={`btn btn-ghost ${filterType === "all" ? "active" : ""}`}
            onClick={() => setFilterType("all")}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.8rem",
              background: filterType === "all" ? "var(--accent)" : "rgba(255,255,255,0.06)",
            }}
          >
            All
          </button>
          <button
            className={`btn btn-ghost ${filterType === "static" ? "active" : ""}`}
            onClick={() => setFilterType("static")}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.8rem",
              background: filterType === "static" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)",
              color: filterType === "static" ? "#fca5a5" : "inherit",
            }}
          >
            🚫 Static
          </button>
          <button
            className={`btn btn-ghost ${filterType === "walkable" ? "active" : ""}`}
            onClick={() => setFilterType("walkable")}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.8rem",
              background: filterType === "walkable" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)",
              color: filterType === "walkable" ? "#6ee7b7" : "inherit",
            }}
          >
            ✅ Walkable / Seating
          </button>
        </div>
      </div>

      {/* Elements Header Count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Showing {filteredElements.length} of {elements.length} elements
        </h3>
      </div>

      {updateMsg && (
        <div
          className={updateMsg === "Updated!" ? "success-banner" : "error-banner"}
          style={{ marginBottom: "1rem" }}
        >
          {updateMsg}
        </div>
      )}

      {/* Elements Cards Grid */}
      <div className="admin-items-grid">
        {filteredElements.map((el) => (
          <ElementCard
            key={el.id}
            element={el}
            onCanvasTest={(item) => setTestingElement(item)}
            onEdit={(item) => setEditingElement(item)}
            onDelete={onDeleteElement}
            isDeleting={deletingElId === el.id}
          />
        ))}

        {filteredElements.length === 0 && (
          <div
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              padding: "3rem 1rem",
              background: "rgba(15,23,42,0.4)",
              borderRadius: "16px",
            }}
          >
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
              No elements found matching selected category or search query.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateElementModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreate}
        isLoading={isCreating}
        error={createError}
      />

      <EditElementModal
        element={editingElement}
        onClose={() => setEditingElement(null)}
        onSubmit={handleUpdate}
        isLoading={isUpdating}
      />

      {testingElement && (
        <ElementCanvasTesterModal
          element={testingElement}
          onClose={() => setTestingElement(null)}
        />
      )}
    </div>
  );
}
