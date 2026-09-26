import type { ElementCategory } from "./adminTypes";

interface ElementCategoryPillsProps {
  selectedCategory: ElementCategory;
  onSelectCategory: (cat: ElementCategory) => void;
  categoryCounts: Record<string, number>;
  totalElementsCount: number;
}

export function ElementCategoryPills({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  totalElementsCount,
}: ElementCategoryPillsProps) {
  const categoriesList: { key: ElementCategory; label: string; icon: string }[] = [
    { key: "all", label: "All Items", icon: "✨" },
    { key: "seating", label: "Seating", icon: "🪑" },
    { key: "desks", label: "Desks & Tables", icon: "🖥️" },
    { key: "electronics", label: "Electronics", icon: "🕹️" },
    { key: "decor", label: "Decor & Plants", icon: "🛋️" },
    { key: "walls", label: "Walls & Doors", icon: "🏢" },
    { key: "misc", label: "Other / Misc", icon: "🧩" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        overflowX: "auto",
        paddingBottom: "0.5rem",
        marginBottom: "1.5rem",
        scrollbarWidth: "none",
      }}
    >
      {categoriesList.map((cat) => {
        const count = cat.key === "all" ? totalElementsCount : (categoryCounts[cat.key] || 0);
        const isActive = selectedCategory === cat.key;
        return (
          <button
            key={cat.key}
            onClick={() => onSelectCategory(cat.key)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.55rem 1rem",
              borderRadius: "12px",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
              background: isActive ? "var(--accent)" : "rgba(15, 23, 42, 0.6)",
              color: isActive ? "#fff" : "var(--text-secondary)",
              border: `1px solid ${isActive ? "var(--accent)" : "var(--glass-border)"}`,
              boxShadow: isActive ? "0 4px 14px var(--accent-glow)" : "none",
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            <span
              style={{
                background: isActive ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "0.75rem",
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
