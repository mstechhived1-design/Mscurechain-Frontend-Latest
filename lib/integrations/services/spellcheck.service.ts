import type { SpellMatch, SpellCheckResponse } from "../types/spellcheck";

/**
 * SpellCheck Service
 * Centralised integration with the LanguageTool public API.
 *
 * Endpoint : https://api.languagetool.org/v2/check
 * Auth     : None required (free public tier — 20 req/min per IP)
 * Docs     : https://languagetool.org/http-api/
 */

const LANGUAGE_TOOL_URL = "https://api.languagetool.org/v2/check";

/** Rules that produce unhelpful noise for short medical / name fields */
const DISABLED_RULES = [
  "WHITESPACE_RULE",
  "COMMA_PARENTHESIS_WHITESPACE",
  "EN_QUOTES",
  "UPPERCASE_SENTENCE_START",
].join(",");

export const spellCheckService = {
  /**
   * Check the spelling of a text string using the LanguageTool public API.
   *
   * @param text    - The text to analyse (must be ≥ 3 characters after trimming)
   * @param language - BCP-47 language tag, defaults to "en-US"
   * @returns       Array of `SpellMatch` objects (empty if no issues found)
   */
  check: async (text: string, language = "en-US"): Promise<SpellMatch[]> => {
    if (!text || text.trim().length < 3) return [];

    try {
      const body = new URLSearchParams({
        text,
        language,
        disabledRules: DISABLED_RULES,
      });

      const response = await fetch(LANGUAGE_TOOL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        console.warn(
          `[spellCheckService] LanguageTool responded with ${response.status}`
        );
        return [];
      }

      const data: SpellCheckResponse = await response.json();
      return data.matches ?? [];
    } catch (err) {
      // Network failure or JSON parse error — fail silently so the form
      // remains fully functional even when offline / API is down.
      console.warn("[spellCheckService] Spell check unavailable:", err);
      return [];
    }
  },

  /**
   * Apply a single replacement suggestion to the source string.
   *
   * @param original   - The original full text of the field
   * @param match      - The `SpellMatch` that was clicked
   * @param suggestion - The replacement string chosen by the user
   * @returns          The corrected string
   */
  applyCorrection: (
    original: string,
    match: SpellMatch,
    suggestion: string
  ): string => {
    return (
      original.slice(0, match.offset) +
      suggestion +
      original.slice(match.offset + match.length)
    );
  },
};
