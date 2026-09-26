export type ElementCategory = "all" | "seating" | "desks" | "electronics" | "decor" | "walls" | "misc";

export interface ElementItem {
  id: string;
  imageUrl: string;
  colorMaskUrl?: string;
  name?: string;
  category?: string;
  width: number;
  height: number;
  static: boolean;
}

export function getElementCategory(el: { imageUrl: string; category?: string; name?: string }): ElementCategory {
  const cat = (el.category || "").toLowerCase().trim();
  if (["seating", "desks", "electronics", "decor", "walls", "misc"].includes(cat)) {
    return cat as ElementCategory;
  }

  // Handle common server category names
  if (cat.includes("room") || cat.includes("floor") || cat.includes("structure") || cat.includes("wall")) return "walls";
  if (cat.includes("machine") || cat.includes("tech") || cat.includes("device") || cat.includes("electronic")) return "electronics";
  if (cat.includes("chair") || cat.includes("seat") || cat.includes("furniture")) return "seating";
  if (cat.includes("table") || cat.includes("desk")) return "desks";
  if (cat.includes("plant") || cat.includes("decor") || cat.includes("art")) return "decor";

  const target = `${el.imageUrl} ${el.name || ""} ${el.category || ""}`.toLowerCase();

  if (/chair|sofa|bench|seat|stool|couch|recline|armchair|pouf|throne|lounge/i.test(target)) return "seating";
  if (/desk|table|counter|workstation|boardroom|podium|stand|bureau/i.test(target)) return "desks";
  if (/arcade|computer|tv|machine|vending|screen|monitor|laptop|pc|server|console|radio|projector|gadget|phone/i.test(target)) return "electronics";
  if (/plant|rug|book|lamp|decor|statue|flower|tree|pot|shelf|painting|picture|surfboard|flag|trophy|clock|easel|canvas|art|vase|tapestry|mat|poster|mirror|light/i.test(target)) return "decor";
  if (/wall|door|window|floor|tile|partition|fence|room|carpet|barrier|brick|glass|boundary|panel/i.test(target)) return "walls";

  return "misc";
}
