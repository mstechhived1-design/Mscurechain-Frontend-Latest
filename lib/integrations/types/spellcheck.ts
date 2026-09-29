/**
 * SpellCheck Types
 * Types for the LanguageTool public API spell-check integration.
 * API: https://api.languagetool.org/v2/check (free, no key required)
 */

/** A single spelling / grammar match returned by LanguageTool */
export interface SpellMatch {
  /** Human-readable description of the error */
  message: string;
  /** Zero-based character offset in the checked text */
  offset: number;
  /** Length (in characters) of the erroneous span */
  length: number;
  /** Ordered list of replacement suggestions */
  replacements: { value: string }[];
  /** Surrounding text snippet for context */
  context: { text: string; offset: number; length: number };
}

/** Raw response shape from the LanguageTool /v2/check endpoint */
export interface SpellCheckResponse {
  matches: SpellMatch[];
}

/** Per-field spell check state with matches and tracking info (extended format used by discharge form) */
export interface SpellFieldState {
  /** Array of spelling matches found in the field */
  matches: SpellMatch[];
  /** The value that was last checked */
  lastCheckedValue: string;
  /** Whether the field value has been modified since last check */
  isDirty: boolean;
}

/** Per-field map of spell matches (simple array format used by helpdesk page) */
export type SpellState = Record<string, SpellMatch[]>;

/** Extended spell state for discharge form with tracking info */
export type ExtendedSpellState = Record<string, SpellFieldState>;

/** State of the suggestion popup */
export type SpellPopupState = {
  /** The spell match being corrected */
  match: SpellMatch;
  /** Form field the popup belongs to */
  field: string;
  /** Pixel X position (viewport-relative) */
  x: number;
  /** Pixel Y position (scroll-adjusted) */
  y: number;
} | null;