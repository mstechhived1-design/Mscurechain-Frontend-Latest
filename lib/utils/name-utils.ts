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

/**
 * Standard English honorifics heavily used in Indian hospitals and clinics
 */
export const HONORIFIC_OPTIONS = [
  "Mr.",
  "Mrs.",
  "Ms.",
  "Miss",
  "Master",
  "Baby",
  "Baby of (B/o)",
  "Dr.",
  "Prof."
] as const;

/**
 * Cleans patient names by removing embedded titles/prefixes
 * and filtering out debug placeholders.
 */
export const cleanPatientName = (name: string | null | undefined, fallback: string = "Unnamed Patient"): string => {
  const sanitized = sanitizePatientName(name, fallback);
  let cleaned = sanitized.trim();
  
  // Repeatedly remove leading honorifics/prefixes to prevent duplicates (e.g. "Mr. Mr. Shiva" -> "Shiva")
  while (/^(mr|mrs|ms|miss|mx|dr|prof|prof\.\s*dr|shri|smt|kumari|sister|father|rev|late|capt|col|maj|adv|er|hon|master|baby\s+of(\s*\(b\/o\))?|baby|b\/o)\.?\s+/i.test(cleaned)) {
    cleaned = cleaned.replace(/^(mr|mrs|ms|miss|mx|dr|prof|prof\.\s*dr|shri|smt|kumari|sister|father|rev|late|capt|col|maj|adv|er|hon|master|baby\s+of(\s*\(b\/o\))?|baby|b\/o)\.?\s+/i, "").trim();
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

  let up = trimmed.toUpperCase().replace(/\.$/, "");

  if (["MR", "MRS", "MS", "DR", "PROF"].includes(up)) {
    return `${trimmed.replace(/\.$/, "")}.`;
  }
  if (up === "MISS") return "Miss";
  if (up === "MASTER") return "Master";
  if (up === "BABY") return "Baby";
  if (up === "BABY OF" || up === "BABY OF (B/O)" || up === "B/O") return "Baby of (B/o)";
  if (up === "LATE") return "Late";

  return trimmed;
};

/**
 * Formats patient names with honorific prefix if available.
 * Safely strips existing prefixes from the raw name to avoid duplicates like "MS. MS. M SABITHA"
 * Strict Rule: Never derives honorific from gender.
 */
export const formatPatientNameWithPrefix = (
  name: string | null | undefined,
  honorific: string | null | undefined,
  uppercase: boolean = true
): string => {
  const cleaned = cleanPatientName(name, "Unnamed Patient");
  const normHonorific = normalizeHonorific(honorific);

  if (normHonorific) {
    if (uppercase) {
      let upHonorific = normHonorific.toUpperCase();
      if (["MR.", "MRS.", "MS.", "DR."].includes(upHonorific)) {
        return `${upHonorific} ${cleaned.toUpperCase()}`.trim();
      }
      return `${upHonorific} ${cleaned.toUpperCase()}`.trim();
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
  uppercase: boolean = true
): string => {
  if (!patient && !appointment) return "Unnamed Patient";

  const rawName = 
    patient?.name || 
    patient?.user?.name || 
    appointment?.patientDetails?.name || 
    appointment?.patientName || 
    "Unnamed Patient";

  // 1. Check appointment honorific snapshot (highest priority for historical accuracy)
  const appHonorific = 
    appointment?.appointmentHonorific || 
    appointment?.honorific || 
    appointment?.patientDetails?.honorific;

  // 2. Check patient master honorific
  const patientHonorific = 
    patient?.honorific || 
    patient?.profile?.honorific || 
    patient?.user?.honorific || 
    patient?.honorificTitle;

  const finalHonorific = appHonorific || patientHonorific;
  return formatPatientNameWithPrefix(rawName, finalHonorific, uppercase);
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
