/** A column's data type. Charts declare which types each of their dimensions accepts. */
export type ColumnType = "number" | "date" | "string";

/** A typed cell. Dates are UTC midnight-based `Date`s; empty cells are `null`. */
export type Value = string | number | Date | null;

export interface Column {
  name: string;
  type: ColumnType;
}

/** Untyped table straight out of the parser. Every row has `headers.length` cells. */
export interface RawTable {
  headers: string[];
  cells: string[][];
}

export type Row = Record<string, Value>;

export interface Dataset {
  columns: Column[];
  rows: Row[];
}

export type Aggregation = "sum" | "mean" | "median" | "min" | "max" | "count";

export interface DimensionMapping {
  columns: string[];
  aggregation?: Aggregation;
}

/** Dimension id -> mapped columns. */
export type Mapping = Record<string, DimensionMapping>;

export interface DimensionDef {
  id: string;
  name: string;
  /** Column types this dimension accepts. */
  types: ColumnType[];
  required: boolean;
  /** Accepts several columns (hierarchy levels, alluvial steps). */
  multiple?: boolean;
  /** Fewest columns needed when `multiple` (defaults to 1). */
  minColumns?: number;
  /** Numeric dimension aggregated per group; offers an aggregation picker. */
  aggregate?: boolean;
  /** Short explanation shown under the dimension name. */
  hint?: string;
}

export type OptionValue = number | string | boolean;
export type Options = Record<string, OptionValue>;

export type OptionGroup = "Artboard" | "Chart" | "Colors" | "Labels";

interface OptionBase {
  id: string;
  label: string;
  group: OptionGroup;
}

export type OptionDef =
  | (OptionBase & { type: "number"; default: number; min: number; max: number; step?: number })
  | (OptionBase & { type: "boolean"; default: boolean })
  | (OptionBase & { type: "select"; default: string; choices: { value: string; label: string }[] })
  | (OptionBase & { type: "color"; default: string });

export type ChartFamily = "Comparisons" | "Time series" | "Correlations" | "Proportions" | "Hierarchies" | "Flows" | "Distributions";

/** Resolved mapping handed to a chart: columns are full Column objects. */
export interface ResolvedDimension {
  columns: Column[];
  aggregation: Aggregation;
}

export interface Theme {
  text: string;
  muted: string;
  grid: string;
  /** Stroke drawn around marks so they separate from each other. */
  separator: string;
  fontSize: number;
  palette: string[];
  sequential: string[];
}

export interface DrawContext {
  rows: Row[];
  dims: Record<string, ResolvedDimension | undefined>;
  options: Options;
  /** Plot area (artboard minus margins and legend). */
  width: number;
  height: number;
  theme: Theme;
}

export type Legend =
  | { kind: "categorical"; title: string; items: { label: string; color: string }[] }
  | { kind: "sequential"; title: string; domain: [number, number]; stops: string[] };

export interface DrawResult {
  /** SVG markup drawn in plot coordinates (0,0 at the top-left of the plot area). */
  body: string;
  legend?: Legend;
}

export interface ChartDef {
  id: string;
  name: string;
  family: ChartFamily;
  description: string;
  dimensions: DimensionDef[];
  /** Chart-specific options, shown after the shared ones. */
  options: OptionDef[];
  /** Overrides for shared option defaults (margins, size, legend). */
  defaults?: Options;
  /** Whether this mapping produces a legend (decides if space is reserved for it). */
  hasLegend: (dims: DrawContext["dims"]) => boolean;
  draw: (ctx: DrawContext) => DrawResult;
}
