import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 30 });

  // Create tables
  await sql`
    CREATE TABLE IF NOT EXISTS clinical_note_lookups (
      id text PRIMARY KEY NOT NULL,
      category text NOT NULL,
      name text NOT NULL,
      clinic_id text,
      is_active boolean DEFAULT true NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    )
  `;
  console.log('Created clinical_note_lookups');

  await sql`
    CREATE TABLE IF NOT EXISTS clinical_notes (
      note_id text PRIMARY KEY NOT NULL,
      patient_id text NOT NULL,
      clinic_id text NOT NULL,
      doctor_id text NOT NULL,
      doctor_name text NOT NULL,
      date timestamp with time zone DEFAULT now() NOT NULL,
      chief_complaints jsonb DEFAULT '[]'::jsonb,
      observations jsonb DEFAULT '[]'::jsonb,
      diagnoses jsonb DEFAULT '[]'::jsonb,
      investigations jsonb DEFAULT '[]'::jsonb,
      notes text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      created_by text NOT NULL
    )
  `;
  console.log('Created clinical_notes');

  // Seed lookups
  const COMPLAINTS = [
    'Plaque', 'Difficulty in moving Jaws', 'Swelling in Gums', 'Swelling in Jaws',
    'Difficulty in Chewing', 'Sensitive Teeth', 'Bleeding Gums', 'Bad Breath',
    'Teeth Grinding', 'Tooth Decay', 'Tooth Discoloration', 'Tooth Pain', 'Gum pain',
    'TEST', 'TOOTH REPLACEMENT', 'MISSING TEETH',
    'GENISIS 3.75 * 13 MM ACTIVE IMPLANT WITH COVER SCREW PLACED',
    'FIBRE POST DONE IN RELATION TO',
    'ORAL HEALTH CHECK -UP AND SENSITIVE TEETH',
    '3 D CONE BEAM CT IMAGING ( CBCT) - FULL JAW ( MAXILLA AND MANDIBLE )---',
    'MEASUREMENT TAKEN', 'ANTERIOR BITE PLANE FIXED', 'BRACKET FIXATION DONE',
    'MAXILLARY ARCH WIRE FIXED', 'MANDIBULAR ARCH WIRE FIXED', 'BRACKET REFIXATION',
    'MODULES PLACED', 'LIGATURE PLACED', 'BRACKET REMOVAL', 'E-CHAIN CHANGED',
    'E-CHAIN PLACED', 'LIGATURE REMOVED', 'ERUPTION OF 11 AND 21 TEETH',
    'FIRST VISIT PREMOLAR -- ACCESS OPENED ROOT LENGTH - mm BMP- HAND FILES 10,15,20 ORIFICE OPENER NO.10- 4% NO.20 -4% NO.25- 4% NO.25- 6% NO.30 - 6 % NEOCAL PLACED WITH CLOSURE OF ACCESS OPENING WITH TEMP DONE---',
  ];

  const OBSERVATIONS = [
    'Swollen Gums', 'Plaque & Tartar', 'Cavity', 'Tooth Decay - Stage 1',
    'Tooth Decay - Stage 2', 'Tooth Decay - Stage 3', 'Tooth Decay - Stage 4',
    'Tooth Decay - Stage 5', 'Tooth Decay - Stage 6', 'Swollen Neck Glands',
    'Infection in Gums', 'Pockets between teeth and gum', 'ABRASION',
    'GROSSLY DECAYED TEETH 13', 'MISSING TEETH 31',
    'DEEP DENTAL CARIES WITH PULP INVOLVEMENT 46',
    'AVULSED TOOTH UPPER CENTRAL ( RIGHT AND LEFT ) AND FRACTURED AND DISLODGEMENT FROM TOOTH FROM BONE SOCKETLEFT LATERAL INCISOR',
  ];

  const DIAGNOSES = [
    'Coronal Cavities', 'Root Caries', 'Dental Erosion', 'Periodontitis',
    'Halitosis', 'Gingivitis', 'Dry Socket', 'Dental Abscess', 'Malocclusion',
    'Cracked Tooth Syndrome', 'Temporomandibular Joint Disorder', 'Pericoronitis',
    'Bruxism', 'Baby Bottle Tooth Decay', 'Oral Cancer', 'CERVICAL ABRASION',
    'MILD GINGIVITIS', 'BLOOD SUGAR LEVEL ( FB, PB)', 'IRREVERSIBLE PULPITIS',
    'complete blood count',
  ];

  const INVESTIGATIONS = [
    'XRAY', 'OPG', 'BLOOD SUGAR LEVEL ( P B)', 'HB A1C', 'complete blood count',
    'lateral cephalogram',
    '3 D CONE BEAM CT IMAGING ( CBCT) - FULL JAW ( MAXILLA AND MANDIBLE )---',
    '3 D CONE BEAM CT IMAGING ( CBCT) - FULL SKULL )', 'IOPA',
    'BLOOD SUGAR LEVEL ( FASTING AND POST -PRANDIAL)',
  ];

  const NOTES = [
    'PROCEDURE',
    'ACESS OPENED BMP DONE WITH NO 10 15 20 25 K FILE TF GIVEN',
    'ACESS OPENED BMP DONE WITH NO 10 15 20 25 KL FILE , NO 25 6 ...',
    'bmp done irrigation done with NAOHCL,NORMAL SAL',
    'bmp done with no 10 15 20 25 k file and no 25 hyflex 6% fo mb ml db dl canals and obturation done---',
    'obturation done buccal and palalatal canal with no 25 6% gp points---',
    'IMPLANT GENISIS 3.5 8, 10 MM PLACED IN RELATION TO 37',
    'GENISIS 3.75 * 13 MM ACTIVE IMPLANT WITH HEALING CAP PLACED',
    'Implant GENISIS AKTIVE 15- 3.5*11.5 , 12- 3*13 , 22- 3.5*13, 24-3*13, 26-3.5*13d---',
    'bmp done with no 10 15 20 25 k file and no 15 20 flexICON 6% fo mb ml db dl canals and obturation done---',
    'OBTURATION DONE WITH NO 35 MM GP POINTS',
    'BMP DONE WITH NO 10 15 20 K FILE , NO 25, 6 AND 8% FLEX FILE , OBTURATION DONE WITH NO 25 GP POINTS MB# DB P CANALS---',
    'GENISIS 3.75 * 13 MM ACTIVE IMPLANT WITH COVER SCREW PLACED',
    'ACESS OPENED BMP DONE WITH NO 10 15 20 25 K FILE TF GIVEN. bmp done with no 10 15 20 25 k file and no 15 20 FLEXER 6% fo mb ml db dl canals and obturation done WITH no 20 gp points mb db ml dl canals---',
    'COMPOSITE FILLING - CLASS 2',
    'COMPOSITE FILLING - CLASS 2 IN RELATION TO',
    'FIBRE POST DONE IN RELATION TO',
    'UPPER AND LOWER ALIGINATE IMPRESSION DONE',
    'TOOTH SHADE -',
    'ACESS OPENED BMP DONE WITH NO 10 15 20 25 KL FILE MESIO BUCCAL AND DISTO BUCCAL AND PALATAL CANAL , NO 25 6 AND 8% HYFLEX FILE , 6 % M-2 AND C1 FLEXER FILE , OPEN DRESSING GIVEN---',
    'CLOSED DRESSING GIVEN WITH ZNOE CEMENT IN RELATION TO 16',
    'ADVISED TREATMENT : ROOT CANAL TREATMENT IN RELATIONTO UPPER RIGHT FIRST MOLAR TEETH---',
    'ADVISED TREATMENT 1-RE POSITIONING MAXILLARY LEFT LATERAL INCISORS AND ROOT CANAL TREATMENT FOR THE SAME 2-REPLACEMENT OF TOOTH BY IMPLANT -MAXILLARY RIGHT AND LEFT CENTRAL INCISORS---',
    'ACESS OPENED BMP DONE WITH NO 10 15 20 25 KL FILE , NO 202% 4% 6% walflex gold file znoe t f given---',
    'E CHAIN PLACED', 'MOLAR TUBE BAND FIXATION',
    'ACESS OPENED BMP DONE WITH NO 10 15 20 K FILE TF GIVEN NO 30 -8% , NO:10-4% RL : 21 MM NEO CAL,TEMP GIVEN---',
    'E- CHAIN FIXATION DOE IN RELATION BETWEEN',
    'SUTURE REMOVAL',
    'TOOTH NO: RL - mm BMP - no.17,20,25 = 4% no.25 = 6% , no.F2,F3 NEOPEX INTRACANAL MEDICAMENT DONE---',
    'TOOTH NO: CANALS: BUCCAL AND PALATAL RL - mm BMP - no.17,20,25 = 4% no.25 = 6% , no.F2,F3 NEOPEX INTRACANAL MEDICAMENT DONE---',
    'SINGLE VISIT MOLAR (BIO ACTIVE RCS) ACCESS OPENED ROOT LENGTH MESIO BUCCAL - DISTO BUCCAL - PALATAL- BMP- HAND FILES 10,15,20 ORIFICE OPENER NO.10- 4% NO.20 -4% NO.25- 4% NO.25- 6% DONE OBTURATION NO.25- 6% SUREDENT GP WITH BIOCERAMIC SEALER(BIO-ACTIVE RCS) TEMP (CAOH PASTE) FOR ACCESS FILLING---',
    'SINGLE VISIT MOLAR (CERASAL-METABIOMET) ACCESS OPENED ROOT LENGTH MESIO BUCCAL - DISTO BUCCAL - PALATAL- BMP- HAND FILES 10,15,20 ORIFICE OPENER NO.10- 4% NO.20 -4% NO.25- 4% NO.25- 6% DONE OBTURATION NO.25- 6% SUREDENT GP WITH BIOCERAMIC SEALER(CERASEAL METABIOMET) TEMP (CAOH PASTE) FOR ACCESS FILLING---',
    'FIRST VISIT MOLAR (BIO ACTIVE RCS) ACCESS OPENED ROOT LENGTH MESIO BUCCAL - DISTO BUCCAL - PALATAL- BMP- HAND FILES 10,15,20 ORIFICE OPENER NO.10- 4% NO.20 -4% NO.25- 4% NO.25- 6% DONE---',
    'SECOND VISIT MOLAR (BIO ACTIVE RCS) OBTURATION NO.25- 6% SUREDENT GP WITH BIOCERAMIC SEALER(BIO-ACTIVE RCS) TEMP (CAOH PASTE) FOR ACCESS FILLING---',
    'FIRST VISIT MOLAR (CERASEAL METABIOMED) ACCESS OPENED ROOT LENGTH MESIO BUCCAL - DISTO BUCCAL - PALATAL- BMP- HAND FILES 10,15,20 ORIFICE OPENER NO.10- 4% NO.20 -4% NO.25- 4% NO.25- 6% DONE---',
    'SECOND VISIT MOLAR (CERASEAL METABIOMED) OBTURATION NO.25- 6% SUREDENT GP WITH BIOCERAMIC SEALER(CERASEAL METABIOMED) TEMP (CAOH PASTE) FOR ACCESS FILLING---',
    'suture removal done in relation to',
    'ceramic crown fixation done in relation to',
    '19*25 NITI TRUEFORM ( G&H) ARCH WIRE - REMOVED .',
    '16*25 CU - NI TI (( METRO ) ARCH WIRE FIXATION DONE',
    'ARCH WIRE ENGAGED IN RELATION TO',
    'FILLING - COMPOSITE RESIN', 'extraction 38',
    'POST-FIBER FIXATION DONE WITH GC CEM CAPSULE IN RELATION TO',
    'ORTHO WIRE CHANGE- 016 * 025 CU NI TI ( METRO ) -',
    'ORTHO WIRE CHANGE- 016 * 025 CU NI TI ( METRO ) - FOR MANDIBULAR TEETH---',
    'ORTHO - LIGATURE TIE DONE IN RELATION TO',
    'LINGUAL BUTTON - FIXATION', 'SUTURE GIVEN',
    'NEW BRACKET REFIXATION IRT', 'BRACKET REFIXATION IRT',
    '16*25 cu-niti metro upper arch wire',
    'FIRST VISIT ACCESS OPENED ROOT LENGTH mm BMP- HAND FILES 10,15,20 ORIFICE OPENER NO.10- 4% NO.20 -4% NO.25- 4% NO.25- 6%---',
    'SECOND VISIT (BIO ACTIVE RCS) OBTURATION NO.25- 6% SUREDENT GP WITH BIOCERAMIC SEALER(BIO-ACTIVE RCS) RC GIC FOR ACCESS FILLING---',
    'CONSULTATION', 'CHECKUP',
    '17*25 METRO NITI ARCH WIRE FIXED FOR MAXILLARY ARCH',
    '19*25 metro niti arch wire fixed for maxillary arch',
    'ARCH WIRE - 17 * 25 3 M NIT I',
    'SECOND VISIT MOLAR (CERASEAL METABIOMED) OBTURATION NO.25- 6% SUREDENT GP WITH BIOCERAMIC SEALER(CERASEAL METABIOMED) RC GIC FOR ACCESS FILLING---',
    'Dr.s.m.Ameerdeen',
    'Cera-seal obturation done with no 25 gp points rl 20 mm',
    'Dr.Mubeen', 'Dr.Padmavathy', 'Dr.Ammarsha', 'Dr.Visalakshi',
    'TE ECHONME', '3 M = 19*25 c ni ti',
    'Core filling done using composite and crown measurement taken.',
    'crown measurement taken in',
    'EXTRACTION WITH SUTURING DONE',
    'obturation done with bio active rcs single canal',
    'bmp done safe endo file till 35 6% = rl 20 mm caoh temp given',
    'OBTURATION DONE WITH CERASEAL (META BIO MET ) , CANALS : BUCCAL AND PALATAL , GP: NO 25 6%---',
    'REMOVED: 0.14 3M ARCH WIRE',
    'ARCHWIRE CHANGED :0.16 G& H',
  ];

  const LOOKUP_DATA: Record<string, string[]> = {
    complaint: COMPLAINTS,
    observation: OBSERVATIONS,
    diagnosis: DIAGNOSES,
    investigation: INVESTIGATIONS,
    note: NOTES,
  };

  let count = 0;
  for (const [category, items] of Object.entries(LOOKUP_DATA)) {
    const unique = [...new Set(items)];
    for (const name of unique) {
      const id = `gl_${category}_${count}`;
      try {
        await sql`INSERT INTO clinical_note_lookups (id, category, name, clinic_id, is_active) VALUES (${id}, ${category}, ${name}, ${null}, ${true}) ON CONFLICT DO NOTHING`;
        count++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Failed: ${name}: ${msg}`);
      }
    }
  }
  console.log(`Seeded ${count} clinical note lookups.`);

  const rows = await sql`SELECT category, count(*)::int as cnt FROM clinical_note_lookups GROUP BY category ORDER BY category`;
  for (const r of rows) console.log(`  ${r.category}: ${r.cnt}`);

  await sql.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
