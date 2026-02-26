export interface MedicalTerm {
  term: string;
  definition: string;
  category: string;
}

export const medicalTermsDictionary: Record<string, MedicalTerm> = {
  "anterior": { term: "Anterior", definition: "The front side of the body or organ.", category: "Anatomy" },
  "posterior": { term: "Posterior", definition: "The back side of the body or organ.", category: "Anatomy" },
  "lateral": { term: "Lateral", definition: "Relating to the side of the body or organ.", category: "Anatomy" },
  "medial": { term: "Medial", definition: "Toward the middle of the body.", category: "Anatomy" },
  "proximal": { term: "Proximal", definition: "Closer to the center of the body or point of attachment.", category: "Anatomy" },
  "distal": { term: "Distal", definition: "Farther from the center of the body or point of attachment.", category: "Anatomy" },
  "superior": { term: "Superior", definition: "Above or higher in position.", category: "Anatomy" },
  "inferior": { term: "Inferior", definition: "Below or lower in position.", category: "Anatomy" },
  "bilateral": { term: "Bilateral", definition: "Affecting both sides of the body.", category: "Anatomy" },
  "unilateral": { term: "Unilateral", definition: "Affecting only one side of the body.", category: "Anatomy" },
  "benign": { term: "Benign", definition: "Not cancerous; not harmful or dangerous.", category: "Diagnosis" },
  "malignant": { term: "Malignant", definition: "Cancerous; having the potential to spread and invade other tissues.", category: "Diagnosis" },
  "metastasis": { term: "Metastasis", definition: "The spread of cancer from one part of the body to another.", category: "Diagnosis" },
  "lesion": { term: "Lesion", definition: "An area of abnormal tissue, such as a wound, sore, or tumor.", category: "Findings" },
  "nodule": { term: "Nodule", definition: "A small, round lump or growth of tissue.", category: "Findings" },
  "mass": { term: "Mass", definition: "An abnormal lump or collection of tissue in the body.", category: "Findings" },
  "cyst": { term: "Cyst", definition: "A fluid-filled sac that can form in various parts of the body.", category: "Findings" },
  "calcification": { term: "Calcification", definition: "The buildup of calcium deposits in body tissue, often visible on imaging.", category: "Findings" },
  "effusion": { term: "Effusion", definition: "An abnormal collection of fluid in a body cavity.", category: "Findings" },
  "edema": { term: "Edema", definition: "Swelling caused by excess fluid trapped in body tissues.", category: "Findings" },
  "stenosis": { term: "Stenosis", definition: "Abnormal narrowing of a passage or opening in the body.", category: "Findings" },
  "occlusion": { term: "Occlusion", definition: "A blockage or closure of a blood vessel or hollow organ.", category: "Findings" },
  "atrophy": { term: "Atrophy", definition: "A decrease in size or wasting away of a body part or tissue.", category: "Findings" },
  "hypertrophy": { term: "Hypertrophy", definition: "An increase in size of an organ or tissue due to cell enlargement.", category: "Findings" },
  "opacity": { term: "Opacity", definition: "An area on an image that appears white or cloudy, indicating something is blocking X-rays.", category: "Imaging" },
  "lucency": { term: "Lucency", definition: "An area on an image that appears dark, indicating air or low-density material.", category: "Imaging" },
  "contrast": { term: "Contrast", definition: "A dye or substance used to make body structures more visible on imaging.", category: "Imaging" },
  "enhancement": { term: "Enhancement", definition: "Increased brightness on imaging after contrast is given, often indicating increased blood flow.", category: "Imaging" },
  "attenuation": { term: "Attenuation", definition: "The degree to which X-rays are absorbed by tissue; helps distinguish tissue types.", category: "Imaging" },
  "artifact": { term: "Artifact", definition: "A feature in an image that does not represent actual anatomy, often caused by motion or equipment.", category: "Imaging" },
  "herniation": { term: "Herniation", definition: "The protrusion of tissue or an organ through an abnormal opening.", category: "Findings" },
  "fracture": { term: "Fracture", definition: "A break or crack in a bone.", category: "Findings" },
  "pneumothorax": { term: "Pneumothorax", definition: "A collapsed lung caused by air leaking into the space between the lung and chest wall.", category: "Conditions" },
  "cardiomegaly": { term: "Cardiomegaly", definition: "An enlarged heart, often detected on chest X-rays.", category: "Conditions" },
  "pleural": { term: "Pleural", definition: "Relating to the thin membrane that lines the lungs and chest cavity.", category: "Anatomy" },
  "parenchyma": { term: "Parenchyma", definition: "The functional tissue of an organ, as distinguished from connective tissue.", category: "Anatomy" },
  "cortical": { term: "Cortical", definition: "Relating to the outer layer (cortex) of an organ.", category: "Anatomy" },
  "subcortical": { term: "Subcortical", definition: "Located beneath the cortex of an organ, especially the brain.", category: "Anatomy" },
  "periosteal": { term: "Periosteal", definition: "Relating to the membrane that covers the outer surface of bones.", category: "Anatomy" },
  "intracranial": { term: "Intracranial", definition: "Within the skull or cranium.", category: "Anatomy" },
  "intravenous": { term: "Intravenous", definition: "Within or administered into a vein.", category: "Procedures" },
  "etiology": { term: "Etiology", definition: "The cause or origin of a disease or condition.", category: "Diagnosis" },
  "prognosis": { term: "Prognosis", definition: "The expected course and outcome of a disease or condition.", category: "Diagnosis" },
  "acute": { term: "Acute", definition: "A condition that begins suddenly and is often severe but short in duration.", category: "Diagnosis" },
  "chronic": { term: "Chronic", definition: "A condition that develops slowly and persists over a long period.", category: "Diagnosis" },
  "degenerative": { term: "Degenerative", definition: "Relating to progressive deterioration or loss of function in organs or tissues.", category: "Diagnosis" },
  "inflammatory": { term: "Inflammatory", definition: "Related to or causing inflammation (redness, swelling, heat, pain).", category: "Diagnosis" },
  "ischemia": { term: "Ischemia", definition: "Reduced blood flow to a part of the body, which can cause tissue damage.", category: "Conditions" },
  "infarction": { term: "Infarction", definition: "Death of tissue due to lack of blood supply.", category: "Conditions" },
  "thrombosis": { term: "Thrombosis", definition: "The formation of a blood clot inside a blood vessel.", category: "Conditions" },
  "embolism": { term: "Embolism", definition: "A blockage in a blood vessel caused by a blood clot or other material.", category: "Conditions" },
  "aneurysm": { term: "Aneurysm", definition: "A bulge or ballooning in the wall of a blood vessel.", category: "Conditions" },
};

const termKeys = Object.keys(medicalTermsDictionary);

const escapedTerms = termKeys.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const termPattern = new RegExp(`\\b(${escapedTerms.join("|")})\\b`, "gi");

export interface IdentifiedTerm {
  term: string;
  definition: string;
  category: string;
  startIndex: number;
  endIndex: number;
}

export function parseReportTerms(reportText: string): IdentifiedTerm[] {
  if (!reportText) return [];
  const matches: IdentifiedTerm[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  termPattern.lastIndex = 0;
  while ((match = termPattern.exec(reportText)) !== null) {
    const termKey = match[1].toLowerCase();
    const entry = medicalTermsDictionary[termKey];
    if (entry && !seen.has(termKey)) {
      seen.add(termKey);
      matches.push({
        term: entry.term,
        definition: entry.definition,
        category: entry.category,
        startIndex: match.index,
        endIndex: match.index + match[1].length,
      });
    }
  }

  return matches;
}

export function generateSimplifiedReport(reportText: string): string {
  let simplified = reportText;

  const simplifications: Record<string, string> = {
    "no acute": "no urgent or sudden",
    "unremarkable": "normal",
    "within normal limits": "normal",
    "no evidence of": "no signs of",
    "cannot be excluded": "is possible",
    "correlate clinically": "discuss with your doctor",
    "follow-up recommended": "a follow-up visit is suggested",
    "findings suggest": "results point to",
    "no significant abnormality": "everything looks normal",
    "impression": "summary",
    "indication": "reason for the study",
    "technique": "how the scan was done",
    "comparison": "compared to previous scans",
  };

  for (const [medical, simple] of Object.entries(simplifications)) {
    simplified = simplified.replace(new RegExp(medical, "gi"), simple);
  }

  for (const [termKey, entry] of Object.entries(medicalTermsDictionary)) {
    const regex = new RegExp(`\\b${termKey}\\b`, "gi");
    simplified = simplified.replace(regex, `${entry.term} (${entry.definition.toLowerCase()})`);
  }

  return simplified;
}

export function getTermsByCategory(): Record<string, MedicalTerm[]> {
  const categories: Record<string, MedicalTerm[]> = {};

  for (const entry of Object.values(medicalTermsDictionary)) {
    if (!categories[entry.category]) {
      categories[entry.category] = [];
    }
    categories[entry.category].push(entry);
  }

  for (const terms of Object.values(categories)) {
    terms.sort((a, b) => a.term.localeCompare(b.term));
  }

  return categories;
}

export function searchTerms(query: string): MedicalTerm[] {
  const lower = query.toLowerCase();
  return Object.values(medicalTermsDictionary).filter(
    (t) =>
      t.term.toLowerCase().includes(lower) ||
      t.definition.toLowerCase().includes(lower) ||
      t.category.toLowerCase().includes(lower)
  );
}

export function getAllTermsSorted(): MedicalTerm[] {
  return Object.values(medicalTermsDictionary).sort((a, b) =>
    a.term.localeCompare(b.term)
  );
}
