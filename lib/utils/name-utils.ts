/**
 * Sanitizes patient names by filtering out debug placeholders and providing safe fallbacks.
 * This prevents internal debug strings (like "debug", "Unknown", etc.) from being
 * displayed to the end-user as the primary name.
 */
export const sanitizePatientName = (name: string | null | undefined, fallback: string = "Unnamed Patient"): string => {
  if (!name) return fallback;
  
  const lowerName = name.trim().toLowerCase();
  const debugPlaceholders = [
    "debug",
    "unknown",
    "unknown patient",
    "unnamed",
    "unnamed patient",
    "placeholder",
    "test patient",
    "test"
  ];

  if (debugPlaceholders.includes(lowerName)) {
    return fallback;
  }

  return name;
};

/**
 * Cleans doctor names by removing "Dr." prefixes.
 * Use this before saving to the database so we don't store redundant prefixes
 * when an honorific field is already present.
 */
export const cleanDoctorName = (name: string | null | undefined): string => {
  if (!name) return "";
  
  let cleaned = name.trim();
  
  // Repeatedly remove "Dr.", "Dr ", "DR.", "dr" from the beginning of the string
  while (/^(dr\.?\s*)/i.test(cleaned)) {
    cleaned = cleaned.replace(/^(dr\.?\s*)/i, "").trim();
  }
  
  return cleaned;
};

/**
 * Formats doctor names to ensure they start with exactly one "Dr. " prefix.
 * Used for display purposes.
 */
export const formatDoctorName = (name: string | null | undefined): string => {
  const cleaned = cleanDoctorName(name);
  return cleaned ? `Dr. ${cleaned}` : "Doctor";
};

export interface PatientPrefixItem {
  value: string;
  label: string;
}

/**
 * Strips bracketed descriptions and extra whitespace from an honorific.
 * e.g., "D/O (Daughter of)" -> "D/O", "Baby of (B/O)" -> "Baby of"
 */
export const cleanHonorificPrefix = (honorific: string | null | undefined): string => {
  if (!honorific) return "";
  const trimmed = honorific.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\s*\([^)]*\)/g, "").trim();
};

export const HONORIFIC_OPTION_ITEMS: PatientPrefixItem[] = [
  { value: "Mr.", label: "Mr." },
  { value: "Mrs.", label: "Mrs." },
  { value: "Ms.", label: "Ms." },
  { value: "Miss", label: "Miss" },
  { value: "Master", label: "Master" },
  { value: "Child", label: "Child" },
  { value: "Baby", label: "Baby" },
  { value: "Baby of", label: "Baby of (B/O)" },
  { value: "B/O", label: "B/O (Baby of)" },
  { value: "Infant", label: "Infant" },
  { value: "Newborn", label: "Newborn" },
  { value: "S/O", label: "S/O (Son of)" },
  { value: "D/O", label: "D/O (Daughter of)" },
  { value: "W/O", label: "W/O (Wife of)" },
  { value: "H/O", label: "H/O (Husband of)" },
  { value: "C/O", label: "C/O (Care of)" },
  { value: "F/O", label: "F/O (Father of)" },
  { value: "M/O", label: "M/O (Mother of)" },
  { value: "L/O", label: "L/O (Legal Guardian of)" },
  { value: "G/O", label: "G/O (Guardian of)" },
  { value: "K/O", label: "K/O (Kin of)" },
  { value: "R/O", label: "R/O (Resident of)" },
  { value: "A/O", label: "A/O (Address of / At)" },
  { value: "P/O", label: "P/O (Parent of)" },
  { value: "U/O", label: "U/O (Under the Care of)" },
  { value: "T/O", label: "T/O (Twin of)" },
  { value: "Sri", label: "Sri" },
  { value: "Smt.", label: "Smt." },
  { value: "Kumari", label: "Kumari" },
  { value: "Dr.", label: "Dr." },
  { value: "Prof.", label: "Prof." }
];

export const HONORIFIC_OPTIONS = HONORIFIC_OPTION_ITEMS.map(i => i.value);

export const PATIENT_PREFIX_LIST: PatientPrefixItem[] = [
  { value: "Mr", label: "MR" },
  { value: "Mrs", label: "MRS" },
  { value: "Ms", label: "MS" },
  { value: "Miss", label: "MISS" },
  { value: "Dr", label: "DR" },
  { value: "Master", label: "MASTER" },
  { value: "Child", label: "CHILD" },
  { value: "Baby", label: "BABY" },
  { value: "Baby of", label: "BABY OF (B/O)" },
  { value: "B/O", label: "B/O (Baby of)" },
  { value: "Infant", label: "INFANT" },
  { value: "Newborn", label: "NEWBORN" },
  { value: "S/O", label: "S/O (Son of)" },
  { value: "D/O", label: "D/O (Daughter of)" },
  { value: "W/O", label: "W/O (Wife of)" },
  { value: "H/O", label: "H/O (Husband of)" },
  { value: "C/O", label: "C/O (Care of)" },
  { value: "F/O", label: "F/O (Father of)" },
  { value: "M/O", label: "M/O (Mother of)" },
  { value: "L/O", label: "L/O (Legal Guardian of)" },
  { value: "G/O", label: "G/O (Guardian of)" },
  { value: "K/O", label: "K/O (Kin of)" },
  { value: "R/O", label: "R/O (Resident of)" },
  { value: "A/O", label: "A/O (Address of / At)" },
  { value: "P/O", label: "P/O (Parent of)" },
  { value: "U/O", label: "U/O (Under the Care of)" },
  { value: "T/O", label: "T/O (Twin of)" },
  { value: "Sri", label: "SRI" },
  { value: "Smt", label: "SMT" },
  { value: "Kumari", label: "KUMARI" },
  { value: "Prof", label: "PROF" },
];

/**
 * Retrieves custom honorifics saved for a specific hospital from localStorage
 */
export const getHospitalCustomHonorifics = (hospitalId?: string | null): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const activeId = hospitalId || localStorage.getItem("activeHospitalId") || "default";
    const raw = localStorage.getItem(`custom_honorifics_${activeId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Saves a new custom honorific for a specific hospital
 */
export const addHospitalCustomHonorific = (newHonorific: string, hospitalId?: string | null): string[] => {
  if (typeof window === "undefined" || !newHonorific.trim()) return [];
  try {
    const activeId = hospitalId || localStorage.getItem("activeHospitalId") || "default";
    const key = `custom_honorifics_${activeId}`;
    const existing = getHospitalCustomHonorifics(activeId);
    const cleaned = cleanHonorificPrefix(newHonorific.trim());
    if (cleaned && !existing.some(h => h.toLowerCase() === cleaned.toLowerCase())) {
      const updated = [...existing, cleaned];
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    }
    return existing;
  } catch {
    return [];
  }
};

/**
 * Returns all available prefixes including hospital-specific custom prefixes
 */
export const getAllHospitalPrefixes = (hospitalId?: string | null): PatientPrefixItem[] => {
  const custom = getHospitalCustomHonorifics(hospitalId);
  const customItems: PatientPrefixItem[] = custom.map(c => ({ value: c, label: c }));
  return [...PATIENT_PREFIX_LIST, ...customItems];
};

/**
 * Returns structured honorific items (with helper labels) including hospital custom honorifics
 */
export const getHospitalHonorificItems = (hospitalId?: string | null): PatientPrefixItem[] => {
  const custom = getHospitalCustomHonorifics(hospitalId);
  const customItems: PatientPrefixItem[] = custom.map(c => ({ value: c, label: c }));
  return [...HONORIFIC_OPTION_ITEMS, ...customItems];
};

/**
 * Returns honorific option string values with any hospital custom honorifics included
 */
export const getHospitalHonorificOptions = (hospitalId?: string | null): string[] => {
  const custom = getHospitalCustomHonorifics(hospitalId);
  return [...HONORIFIC_OPTIONS, ...custom];
};

/**
 * Cleans patient names by removing embedded titles/prefixes
 * and filtering out debug placeholders.
 */
export const cleanPatientName = (name: string | null | undefined, fallback: string = "Unnamed Patient"): string => {
  const sanitized = sanitizePatientName(name, fallback);
  let cleaned = sanitized.trim();
  
  // Comprehensive prefix pattern matching standard medical, regional, and pediatric titles
  const prefixPattern = /^(mr|mrs|ms|miss|mx|dr|prof|prof\.\s*dr|shri|sri|sree|smt|kumari|kum|sister|father|rev|late|capt|col|maj|adv|er|hon|master|child|chld|kid|infant|newborn|nb|ch|chi|selvan|selvi|baby\s+of(\s*\(b\/o\))?|baby|b\/o|son\s+of|daughter\s+of|wife\s+of|husband\s+of|care\s+of|father\s+of|mother\s+of|twin\s+of|twin|guardian\s+of|legal\s+guardian\s+of|s\/o(\s*\([^)]*\))?|d\/o(\s*\([^)]*\))?|w\/o(\s*\([^)]*\))?|h\/o(\s*\([^)]*\))?|c\/o(\s*\([^)]*\))?|f\/o(\s*\([^)]*\))?|m\/o(\s*\([^)]*\))?|l\/o(\s*\([^)]*\))?|g\/o(\s*\([^)]*\))?|k\/o(\s*\([^)]*\))?|r\/o(\s*\([^)]*\))?|a\/o(\s*\([^)]*\))?|p\/o(\s*\([^)]*\))?|u\/o(\s*\([^)]*\))?|t\/o(\s*\([^)]*\))?)\.?\s+/i;

  // Repeatedly remove leading honorifics/prefixes to prevent duplicates (e.g. "CHILD CHILD JAMILA" -> "JAMILA")
  while (prefixPattern.test(cleaned)) {
    cleaned = cleaned.replace(prefixPattern, "").trim();
  }
  
  // Collapse any accidental repeated consecutive identical words at the beginning
  cleaned = cleaned.replace(/^(\b\w+\b)(?:\s+\1\b)+/i, '$1').trim();

  // Run cleanup once more in case deduplicated word was an honorific
  while (prefixPattern.test(cleaned)) {
    cleaned = cleaned.replace(prefixPattern, "").trim();
  }

  // Also clean any hospital-specific custom honorifics
  try {
    const custom = getHospitalCustomHonorifics();
    for (const h of custom) {
      if (!h) continue;
      const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const customRegex = new RegExp(`^${escaped}\\.?\\s+`, 'i');
      while (customRegex.test(cleaned)) {
        cleaned = cleaned.replace(customRegex, '').trim();
      }
    }
  } catch {
    // ignore localStorage errors in non-browser env
  }
  
  return cleaned || fallback;
};

/**
 * Normalizes an honorific string to standard medical format with proper punctuation.
 */
export const normalizeHonorific = (honorific: string | null | undefined): string => {
  if (!honorific) return "";
  const trimmed = honorific.trim();
  if (!trimmed) return "";

  // Strip full forms in brackets if present, e.g. "S/O (Son of)" -> "S/O"
  const cleanPrefix = trimmed.replace(/\s*\([^)]*\)/g, "").trim();
  let up = cleanPrefix.toUpperCase().replace(/\.$/, "");

  if (["MR", "MRS", "MS", "DR", "PROF"].includes(up)) {
    return `${cleanPrefix.replace(/\.$/, "")}.`;
  }
  if (up === "MISS") return "Miss";
  if (up === "MASTER") return "Master";
  if (up === "CHILD" || up === "CHLD" || up === "CH") return "Child";
  if (up === "BABY") return "Baby";
  if (up === "BABY OF" || up === "BABY OF (B/O)") return "Baby of";
  if (up === "B/O") return "B/O";
  if (up === "INFANT") return "Infant";
  if (up === "NEWBORN" || up === "NB") return "Newborn";
  if (up === "SRI" || up === "SREE" || up === "SHRI") return "Sri";
  if (up === "SMT") return "Smt.";
  if (up === "KUMARI" || up === "KUM") return "Kumari";
  if (up === "LATE") return "Late";

  // Standard relationship prefixes
  if (["S/O", "D/O", "W/O", "H/O", "C/O", "F/O", "M/O", "B/O", "L/O", "G/O", "K/O", "R/O", "A/O", "P/O", "U/O", "T/O"].includes(up)) {
    return up;
  }

  return cleanPrefix;
};

/**
 * Formats patient names with honorific prefix if available.
 * Safely strips existing prefixes from the raw name to avoid duplicates like "MS. MS. M SABITHA"
 * Strict Rule: Never derives honorific from gender.
 */
export const formatPatientNameWithPrefix = (
  name: string | null | undefined,
  honorific: string | null | undefined,
  uppercase: boolean = true,
  includeHonorific: boolean = true
): string => {
  const cleaned = cleanPatientName(name, "Unnamed Patient");

  if (!includeHonorific) {
    return uppercase ? cleaned.toUpperCase() : cleaned;
  }

  let normHonorific = normalizeHonorific(honorific);

  // If honorific was not explicitly passed, check if name already has an embedded honorific
  if (!normHonorific && name) {
    const trimmedName = name.trim();
    const match = trimmedName.match(/^(baby\s+of(\s*\(b\/o\))?|baby|b\/o|child|infant|newborn|mr|mrs|ms|miss|master|dr|prof|sri|sree|shri|smt|kumari|late|s\/o|d\/o|w\/o|h\/o|c\/o)\.?\s+/i);
    if (match) {
      normHonorific = normalizeHonorific(match[1]);
    }
  }

  if (normHonorific) {
    const upHonorific = normHonorific.toUpperCase();
    const cleanUpper = cleaned.toUpperCase();

    // Prevent duplicate prefixing if cleaned already begins with the exact honorific
    let formatted: string;
    if (cleanUpper === upHonorific) {
      formatted = upHonorific;
    } else if (cleanUpper.startsWith(upHonorific + " ")) {
      formatted = cleanUpper;
    } else {
      formatted = `${upHonorific} ${cleanUpper}`.trim();
    }

    // Collapse any remaining repeated consecutive identical words at the start
    formatted = formatted.replace(/^(\b\w+\b)(?:\s+\1\b)+/i, '$1').trim();

    if (uppercase) {
      return formatted;
    }
    if (cleaned.toLowerCase().startsWith(normHonorific.toLowerCase() + " ")) {
      return cleaned.replace(/^(\b\w+\b)(?:\s+\1\b)+/i, '$1').trim();
    }
    return `${normHonorific} ${cleaned}`.trim();
  }

  return uppercase ? cleaned.toUpperCase() : cleaned;
};

/**
 * High-level centralized patient display name formatter.
 * Prioritizes historical appointment honorific snapshot when available,
 * falling back to patient master honorific.
 */
export const formatPatientDisplayName = (
  patient: any,
  appointment?: any,
  uppercase: boolean = true,
  includeHonorific: boolean = true
): string => {
  if (!patient && !appointment) return "Unnamed Patient";

  const rawName = 
    patient?.name || 
    patient?.user?.name || 
    patient?.patientDetails?.name ||
    patient?.patient?.name ||
    patient?.profile?.name ||
    appointment?.patientDetails?.name || 
    appointment?.patientName || 
    "Unnamed Patient";

  if (!includeHonorific) {
    const cleaned = cleanPatientName(rawName, "Unnamed Patient");
    return uppercase ? cleaned.toUpperCase() : cleaned;
  }

  // 1. Check appointment honorific snapshot (highest priority for historical accuracy)
  const appHonorific = 
    appointment?.appointmentHonorific || 
    appointment?.patientHonorific ||
    appointment?.patientPrefix ||
    appointment?.honorific || 
    appointment?.prefix ||
    appointment?.patientDetails?.honorific ||
    appointment?.patientDetails?.prefix;

  // 2. Check patient master honorific
  const patientHonorific = 
    patient?.honorific || 
    patient?.prefix || 
    patient?.profile?.honorific || 
    patient?.profile?.prefix || 
    patient?.user?.honorific || 
    patient?.user?.prefix || 
    patient?.patientDetails?.honorific ||
    patient?.patientDetails?.prefix ||
    patient?.patient?.honorific ||
    patient?.patient?.prefix ||
    patient?.patientHonorific || 
    patient?.patientPrefix || 
    patient?.honorificTitle || 
    patient?.salutation ||
    patient?.title ||
    patient?.admission?.patientHonorific ||
    patient?.admission?.honorific ||
    patient?.activeAdmission?.patientHonorific ||
    patient?.activeAdmission?.honorific;

  const finalHonorific = appHonorific || patientHonorific;
  return formatPatientNameWithPrefix(rawName, finalHonorific, uppercase, includeHonorific);
};

/**
 * Standard list of guardian / attendant / relative relationship options
 */
export const GUARDIAN_RELATIONS = [
  "Father",
  "Mother",
  "Husband",
  "Wife",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Grandfather",
  "Grandmother",
  "Grandson",
  "Granddaughter",
  "Uncle",
  "Aunt",
  "Nephew",
  "Niece",
  "Cousin",
  "Father-in-law",
  "Mother-in-law",
  "Son-in-law",
  "Daughter-in-law",
  "Brother-in-law",
  "Sister-in-law",
  "Relative",
  "Friend",
  "Neighbour",
  "Caregiver",
  "Guardian",
  "Colleague / Employer",
  "Self",
  "Other"
] as const;
