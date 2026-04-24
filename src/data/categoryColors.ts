/** Color palette per land category — shared between map pins and UI legend. */

export interface CategoryColorSet {
  bg: string;
  activeBg: string;
  stroke: string;
  activeStroke: string;
  icon: string;
}

export const CATEGORY_COLORS: Record<string, CategoryColorSet> = {
  residential:  { bg: "#93C5FD", activeBg: "#60A5FA", stroke: "#1E40AF", activeStroke: "#1E3A8A", icon: "#1E3A8A" },  // blue
  commercial:   { bg: "#FCD34D", activeBg: "#FBBF24", stroke: "#92400E", activeStroke: "#78350F", icon: "#78350F" },  // amber
  hospitality:  { bg: "#C4B5FD", activeBg: "#A78BFA", stroke: "#5B21B6", activeStroke: "#4C1D95", icon: "#4C1D95" },  // violet
  industrial:   { bg: "#FCA5A5", activeBg: "#F87171", stroke: "#991B1B", activeStroke: "#7F1D1D", icon: "#7F1D1D" },  // red
  "mixed-use":  { bg: "#6EE7B7", activeBg: "#34D399", stroke: "#065F46", activeStroke: "#064E3B", icon: "#064E3B" },  // emerald
  agriculture:  { bg: "#86EFAC", activeBg: "#4ADE80", stroke: "#166534", activeStroke: "#14532D", icon: "#14532D" },  // green
};

const DEFAULT_COLORS: CategoryColorSet = { bg: "#A7F3D0", activeBg: "#6EE7B7", stroke: "#047857", activeStroke: "#065F46", icon: "#065F46" };

export function getCategoryColors(category: string): CategoryColorSet {
  return CATEGORY_COLORS[category.toLowerCase()] ?? DEFAULT_COLORS;
}
