import { db } from '@/lib/db';
import { drugs } from '@/lib/db/schema/drugs';

const forms = ['TABLET', 'CAPSULE', 'SYRUP'];

const baseDrugs = [
  'ZERODOL-SP',
  'SPORIDEX 500 mg',
  'Fol-5 5 mg',
  'Novaclox 250 mg',
  'METROGYL 400 mg',
  'RABEKIND-DSR 375 mg',
  'AMOXICILLIN 500 mg',
  'AUGMENTIN 625 mg',
  'AZITHROMYCIN 500 mg',
  'CEFIXIME 200 mg',
  'CEPHALEXIN 500 mg',
  'CIPROFLOXACIN 500 mg',
  'CLINDAMYCIN 300 mg',
  'DOXYCYCLINE 100 mg',
  'ERYTHROMYCIN 250 mg',
  'LEVOFLOXACIN 500 mg',
  'OFLOXACIN 200 mg',
  'TINIDAZOLE 500 mg',
  'ORNIDAZOLE 500 mg',
  'PARACETAMOL 500 mg',
  'DOLO 650 mg',
  'IBUPROFEN 400 mg',
  'ACELOFENAC 100 mg',
  'DICLOFENAC 50 mg',
  'KETOROL-DT 10 mg',
  'NIMESULIDE 100 mg',
  'ETORICOXIB 90 mg',
  'PIROXICAM 20 mg',
  'PREDNISOLONE 5 mg',
  'DEXAMETHASONE 4 mg',
  'BETNESOL 0.5 mg',
  'CETIRIZINE 10 mg',
  'LEVOCETIRIZINE 5 mg',
  'LORATADINE 10 mg',
  'RANTAC 150 mg',
  'PANTOPRAZOLE 40 mg',
  'OMEPRAZOLE 20 mg',
  'RABEPRAZOLE 20 mg',
  'ESOMEPRAZOLE 40 mg',
  'ONDANSETRON 4 mg',
  'DOMPERIDONE 10 mg',
  'VITAMIN C 500 mg',
  'CALCIUM 500 mg',
  'B-COMPLEX',
  'ZINC 50 mg',
  'FOLIC ACID 5 mg',
  'CHLORHEXIDINE 0.2%',
  'BETADINE',
  'XYLOCAINE 2%',
  'MUCOPAIN',
  'DENTOGEL',
  'ORASEP',
  'SENSODYNE',
  'HEXIDINE',
  'LIGNOCAINE',
  'TRIAMCINOLONE',
  'ACYCLOVIR 400 mg',
  'FLUCONAZOLE 150 mg',
  'NYSTATIN',
  'CLOTRIMAZOLE',
  'MICONAZOLE',
  'TRANEXAMIC ACID 500 mg',
  'VITAMIN K',
  'FERROUS SULPHATE',
  'MULTIVITAMIN',
  'LACTOBACILLUS',
  'ORS',
  'AMBROXOL',
  'GUAIFENESIN',
  'SALBUTAMOL',
  'MONTELUKAST',
  'TELMISARTAN 40 mg',
  'AMLODIPINE 5 mg',
  'METFORMIN 500 mg',
  'ATORVASTATIN 10 mg',
  'ASPIRIN 75 mg',
  'CLOPIDOGREL 75 mg',
  'AMOXCLAV 375 mg',
  'MOX 500 mg',
  'MOXIKIND-CV 625 mg',
  'CIFRAN 500 mg',
  'TAXIM-O 200 mg',
  'ZIFI 200 mg',
  'Azee 500 mg',
  'AZAX 500 mg',
  'DOX 100 mg',
  'DALACIN-C 300 mg',
  'VOVERAN 50 mg',
  'HIFENAC-P',
  'ZERODOL-P',
  'MYOSPAS',
  'THIOCOLCHICOSIDE 4 mg',
  'PREGABALIN 75 mg',
  'GABAPENTIN 300 mg',
  'BECOSULES',
  'LIMCEE 500 mg',
  'SHELCAL 500 mg',
  'PAN-D',
  'RABEKIND-D',
  'PANTOCID-DSR',
  'METROGYL-DG',
  'ULGEL',
  'SMYLE',
  'KENACORT',
  'ORAWAYS',
  'CANDID',
];

export const defaultDrugLines = baseDrugs.flatMap((drug) => forms.map((form) => `${form} ${drug}`));

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

function parseDrugLine(line: string) {
  const [form, ...restParts] = line.trim().split(/\s+/);
  const rest = restParts.join(' ');
  const strength = rest.match(/\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|%)\b/i);

  return {
    id: `drug_${slugify(line)}`,
    name: `${form} ${rest}`,
    defaultStrength: strength?.[1] ?? null,
    defaultStrengthUnit: strength?.[2]?.toLowerCase() ?? null,
  };
}

export async function seedDrugs() {
  let seeded = 0;
  for (const line of defaultDrugLines) {
    const drug = parseDrugLine(line);
    await db
      .insert(drugs)
      .values({
        ...drug,
        defaultDuration: null,
        defaultDurationUnit: null,
        defaultFrequency: null,
        isActive: true,
        clinicId: null,
      })
      .onConflictDoNothing();
    seeded += 1;
  }
  return seeded;
}
