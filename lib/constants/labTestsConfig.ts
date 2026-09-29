/**
 * Lab Tests Configuration
 * 
 * This file contains common lab test names grouped by category.
 * Test names are used for quick selection during test creation.
 * 
 * ⚠️ IMPORTANT: Result fields are NOT stored here!
 * Result fields are configured dynamically through the UI (ResultParametersManager)
 * and stored in the database with each test.
 */

export function getTestsByCategory() {
    return {
        "Hematology": [
            "Haemoglobin (Hb)",
            "Total WBC Count",
            "RBC Count",
            "Platelet Count",
            "RBC Indices",
            "Complete Blood Count (CBC)",
            "Reticulocyte Count",
            "ESR (Westergren)",
            "Absolute Neutrophil Count",
            "Absolute Eosinophil Count",
            "Peripheral Smear",
            "Coagulation Profile",
            "D-Dimer",
            "Fibrinogen",
            "Bleeding Time",
            "Clotting Time",
            "Direct Coombs Test",
            "Indirect Coombs Test"
        ],
        "Clinical Biochemistry": [
            "Sodium",
            "Potassium",
            "Chloride",
            "Bicarbonate",
            "Uric Acid",
            "Kidney Function Test (KFT)",
            "Blood Urea",
            "Serum Creatinine"
        ],
        "Glucose & Diabetes": [
            "Blood Glucose (Fasting) - FBS",
            "Blood Glucose (Post Prandial) - PPBS",
            "Blood Glucose (Random) - RBS",
            "HbA1c",
            "Glucose Tolerance Test (GTT)",
            "Insulin (Fasting)",
            "C-Peptide"
        ],
        "Cardiac Markers": [
            "Troponin I",
            "CPK Total",
            "CPK-MB",
            "LDH",
            "Myoglobin"
        ],
        "Pancreatic Enzymes": [
            "Amylase",
            "Lipase"
        ],
        "Inflammation Markers": [
            "hs-CRP",
            "Homocysteine",
            "CRP (C-Reactive Protein)",
            "ASO Titre"
        ],
        "Iron Studies": [
            "Iron Studies",
            "Serum Iron",
            "TIBC",
            "Ferritin"
        ],
        "Liver Function Tests": [
            "Liver Function Test (LFT)",
            "Total Bilirubin",
            "Direct Bilirubin",
            "SGOT (AST)",
            "SGPT (ALT)",
            "ALP",
            "GGT",
            "Total Protein",
            "Albumin",
            "Globulin"
        ],
        "Lipid Profile": [
            "Lipid Profile",
            "Total Cholesterol",
            "HDL Cholesterol",
            "LDL Cholesterol",
            "Triglycerides",
            "VLDL"
        ],
        "Endocrinology & Hormones": [
            "Thyroid Profile (T3, T4, TSH)",
            "Thyroid Stimulating Hormone (TSH)",
            "T3 (Triiodothyronine)",
            "T4 (Thyroxine)",
            "Beta HCG",
            "Prolactin",
            "Vitamin D (25-OH)",
            "Vitamin B12",
            "Cortisol",
            "Testosterone",
            "Estradiol",
            "Progesterone",
            "FSH",
            "LH"
        ],
        "Tumor Markers": [
            "PSA (Prostate Specific Antigen)",
            "CEA (Carcinoembryonic Antigen)",
            "CA-125",
            "CA 19-9",
            "AFP (Alpha-Fetoprotein)"
        ],
        "Microbiology": [
            "Malaria Antigen Test",
            "Culture & Sensitivity (Urine)",
            "Culture & Sensitivity (Pus/Swab)",
            "Culture & Sensitivity (Blood)",
            "Culture & Sensitivity (Sputum)",
            "Mantoux Test (TB Skin Test)",
            "GeneXpert TB"
        ],
        "Urine Analysis": [
            "Urine Routine & Microscopy",
            "Urine Culture",
            "24-Hour Urine Protein",
            "Urine Microalbumin"
        ],
        "Stool Analysis": [
            "Stool Routine & Microscopy",
            "Stool Culture",
            "Stool Occult Blood"
        ],
        "Semen Analysis": [
            "Semen Analysis (Complete)"
        ],
        "Special Procedures": [
            "Pap Smear",
            "ABG (Arterial Blood Gas)",
            "Body Fluid Analysis (CSF/Pleural/Ascitic)",
            "Fine Needle Aspiration Cytology (FNAC)"
        ],
        "Serology & Immunology": [
            "Blood Grouping & Rh Typing",
            "Widal Test (Slide Method)",
            "VDRL / RPR",
            "HBsAg (Hepatitis B Surface Antigen)",
            "HCV (Hepatitis C Antibody)",
            "HIV I & II (Screening)",
            "Dengue IgG & IgM",
            "Typhoid IgG / IgM",
            "RA Factor (Rheumatoid Factor)",
            "ANA (Antinuclear Antibody)",
            "Anti-CCP"
        ],
        "Electrolytes": [
            "Sodium",
            "Potassium",
            "Chloride",
            "Calcium",
            "Phosphorus",
            "Magnesium"
        ]
    };
}

// Get all available test names (flattened from all categories)
export function getAllTestNames(): string[] {
    const categories = getTestsByCategory();
    const allTests: string[] = [];

    Object.values(categories).forEach(tests => {
        allTests.push(...tests);
    });

    // Remove duplicates and sort
    return Array.from(new Set(allTests)).sort();
}

// Get category for a specific test name
export function getTestCategory(testName: string): string | null {
    const categories = getTestsByCategory();

    for (const [category, tests] of Object.entries(categories)) {
        if (tests.includes(testName)) {
            return category;
        }
    }

    return null;
}
