export const clearLegacyAuthData = () => {
  if (typeof window === "undefined") return;

  // Keys that are definitely legacy and never used anymore
  const legacyKeys = ["old_token", "temp_session"];
  let cleared = false;

  legacyKeys.forEach((key) => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      cleared = true;
    }
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      cleared = true;
    }
  });

  // ✅ PRESERVATION: We do NOT clear 'accessToken' or 'refreshToken' here 
  // because the current 'secure session model' uses them in localStorage for Header-based Auth.

  if (cleared) {
    console.log("[Auth] 🧹 Legacy tokens detected and cleared from local storage. Moving to secure session model.");
  }
};
