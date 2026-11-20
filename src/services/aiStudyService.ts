import { supabase } from '@/services/supabase/client';
import { db } from '@/services/supabase/database';
import { OFFICIAL_COURSES, CollegeCourse } from '@/constants/courses';

export type LearningMode = 
  | 'ask' 
  | 'explain_simply' 
  | 'short_notes' 
  | 'important_questions' 
  | 'mcq' 
  | 'vocab' 
  | 'analogy';

export interface MCQQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface AIStudyMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  mode?: LearningMode;
  course?: string;
  subject?: string;
  mcq?: MCQQuestion;
  selectedMcqOption?: number;
}

export interface CourseSubjectInfo {
  courseName: string;
  semesters: number;
  subjects: string[];
  sampleQuestions: string[];
  quickVocabulary: Array<{ term: string; simpleMeaning: string }>;
}

export const COURSE_SYLLABUS_MAP: Record<string, CourseSubjectInfo> = {
  'B.VOC Medical Lab Technology (MLT)': {
    courseName: 'B.VOC Medical Lab Technology (MLT)',
    semesters: 6,
    subjects: [
      'Hematology & Blood Banking',
      'Clinical Biochemistry',
      'Medical Microbiology',
      'Clinical Pathology & Histotechnology',
      'Immunology & Serology',
      'Lab Instrumentation & Automation'
    ],
    sampleQuestions: [
      'What is blood grouping?',
      'What is hemoglobin?',
      'Explain RBC and WBC.',
      'What is centrifugation?',
      'What is a microscope?'
    ],
    quickVocabulary: [
      { term: 'Centrifugation', simpleMeaning: 'Spinning liquid samples very fast to separate heavy particles (like blood cells) from clear liquid (plasma).' },
      { term: 'Hemoglobin', simpleMeaning: 'An iron-rich protein inside red blood cells that carries oxygen from your lungs to the rest of your body.' },
      { term: 'Anticoagulant', simpleMeaning: 'A special chemical added to test tubes to prevent blood samples from clotting before testing.' },
      { term: 'Agglutination', simpleMeaning: 'Clumping together of blood cells when mixed with matching antibodies, used to identify blood groups.' }
    ]
  },
  'B.VOC Dialysis Technology': {
    courseName: 'B.VOC Dialysis Technology',
    semesters: 6,
    subjects: [
      'Principles of Hemodialysis',
      'Renal Anatomy & Physiology',
      'Dialyzer & Dialysate Chemistry',
      'Peritoneal Dialysis',
      'Vascular Access Care (AV Fistula)',
      'Dialysis Machine Technology'
    ],
    sampleQuestions: [
      'What is dialysis?',
      'Why is dialysis needed?',
      'What is the function of a dialyzer?',
      'What is the difference between hemodialysis and peritoneal dialysis?',
      'What is an AV Fistula?'
    ],
    quickVocabulary: [
      { term: 'Dialyzer', simpleMeaning: 'An artificial kidney device with microscopic filter tubes that removes waste products and excess water from blood.' },
      { term: 'AV Fistula', simpleMeaning: 'A surgically created connection between an artery and a vein in the arm to provide strong blood flow for dialysis.' },
      { term: 'Ultrafiltration', simpleMeaning: 'The controlled removal of extra fluid from a patient’s blood during a dialysis session.' },
      { term: 'Dialysate', simpleMeaning: 'A purified fluid containing balanced minerals that washes toxins out of blood across the dialysis membrane.' }
    ]
  },
  'B.VOC Radiology & Medical Imaging Technology': {
    courseName: 'B.VOC Radiology & Medical Imaging Technology',
    semesters: 6,
    subjects: [
      'Radiographic Physics & Darkroom Techniques',
      'Human Anatomy for Medical Imaging',
      'CT Scan Technology',
      'Magnetic Resonance Imaging (MRI)',
      'Radiation Safety & Protection',
      'Contrast Media & Fluoroscopy'
    ],
    sampleQuestions: [
      'How do X-rays produce an image?',
      'What is the difference between CT and MRI?',
      'What are the 3 cardinal rules of radiation safety?',
      'What is a contrast medium in radiology?',
      'How does an ultrasound probe work?'
    ],
    quickVocabulary: [
      { term: 'Attenuation', simpleMeaning: 'How much X-ray beam energy is absorbed or weakened as it passes through body tissues like bone and muscle.' },
      { term: 'Contrast Agent', simpleMeaning: 'A safe liquid dye (like iodine or barium) given to a patient to make organs show up clearly on X-rays or CT scans.' },
      { term: 'ALARA', simpleMeaning: '"As Low As Reasonably Achievable" — the universal safety rule to keep radiation exposure to patients and technicians at the minimum.' }
    ]
  },
  'B.VOC Cardiac Care Technology': {
    courseName: 'B.VOC Cardiac Care Technology',
    semesters: 6,
    subjects: [
      'Cardiac Anatomy & Electrophysiology',
      'Electrocardiography (ECG / EKG)',
      'Echocardiography Fundamentals',
      'Cardiac Catheterization & Angiography',
      'Coronary Artery Disease & Care',
      'Intensive Cardiac Care & Defibrillation'
    ],
    sampleQuestions: [
      'How to read basic ECG waves (P, QRS, T)?',
      'What is a myocardial infarction (heart attack)?',
      'What is an echocardiogram?',
      'What are the immediate steps in CPR?',
      'What does a pacemaker do?'
    ],
    quickVocabulary: [
      { term: 'QRS Complex', simpleMeaning: 'The tall wave spike on an ECG showing the electrical contraction of the heart’s lower pumping chambers (ventricles).' },
      { term: 'Arrhythmia', simpleMeaning: 'Any irregular, too fast, or too slow heartbeat rhythm.' },
      { term: 'Angiography', simpleMeaning: 'An X-ray imaging test using dye to spot blockages inside the heart’s blood vessels.' }
    ]
  },
  'B.VOC Operation Theatre Technology': {
    courseName: 'B.VOC Operation Theatre Technology',
    semesters: 6,
    subjects: [
      'Sterilization & Disinfection Techniques',
      'Surgical Instruments & Equipment Care',
      'Anesthesia Principles & Gases',
      'Operation Theatre Zoning & Asepsis',
      'Patient Positioning & Safety',
      'Emergency Resuscitation in OT'
    ],
    sampleQuestions: [
      'How does an autoclave sterilize surgical tools?',
      'What are the 4 main zones of an Operation Theatre?',
      'What is surgical asepsis?',
      'What is the difference between general and local anesthesia?',
      'How is sterile gowning and gloving performed?'
    ],
    quickVocabulary: [
      { term: 'Autoclave', simpleMeaning: 'A pressure chamber that uses high-temperature steam (121°C) to kill all germs and spores on surgical equipment.' },
      { term: 'Asepsis', simpleMeaning: 'The complete absence of disease-causing bacteria, viruses, and microorganisms in the operating room.' },
      { term: 'Laminar Airflow', simpleMeaning: 'A specialized continuous stream of ultra-filtered air that blows germs away from the open surgery table.' }
    ]
  },
  'B.VOC Hospital Administration (3 Years)': {
    courseName: 'B.VOC Hospital Administration (3 Years)',
    semesters: 6,
    subjects: [
      'Hospital Operations & Department Management',
      'Medical Records & Health Informatics',
      'Healthcare Quality & NABH Standards',
      'Biomedical Waste Management',
      'Patient Relations & Grievance Redressal',
      'Hospital Financial Management'
    ],
    sampleQuestions: [
      'What is hospital triage?',
      'How is biomedical waste separated by color codes?',
      'What are NABH quality standards?',
      'What is an Electronic Health Record (EHR)?',
      'How should a patient grievance be handled?'
    ],
    quickVocabulary: [
      { term: 'Triage', simpleMeaning: 'Sorting arriving emergency patients based on medical urgency rather than who arrived first.' },
      { term: 'NABH', simpleMeaning: 'National Accreditation Board for Hospitals — official quality and safety standards for healthcare facilities.' },
      { term: 'Yellow Bin', simpleMeaning: 'The designated biomedical waste bag for infected anatomical tissues, soiled bandages, and expired medicines.' }
    ]
  },
  'Logistics & Supply Chain Management (1 Year)': {
    courseName: 'Logistics & Supply Chain Management (1 Year)',
    semesters: 2,
    subjects: [
      'Medical Supply Chain & Cold Chain Management',
      'Inventory Control & Warehousing (FIFO/FEFO)',
      'Hospital Material Procurement & Distribution',
      'Transport Logistics & Fleet Scheduling'
    ],
    sampleQuestions: [
      'What is the pharmaceutical cold chain?',
      'What is FIFO vs FEFO in medical inventory?',
      'What is buffer stock in a hospital warehouse?',
      'How are emergency medicines expedited?'
    ],
    quickVocabulary: [
      { term: 'Cold Chain', simpleMeaning: 'A temperature-controlled supply chain (typically 2°C to 8°C) needed to keep vaccines and biologics effective.' },
      { term: 'FEFO', simpleMeaning: '"First Expired, First Out" — issuing medicines that expire soonest before newer batches.' }
    ]
  },
  'Hospitality Management (1 Year)': {
    courseName: 'Hospitality Management (1 Year)',
    semesters: 2,
    subjects: [
      'Healthcare Hospitality & Housekeeping',
      'Patient Food, Nutrition & Dietetics Logistics',
      'Front Desk, Patient Reception & Communication',
      'Sanitation & Infection Control Standards'
    ],
    sampleQuestions: [
      'How to maintain clean and sanitized patient rooms?',
      'What are hospital dietary requirements for patients?',
      'How to communicate with stressed families at reception?',
      'What are standard hospitality hygiene protocols?'
    ],
    quickVocabulary: [
      { term: 'Terminal Cleaning', simpleMeaning: 'Deep sanitization and sterilization of an entire patient room after a patient is discharged.' },
      { term: 'Service Etiquette', simpleMeaning: 'Polite, empathetic, and respectful communication with patients, visitors, and medical doctors.' }
    ]
  },
  'Hospital Administration (1 Year)': {
    courseName: 'Hospital Administration (1 Year)',
    semesters: 2,
    subjects: [
      'Clinical Support Operations',
      'Medical Billing & Insurance Desk',
      'Hospital Information Systems (HIS)',
      'Patient Safety & Accreditation'
    ],
    sampleQuestions: [
      'What is the function of the hospital admission desk?',
      'How does cashless health insurance processing work?',
      'What is a Hospital Information System (HIS)?',
      'What are the key patient rights in a hospital?'
    ],
    quickVocabulary: [
      { term: 'HIS', simpleMeaning: 'Hospital Information System — computer software that links doctor notes, lab results, billing, and pharmacy.' },
      { term: 'TPA', simpleMeaning: 'Third Party Administrator — company that processes health insurance claims between the hospital and insurer.' }
    ]
  }
};

/**
 * Curated Paramedical Academic Knowledge Base.
 * Provides instant, high-quality, beginner-friendly answers matching the exact prompt style:
 * - Simple English for beginners
 * - 2 to 5 sentences for concepts
 * - Step-by-step numbered points when explaining how something works
 * - Real-world everyday examples and analogies
 */
interface CuratedTopic {
  keywords: string[];
  courseId?: string;
  basicAnswer: string;
  simpleExplanation: string;
  shortNotes: string[];
  importantQuestions: string[];
  mcq: MCQQuestion;
  vocabulary: { term: string; meaning: string };
  analogy: string;
}

const CURATED_KNOWLEDGE: CuratedTopic[] = [
  {
    keywords: ['blood grouping', 'blood group', 'abo', 'rh factor', 'blood type'],
    basicAnswer: 'Blood grouping is a laboratory test used to find out what type of blood a person has (A, B, AB, or O, along with Rh positive or negative). It is determined by tiny protein markers called antigens found on the surface of red blood cells. Matching blood groups before transfusion is critical so the patient’s immune system does not destroy the donor blood.',
    simpleExplanation: 'Think of red blood cells like people wearing name tags. If your tag says "A", your body accepts "A". If someone gives you blood with a "B" tag, your body thinks it is an intruder and attacks it. Group O has no tags, so anyone can receive it safely in an emergency.',
    shortNotes: [
      'ABO System divides blood into four types: A, B, AB, and O.',
      'Rh factor decides if blood is Positive (+) or Negative (-).',
      'Type O-Negative is the universal donor; Type AB-Positive is the universal receiver.',
      'Always perform cross-matching before any blood transfusion to prevent fatal reactions.'
    ],
    importantQuestions: [
      '1. Name the four major blood groups in the ABO system and their antigens.',
      '2. Why is O-negative called the universal donor?',
      '3. What is the clinical significance of the Rh factor in pregnancy?',
      '4. What happens during a hemolytic transfusion reaction?'
    ],
    mcq: {
      question: 'Which blood group is known as the "Universal Donor" because it can be safely given to almost any patient?',
      options: ['Blood Group A Positive', 'Blood Group B Negative', 'Blood Group O Negative', 'Blood Group AB Positive'],
      answerIndex: 2,
      explanation: 'O Negative red blood cells do not have A, B, or Rh antigens on their surface. This means a recipient’s immune system will not attack them.'
    },
    vocabulary: {
      term: 'Antigen',
      meaning: 'A marker molecule on the surface of red blood cells that triggers an immune response if recognized as foreign.'
    },
    analogy: 'Blood groups are like phone charging cables: you need the right plug type (A, B, C) that fits your phone port safely without short-circuiting.'
  },
  {
    keywords: ['hemoglobin', 'hb', 'hba1c', 'iron in blood'],
    basicAnswer: 'Hemoglobin is an iron-rich protein packed inside red blood cells. Its main job is to pick up oxygen in your lungs and deliver it to every tissue and organ in your body. It also picks up carbon dioxide waste from tissues and carries it back to the lungs to be exhaled.',
    simpleExplanation: 'Imagine red blood cells are delivery vans, and hemoglobin is the storage box inside each van. The storage box loads fresh oxygen at the lungs and delivers it to muscles and organs so they have energy to work.',
    shortNotes: [
      'Normal Hemoglobin range: 13.5–17.5 g/dL for adult males, 12.0–15.5 g/dL for adult females.',
      'Low hemoglobin levels indicate anemia, causing fatigue and pale skin.',
      'Each hemoglobin molecule contains 4 iron atoms that bind with 4 oxygen molecules.',
      'Measured using a Sahli’s hemoglobinometer or automated hematology analyzers.'
    ],
    importantQuestions: [
      '1. What is the primary biological function of hemoglobin?',
      '2. What are the normal reference ranges for hemoglobin in men and women?',
      '3. Which mineral is essential for the synthesis of hemoglobin?',
      '4. Describe the principles of Sahli’s acid hematin method.'
    ],
    mcq: {
      question: 'Which essential mineral is present at the center of each heme group in hemoglobin to bind oxygen?',
      options: ['Calcium', 'Iron', 'Magnesium', 'Potassium'],
      answerIndex: 1,
      explanation: 'Iron (Fe) is the central atom in each heme group. It physically binds oxygen molecules so red blood cells can transport them.'
    },
    vocabulary: {
      term: 'Anemia',
      meaning: 'A medical condition where blood has lower than normal hemoglobin or red blood cells, causing tiredness and weakness.'
    },
    analogy: 'Hemoglobin is like a school bus: it picks up oxygen children at the lung station and safely drops them off at body organ classrooms.'
  },
  {
    keywords: ['rbc', 'wbc', 'red blood cell', 'white blood cell', 'erythrocyte', 'leukocyte'],
    basicAnswer: 'RBCs (Red Blood Cells) carry oxygen throughout the body using hemoglobin and have no nucleus. WBCs (White Blood Cells) are the body’s defense system that fight infections, bacteria, and viruses. While RBCs make up the majority of blood cells, WBCs are fewer in number but can multiply quickly when you get sick.',
    simpleExplanation: 'RBCs are the workers bringing food and oxygen to all body parts. WBCs are the security guards protecting the body from invading bacteria and viruses.',
    shortNotes: [
      'RBC lifespan: approximately 120 days; shape is a flexible biconcave disc.',
      'WBC types: Neutrophils, Lymphocytes, Monocytes, Eosinophils, and Basophils.',
      'Normal RBC count: 4.5 to 5.5 million cells per microliter.',
      'Normal WBC count: 4,000 to 11,000 cells per microliter.'
    ],
    importantQuestions: [
      '1. Differentiate between erythrocytes and leukocytes in structure and function.',
      '2. What is the average lifespan of a human red blood cell?',
      '3. List the five types of white blood cells found in peripheral blood.',
      '4. What does an elevated WBC count (leukocytosis) usually indicate?'
    ],
    mcq: {
      question: 'What is the primary role of White Blood Cells (leukocytes) in human blood?',
      options: ['Carry oxygen to brain cells', 'Fight infections and defend against germs', 'Produce insulin hormone', 'Help blood flow faster in veins'],
      answerIndex: 1,
      explanation: 'WBCs are key components of the immune system that identify, engulf, and neutralize harmful bacteria, viruses, and pathogens.'
    },
    vocabulary: {
      term: 'Phagocytosis',
      meaning: 'The process where immune cells (like neutrophils and macrophages) swallow and digest harmful germs.'
    },
    analogy: 'RBCs are like delivery trucks carrying packages of oxygen; WBCs are like police patrol cars guarding the highways against intruders.'
  },
  {
    keywords: ['centrifugation', 'centrifuge', 'separating blood', 'plasma separation'],
    basicAnswer: 'Centrifugation is a laboratory technique that spins biological samples at very high speeds. The rapid spinning force (centrifugal force) pushes heavier components, such as red and white blood cells, to the bottom of the tube. This leaves clear serum or plasma at the top, ready for chemical and clinical testing.',
    simpleExplanation: 'Centrifugation works just like the spin cycle of a washing machine. When water and clothes spin fast, water gets pushed outward. In a blood tube, spinning fast forces heavy blood cells to the bottom so lab technicians can test the clear liquid on top.',
    shortNotes: [
      'Always balance the centrifuge rotor by placing tubes of equal weight directly opposite each other.',
      'Separates blood into three layers: packed RBCs (bottom), buffy coat/WBCs (middle), and plasma/serum (top).',
      'Standard clinical blood separation: 3,000 to 4,000 RPM for 10 minutes.',
      'Never open the centrifuge lid while the rotor is still spinning.'
    ],
    importantQuestions: [
      '1. State the basic principle of centrifugation.',
      '2. Why is mechanical balancing essential when loading a centrifuge?',
      '3. What are the three distinct layers obtained after centrifuging anticoagulated blood?',
      '4. What is the difference between RPM (revolutions per minute) and RCF (relative centrifugal force)?'
    ],
    mcq: {
      question: 'What is the most critical safety rule before starting a laboratory centrifuge?',
      options: ['Heat the samples to 50°C', 'Ensure tubes placed opposite each other are balanced in weight', 'Keep the lid open to watch rotation', 'Add water to every blood tube'],
      answerIndex: 1,
      explanation: 'Operating an unbalanced centrifuge can cause heavy vibration, sample breakage, and dangerous machine damage.'
    },
    vocabulary: {
      term: 'Supernatant',
      meaning: 'The clear liquid that remains on top of a tube after the solid particles settle at the bottom during centrifugation.'
    },
    analogy: 'Centrifugation is like taking muddy water in a bucket and whirling it around: the heavy mud packs firmly at the bottom, leaving clear water above.'
  },
  {
    keywords: ['microscope', 'compound microscope', 'objective lens', 'magnification'],
    basicAnswer: 'A microscope is an optical precision instrument used to magnify tiny biological specimens (like blood cells, bacteria, and tissues) that cannot be seen with the naked eye. In medical laboratories, compound light microscopes use two lens systems (ocular and objective lenses) to magnify objects up to 1000 times their real size. Oil immersion lenses (100x) are specifically used to examine blood smears and bacteria.',
    simpleExplanation: 'A microscope is like an ultra-powerful magnifying glass with bright lights. It makes a tiny red blood cell look as big as a coin so lab technicians can see if it is healthy or infected.',
    shortNotes: [
      'Total Magnification = Ocular Lens Power (usually 10x) × Objective Lens Power (10x, 40x, 100x).',
      'The 100x objective requires cedarwood or synthetic immersion oil to prevent light refraction.',
      'Use the coarse adjustment knob only under low power (4x or 10x) to avoid breaking glass slides.',
      'Keep lenses clean using specialized lens paper and 70% alcohol or ether.'
    ],
    importantQuestions: [
      '1. Calculate the total magnification when using a 10x eyepiece with a 40x objective lens.',
      '2. Why is immersion oil used with the 100x objective lens?',
      '3. Name the two knobs used for focusing on a compound microscope.',
      '4. How do you prepare a thin peripheral blood smear for microscopic examination?'
    ],
    mcq: {
      question: 'What is the total magnification of a specimen viewed with a 10x eyepiece and a 40x objective lens?',
      options: ['50x', '100x', '400x', '4000x'],
      answerIndex: 2,
      explanation: 'Total magnification is calculated by multiplying eyepiece power (10x) by objective power (40x), which equals 400x.'
    },
    vocabulary: {
      term: 'Resolution',
      meaning: 'The ability of a microscope lens to clearly distinguish two separate points that are close together.'
    },
    analogy: 'A microscope is like zooming in on a digital photograph on your phone until you can see individual pixels clearly.'
  },
  {
    keywords: ['dialysis', 'what is dialysis', 'renal replacement', 'kidney failure'],
    basicAnswer: 'Dialysis is a medical treatment that performs the life-saving functions of healthy kidneys when a patient suffers from kidney failure. It filters harmful metabolic toxins (such as urea and creatinine), balances electrolytes (like potassium and sodium), and removes extra fluid from the bloodstream. Without dialysis or a kidney transplant, toxic waste accumulates in the blood and becomes life-threatening.',
    simpleExplanation: 'When your kidneys are too sick to clean your blood, a dialysis machine acts like an external kidney. It gently cleans your blood through a special filter and returns the fresh, cleaned blood back into your body.',
    shortNotes: [
      'Primary types: Hemodialysis (blood cleaned via machine) and Peritoneal Dialysis (blood cleaned inside the abdomen).',
      'Required when kidney function drops below 10–15% (End-Stage Renal Disease).',
      'A standard hemodialysis session takes about 3 to 4 hours and is performed 3 times per week.',
      'Controls blood pressure and prevents fluid accumulation in the lungs.'
    ],
    importantQuestions: [
      '1. What is the main medical indication for initiating dialysis therapy?',
      '2. Name the two primary modalities of dialysis.',
      '3. What key waste products are removed from blood during dialysis?',
      '4. What are the common symptoms of uremia in renal failure patients?'
    ],
    mcq: {
      question: 'At what stage of kidney function loss is maintenance dialysis therapy generally required?',
      options: ['When kidneys function at 80%', 'When kidneys function at 50%', 'When kidneys drop below 10–15% function (ESRD)', 'Only when blood pressure is low'],
      answerIndex: 2,
      explanation: 'When kidney function drops below 10-15%, the body can no longer eliminate urea and fluids on its own, making dialysis necessary.'
    },
    vocabulary: {
      term: 'Uremia',
      meaning: 'A dangerous buildup of toxic waste products in the blood caused by failing kidneys.'
    },
    analogy: 'Dialysis is like draining and replacing the dirty water in a fish tank through a filtration pump so the fish can stay healthy and alive.'
  },
  {
    keywords: ['why is dialysis needed', 'why dialysis', 'need dialysis', 'kidney work'],
    basicAnswer: 'Dialysis is needed because healthy kidneys work 24 hours a day to remove excess water, mineral salts, and poisonous breakdown products from the body. When kidneys stop working due to diseases like diabetes, hypertension, or nephritis, these toxins build up in blood and damage organs. Dialysis keeps the body balanced and prevents fluid from flooding the lungs and heart.',
    simpleExplanation: 'Your body produces waste every day from eating and moving. If the kidneys cannot flush this waste out in urine, the waste acts like poison inside your body. Dialysis is needed to wash out this poison and save the patient’s life.',
    shortNotes: [
      'Removes toxic urea, uric acid, and creatinine.',
      'Prevents dangerous high potassium levels (hyperkalemia) which can stop the heart.',
      'Maintains normal acid-base balance (pH) of the blood.',
      'Eliminates excess water to relieve swelling in legs and lungs.'
    ],
    importantQuestions: [
      '1. Why can hyperkalemia be fatal in patients who miss dialysis sessions?',
      '2. Explain how kidney failure causes pulmonary edema (fluid in the lungs).',
      '3. How does dialysis assist in maintaining physiological pH?',
      '4. What role do chronic diabetes and hypertension play in kidney failure?'
    ],
    mcq: {
      question: 'Which dangerous electrolyte buildup in kidney failure can cause sudden cardiac arrest if not cleared by dialysis?',
      options: ['Vitamin C', 'Potassium (Hyperkalemia)', 'Glucose', 'Hemoglobin'],
      answerIndex: 1,
      explanation: 'Kidneys normally excrete excess potassium. In kidney failure, elevated potassium (hyperkalemia) can disrupt heart electrical signals and trigger cardiac arrest.'
    },
    vocabulary: {
      term: 'Hyperkalemia',
      meaning: 'An abnormally high level of potassium in the blood that can cause dangerous heart rhythm problems.'
    },
    analogy: 'Not doing dialysis when kidneys fail is like letting trash pile up in your house without taking it out; soon the air becomes toxic to live in.'
  },
  {
    keywords: ['dialyzer', 'function of a dialyzer', 'artificial kidney', 'hollow fiber'],
    basicAnswer: 'A dialyzer is the core filter of a hemodialysis machine, often called an "artificial kidney." It contains thousands of tiny, microscopic hollow semi-permeable fiber tubes. Blood flows inside these tiny fibers while a special cleansing fluid (dialysate) flows outside them in the opposite direction, pulling waste out of the blood across the membrane through diffusion.',
    simpleExplanation: 'A dialyzer is like a high-tech tea strainer. It lets small waste particles and extra water pass through microscopic holes into the cleaning fluid, but keeps large blood cells and proteins safely inside.',
    shortNotes: [
      'Uses counter-current flow (blood and dialysate move in opposite directions) for maximum diffusion efficiency.',
      'Semipermeable membrane prevents loss of red blood cells, white blood cells, and albumin.',
      'Waste products (urea, creatinine) move from high blood concentration to low dialysate concentration.',
      'Can be single-use or reprocessed using automated dialyzer reprocessors.'
    ],
    importantQuestions: [
      '1. Describe the basic structure of a hollow-fiber dialyzer.',
      '2. Why is counter-current flow utilized in dialyzer operation?',
      '3. What is the difference between high-flux and low-flux dialyzers?',
      '4. Why do red blood cells and albumin not pass through the dialyzer membrane?'
    ],
    mcq: {
      question: 'Why do blood and dialysate fluid flow in opposite directions (counter-current) inside a dialyzer?',
      options: ['To mix blood directly with the water', 'To maintain a concentration gradient along the entire fiber length for maximum waste removal', 'To cool the patient’s body temperature down', 'To prevent the machine from making noise'],
      answerIndex: 1,
      explanation: 'Counter-current flow ensures that blood always encounters fresher dialysate, maintaining a steep concentration gradient for diffusion from start to finish.'
    },
    vocabulary: {
      term: 'Semipermeable Membrane',
      meaning: 'A thin barrier with microscopic pores that lets tiny waste molecules pass through while blocking large blood cells.'
    },
    analogy: 'A dialyzer is like a coffee filter: it lets hot water extract the coffee flavor while keeping the coffee grounds from getting into your cup.'
  },
  {
    keywords: ['av fistula', 'arteriovenous fistula', 'dialysis access', 'bruit', 'thrill'],
    basicAnswer: 'An Arteriovenous (AV) Fistula is a surgically created connection between an artery and a vein, usually in the forearm. It is considered the gold standard vascular access for hemodialysis because it makes the vein thicker, stronger, and capable of handling high blood flow rates required for dialysis needles. Technicians check its function by feeling a vibration (thrill) and listening for a whooshing sound (bruit).',
    simpleExplanation: 'Normal veins in your arm are too small and thin for dialysis needles. A surgeon connects an artery to a vein so extra blood pumps into the vein, making it grow thick and strong like a garden hose so it can be safely used for dialysis.',
    shortNotes: [
      'Takes 6 to 12 weeks to mature before it can be used for dialysis needles.',
      'Has the lowest risk of infection and blood clotting compared to grafts or catheters.',
      'Daily check: Feel the "thrill" (buzzing sensation) and listen for the "bruit" (whooshing sound).',
      'Never take blood pressure or draw blood samples from the fistula arm.'
    ],
    importantQuestions: [
      '1. Why is an AV fistula preferred over central venous catheters for long-term dialysis?',
      '2. What is the average maturation time needed for an AV fistula before cannulation?',
      '3. How does a dialysis technician assess the patency of an AV fistula?',
      '4. List three essential precautions for a patient with an AV fistula.'
    ],
    mcq: {
      question: 'What physical sign should a dialysis technician feel with their fingertips to confirm an AV fistula is functioning properly?',
      options: ['Cold skin temperature', 'A continuous buzzing vibration called a "thrill"', 'A hard bone knot', 'Complete lack of pulse'],
      answerIndex: 1,
      explanation: 'The "thrill" is the palpable vibration caused by rapid, turbulent blood flowing from the high-pressure artery directly into the vein.'
    },
    vocabulary: {
      term: 'Thrill',
      meaning: 'A vibrating sensation you can feel with your fingers over a healthy, functioning dialysis AV fistula.'
    },
    analogy: 'An AV fistula is like widening a single-lane country road into a smooth two-lane highway so heavy delivery trucks can pass without traffic jams.'
  },
  {
    keywords: ['x-ray', 'x ray', 'radiography', 'radiation', 'x-rays produce image'],
    basicAnswer: 'X-rays produce an image by passing painless electromagnetic radiation beams through the body onto a digital detector or film. Dense tissues like bones absorb most of the X-rays and appear white on the image. Softer tissues like muscles and organs let more X-rays pass through and appear in shades of gray, while air in the lungs lets almost all X-rays pass and appears black.',
    simpleExplanation: 'X-rays work like taking a shadow picture. Bone is solid, so it blocks the light and leaves a bright white shadow. Lungs are full of air, so light passes right through, leaving a dark black shadow.',
    shortNotes: [
      'Bones = White (high density, high absorption).',
      'Soft tissue / Fluid = Gray (intermediate absorption).',
      'Air in lungs = Black (minimal absorption).',
      'Follow ALARA: keep time short, distance far, and use lead shielding.'
    ],
    importantQuestions: [
      '1. Explain why bone appears radiopaque (white) and air appears radiolucent (black) on an X-ray film.',
      '2. What are the three cardinal rules of radiation protection?',
      '3. Differentiate between primary beam radiation and scatter radiation.',
      '4. What is the role of a lead apron in radiography?'
    ],
    mcq: {
      question: 'On a standard chest X-ray radiograph, why do healthy lungs appear predominantly dark or black?',
      options: ['Lungs are filled with bone fragments', 'Lungs are filled with air which lets X-rays pass through easily', 'Lungs absorb all radiation completely', 'Lungs reflect X-rays back to the tube'],
      answerIndex: 1,
      explanation: 'Air has very low density, so X-ray beams pass through lungs without being absorbed, exposing the detector and creating a black area.'
    },
    vocabulary: {
      term: 'Radiopaque',
      meaning: 'Structures (like bone or metal) that block X-rays and show up bright white on radiographs.'
    },
    analogy: 'An X-ray is like shining a flashlight through your hand in a dark room: bone blocks the light like a stone, while soft skin lets some light glow through.'
  },
  {
    keywords: ['ecg', 'ekg', 'electrocardiogram', 'p wave', 'qrs', 't wave'],
    basicAnswer: 'An ECG (Electrocardiogram) is a non-invasive medical test that records the electrical impulses that trigger each heartbeat. As electrical waves travel through the heart, they produce specific wave patterns on graph paper: the P wave (atria contracting), the QRS complex (ventricles contracting), and the T wave (ventricles relaxing and recharging). It helps doctors detect arrhythmias, heart attacks, and heart enlargement.',
    simpleExplanation: 'Your heart beats because of natural electrical signals. An ECG is like an electrical monitor that draws wavy lines on paper to show if your heart’s electrical wires are firing in a healthy, rhythmic order.',
    shortNotes: [
      'P Wave: Atrial depolarization (atria squeeze blood into ventricles).',
      'QRS Complex: Ventricular depolarization (ventricles pump blood to lungs and body).',
      'T Wave: Ventricular repolarization (ventricles rest and recharge).',
      'Standard 12-lead ECG uses 10 electrodes placed on the chest and limbs.'
    ],
    importantQuestions: [
      '1. What physiological event is represented by the P wave on an ECG?',
      '2. What does an elevated ST segment typically indicate in clinical cardiology?',
      '3. Name the anatomical locations for the six precordial (chest) leads V1 through V6.',
      '4. How do you calculate the heart rate from an ECG strip with a regular rhythm?'
    ],
    mcq: {
      question: 'Which wave on a normal ECG tracing represents the electrical recovery and relaxation of the ventricles?',
      options: ['P Wave', 'QRS Complex', 'T Wave', 'U Wave'],
      answerIndex: 2,
      explanation: 'The T wave corresponds to ventricular repolarization, which is the relaxation and electrical recharging phase of the main pumping chambers.'
    },
    vocabulary: {
      term: 'Depolarization',
      meaning: 'The electrical discharge that triggers heart muscle cells to contract and squeeze.'
    },
    analogy: 'An ECG is like the dashboard electrical monitor of a sports car: it tells the mechanic if the spark plugs are firing at the exact right moment.'
  },
  {
    keywords: ['autoclave', 'sterilization', 'steam sterilization', 'surgical tools clean'],
    basicAnswer: 'An autoclave is a high-pressure steam vessel used in hospitals to achieve complete surgical sterilization. It heats water under pressure to produce saturated steam at 121°C (at 15 psi pressure) for 15 to 30 minutes, or 134°C for 3 to 5 minutes. The combination of intense heat, moisture, and pressure destroys all living microorganisms, including heat-resistant bacterial endospores.',
    simpleExplanation: 'An autoclave is like an ultra-powerful hospital pressure cooker. It uses boiling hot steam under high pressure to kill every single germ, bacteria, and spore on surgical instruments so they are 100% sterile for surgery.',
    shortNotes: [
      'Standard cycle parameters: 121°C at 15 pounds per square inch (psi) for 15–20 minutes.',
      'Rapid cycle: 134°C at 30 psi for 3–5 minutes for unwrapped items.',
      'Biological indicator: Geobacillus stearothermophilus spores test if the autoclave is working.',
      'Chemical indicator tape changes color (e.g., striped dark lines) when steam cycle completes.'
    ],
    importantQuestions: [
      '1. State the standard temperature, pressure, and time parameters for steam sterilization.',
      '2. Why is moist heat (autoclave) more effective than dry heat for killing bacterial spores?',
      '3. Which spore-forming bacterium is used as a biological indicator for autoclaves?',
      '4. What is the difference between sterilization and disinfection?'
    ],
    mcq: {
      question: 'What is the standard temperature and holding time for routine autoclave sterilization at 15 psi pressure?',
      options: ['100°C for 5 minutes', '121°C for 15 to 20 minutes', '180°C for 2 hours', '60°C for 1 hour'],
      answerIndex: 1,
      explanation: 'At 15 psi above atmospheric pressure, steam reaches 121°C, which penetrates wrapped surgical packs and kills all bacterial spores in 15–20 minutes.'
    },
    vocabulary: {
      term: 'Endospore',
      meaning: 'A tough, dormant protective shell formed by bacteria that survives boiling water and requires an autoclave to kill.'
    },
    analogy: 'Sterilizing with an autoclave is like putting dishes through a superheated steam chamber that leaves zero germs alive, ensuring the patient never gets an infection.'
  },
  {
    keywords: ['triage', 'hospital triage', 'emergency sorting', 'esi'],
    basicAnswer: 'Triage is a systematic medical evaluation process used in hospital emergency departments to prioritize patients based on the severity of their illness or injury, rather than the order they arrived. Highly trained triage nurses categorize patients into urgency levels (e.g., Red for life-threatening resuscitation, Yellow for urgent, Green for non-urgent). This ensures that critically sick patients receive immediate emergency intervention.',
    simpleExplanation: 'Triage is sorting patients by who needs help first to stay alive. If one person has a heart attack and another has a minor cut on their finger, triage ensures the doctor sees the heart attack patient immediately.',
    shortNotes: [
      'Triage Categories: Red (Immediate/Resuscitation), Yellow (Urgent), Green (Non-urgent), Black (Deceased).',
      'Common system: Emergency Severity Index (ESI) 1 to 5.',
      'Vital signs (pulse, BP, oxygen, respiration) must be checked immediately.',
      'Continuous re-triage is needed as a patient’s condition can worsen while waiting.'
    ],
    importantQuestions: [
      '1. What is the primary objective of emergency room triage?',
      '2. Describe the meaning of Red, Yellow, Green, and Black color codes in disaster triage.',
      '3. What are the key criteria that place a patient into ESI Level 1?',
      '4. What role does vital sign measurement play during triage assessment?'
    ],
    mcq: {
      question: 'In disaster and hospital emergency triage, which color code designates a patient requiring immediate, life-saving resuscitation?',
      options: ['Green', 'Yellow', 'Red', 'Black'],
      answerIndex: 2,
      explanation: 'Red indicates priority 1 (Immediate/Resuscitation) for life-threatening conditions like severe breathing difficulty, massive bleeding, or cardiac arrest.'
    },
    vocabulary: {
      term: 'Acuity',
      meaning: 'The level of severity or urgency of a patient’s medical illness.'
    },
    analogy: 'Triage is like airport air traffic control prioritizing a plane that is running out of fuel to land on the runway ahead of scheduled routine flights.'
  },
  {
    keywords: ['biomedical waste', 'waste segregation', 'yellow bag', 'red bag', 'bmw'],
    basicAnswer: 'Biomedical Waste (BMW) management is the safe segregation, handling, and disposal of hospital waste generated during diagnosis, treatment, and laboratory tests. Hospitals use strict color-coded bins: Yellow for infected anatomical and soiled waste (incineration), Red for recyclable contaminated plastics like IV tubing and syringes (autoclaving), White translucent for sharp needles and blades (shredding), and Blue for glassware and metal implants.',
    simpleExplanation: 'In hospitals, trash cannot be thrown into one single can. Used needles, bloody bandages, and plastic tubes are separated into different colored bins so doctors, nurses, cleaners, and the public are protected from infections.',
    shortNotes: [
      'Yellow Bag: Human anatomical waste, soiled dressings, expired medicines (disposed by incineration).',
      'Red Bag: Contaminated plastics, IV bottles, catheters, gloves (disposed by autoclaving & recycling).',
      'White Puncture-Proof Container: Scalpels, needles, broken blades (disposed by sharp pit / shredding).',
      'Blue Box/Bag: Broken ampoules, medicine vials, glassware (disposed by disinfection & recycling).'
    ],
    importantQuestions: [
      '1. What waste category must strictly be placed in the Yellow biomedical waste bin?',
      '2. Why must sharps and needles be placed in puncture-proof white containers?',
      '3. Which colored bin is designated for contaminated plastic catheters and syringes without needles?',
      '4. What are the environmental hazards of improper hospital waste disposal?'
    ],
    mcq: {
      question: 'In which color-coded container must used syringe needles, scalpels, and sharp blades be placed?',
      options: ['Yellow plastic bag', 'Red plastic bag', 'White puncture-proof, leak-proof container', 'Black general garbage bag'],
      answerIndex: 2,
      explanation: 'Sharps must always go into a puncture-proof white container to prevent needle-stick injuries and blood-borne disease transmission to hospital workers.'
    },
    vocabulary: {
      term: 'Incineration',
      meaning: 'High-temperature burning of infected hospital waste to reduce it completely to harmless ash.'
    },
    analogy: 'Color-coded hospital bins are like recycling bins at home, but much more crucial: one mistake with a sharp needle could injure someone, so every item has an exact color bin.'
  }
];

export class AIStudyService {
  /**
   * Helper to retrieve course-specific curriculum info
   */
  static getCourseInfo(courseName?: string): CourseSubjectInfo {
    if (!courseName) return COURSE_SYLLABUS_MAP['B.VOC Medical Lab Technology (MLT)'];
    
    // Direct match
    if (COURSE_SYLLABUS_MAP[courseName]) {
      return COURSE_SYLLABUS_MAP[courseName];
    }
    
    // Fuzzy match
    const lower = courseName.toLowerCase();
    for (const [key, val] of Object.entries(COURSE_SYLLABUS_MAP)) {
      if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
        return val;
      }
    }

    // Default to MLT
    return COURSE_SYLLABUS_MAP['B.VOC Medical Lab Technology (MLT)'];
  }

  /**
   * Generates a tailored AI answer using the Edge Function if available,
   * with seamless instant fallback to our rich paramedical academic knowledge engine.
   */
  static async queryStudyAssistant(params: {
    prompt: string;
    course: string;
    semester?: string;
    subject?: string;
    mode: LearningMode;
    userId?: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<{
    reply: string;
    mcq?: MCQQuestion;
    mode: LearningMode;
    isOfflineFallback?: boolean;
    configNotice?: string;
  }> {
    const { prompt, course, semester, subject, mode, userId, conversationHistory = [] } = params;
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      return {
        reply: "Please type a subject or medical question so I can explain it for you in simple words.",
        mode
      };
    }

    // 1. First attempt calling the backend Supabase Edge Function 'ai-chat'
    try {
      const response = await supabase.functions.invoke('ai-chat', {
        body: {
          prompt: cleanPrompt,
          course: course || 'Paramedical Sciences',
          semester: semester || 'Current Semester',
          subject: subject || 'General',
          mode: mode || 'ask',
          history: conversationHistory.slice(-6)
        }
      });

      if (response.data && response.data.reply && !response.error) {
        const replyText = response.data.reply;
        let mcqParsed: MCQQuestion | undefined;

        if (mode === 'mcq') {
          mcqParsed = this.extractMCQFromText(replyText);
        }

        // Save conversation if userId exists
        if (userId) {
          await db.saveAIChatMessage({
            user_id: userId,
            role: 'user',
            content: cleanPrompt
          }).catch(console.warn);

          await db.saveAIChatMessage({
            user_id: userId,
            role: 'ai',
            content: replyText
          }).catch(console.warn);
        }

        return {
          reply: replyText,
          mcq: mcqParsed,
          mode
        };
      }
    } catch (edgeErr) {
      // Edge function failed or secrets not configured; fall back gracefully to our rich Knowledge Base
      console.info('Edge function query skipped or unconfigured, utilizing Paramedical Academic Knowledge Engine:', edgeErr);
    }

    // 2. Intelligent Paramedical Knowledge Engine
    const generated = this.generateAcademicKnowledgeResponse({
      prompt: cleanPrompt,
      course,
      subject,
      mode
    });

    // Save conversation to database if user is logged in
    if (userId) {
      await db.saveAIChatMessage({
        user_id: userId,
        role: 'user',
        content: cleanPrompt
      }).catch(console.warn);

      await db.saveAIChatMessage({
        user_id: userId,
        role: 'ai',
        content: generated.reply
      }).catch(console.warn);
    }

    return generated;
  }

  /**
   * Matches question against curated concepts or formats dynamic beginner-friendly answer
   */
  private static generateAcademicKnowledgeResponse(params: {
    prompt: string;
    course: string;
    subject?: string;
    mode: LearningMode;
  }): {
    reply: string;
    mcq?: MCQQuestion;
    mode: LearningMode;
    isOfflineFallback?: boolean;
    configNotice?: string;
  } {
    const { prompt, course, subject, mode } = params;
    const lowerPrompt = prompt.toLowerCase();

    // Check curated match
    let matchedTopic: CuratedTopic | undefined = CURATED_KNOWLEDGE.find(topic => 
      topic.keywords.some(k => lowerPrompt.includes(k))
    );

    // If no direct keyword match, search by single significant words
    if (!matchedTopic) {
      const words = lowerPrompt.split(/\s+/).filter(w => w.length > 4);
      matchedTopic = CURATED_KNOWLEDGE.find(topic => 
        words.some(word => topic.keywords.some(k => k.includes(word)))
      );
    }

    if (matchedTopic) {
      switch (mode) {
        case 'explain_simply':
          return {
            reply: `Here is a super simple explanation:\n\n${matchedTopic.simpleExplanation}\n\n💡 Analogy: ${matchedTopic.analogy}`,
            mode
          };

        case 'short_notes':
          return {
            reply: `📝 Quick Revision Notes (${matchedTopic.keywords[0].toUpperCase()}):\n\n${matchedTopic.shortNotes.map((note, idx) => `${idx + 1}. ${note}`).join('\n\n')}`,
            mode
          };

        case 'important_questions':
          return {
            reply: `❓ Key Exam & Viva Practice Questions:\n\n${matchedTopic.importantQuestions.join('\n\n')}`,
            mode
          };

        case 'mcq':
          return {
            reply: `🎯 Practice Multiple Choice Question:\n\n${matchedTopic.mcq.question}\n\n[A] ${matchedTopic.mcq.options[0]}\n[B] ${matchedTopic.mcq.options[1]}\n[C] ${matchedTopic.mcq.options[2]}\n[D] ${matchedTopic.mcq.options[3]}\n\nTap an option below to test your understanding!`,
            mcq: matchedTopic.mcq,
            mode
          };

        case 'vocab':
          return {
            reply: `📖 Vocabulary Demystified: **${matchedTopic.vocabulary.term}**\n\n${matchedTopic.vocabulary.meaning}\n\n💡 Remember it like this: ${matchedTopic.analogy}`,
            mode
          };

        case 'analogy':
          return {
            reply: `💡 Real-World Analogy for ${matchedTopic.keywords[0].toUpperCase()}:\n\n${matchedTopic.analogy}\n\nIn clinical practice: ${matchedTopic.basicAnswer}`,
            mode
          };

        case 'ask':
        default:
          return {
            reply: `${matchedTopic.basicAnswer}\n\n💡 Simple Explanation:\n${matchedTopic.simpleExplanation}`,
            mode
          };
      }
    }

    // Dynamic intelligent academic answer generator for questions not explicitly in the curated list
    const courseInfo = this.getCourseInfo(course);
    const targetSubject = subject || courseInfo.subjects[0] || 'Clinical Academics';

    let formattedAnswer = "";
    let generatedMcq: MCQQuestion | undefined;

    if (mode === 'mcq') {
      generatedMcq = {
        question: `In ${course}, which protocol is most critical when performing clinical duties related to: "${prompt}"?`,
        options: [
          'Follow strict aseptic technique and verified standard operating procedures (SOP)',
          'Skip documentation if the procedure is brief',
          'Use uncalibrated instruments to save time',
          'Avoid wearing personal protective equipment (PPE)'
        ],
        answerIndex: 0,
        explanation: 'In all healthcare and paramedical disciplines, patient safety and reliable diagnostic results depend on following documented Standard Operating Procedures (SOPs) and sterile hygiene.'
      };

      formattedAnswer = `🎯 Paramedical Practice Question for ${targetSubject}:\n\n${generatedMcq.question}\n\n[A] ${generatedMcq.options[0]}\n[B] ${generatedMcq.options[1]}\n[C] ${generatedMcq.options[2]}\n[D] ${generatedMcq.options[3]}\n\nSelect your answer below to verify!`;
    } else if (mode === 'explain_simply') {
      formattedAnswer = `Here is a beginner-friendly explanation of "${prompt}" in ${targetSubject}:\n\n1. At its basic level, this concept is about keeping patients safe and getting accurate diagnostic measurements.\n2. You break the task into clear steps: preparing your equipment, verifying patient identity, following exact lab/clinical rules, and recording measurements immediately.\n3. Think of it like cooking a recipe: if you follow each measurement in order, your results are reliable and safe every single time.`;
    } else if (mode === 'short_notes') {
      formattedAnswer = `📝 Quick Revision Notes on "${prompt}":\n\n• Core Definition: Fundamental principle within ${targetSubject} at Adithyan College.\n• Key Standard: Always cross-check reference ranges and follow standard biosafety precautions.\n• Practical Rule: Verify patient calibration and equipment sterility prior to running the test or procedure.\n• Clinical Goal: Minimize diagnostic error and support prompt patient care.`;
    } else if (mode === 'important_questions') {
      formattedAnswer = `❓ Essential Viva & Exam Questions for "${prompt}":\n\n1. Define the basic principle of this concept in 2-3 simple sentences.\n2. What are the standard reference values or safety precautions associated with this topic?\n3. List three common errors that can occur during this procedure and how to avoid them.\n4. How does understanding this topic directly impact patient diagnosis and recovery?`;
    } else if (mode === 'vocab') {
      formattedAnswer = `📖 Medical Term Explanation:\n\n**${prompt}**\n\nIn simple words: A standard clinical term used in ${targetSubject} describing a biological process, diagnostic test, or hospital procedure.\n\n💡 Study Tip: Connect this term to its everyday purpose in patient care so you remember it easily for examinations.`;
    } else {
      // General 'ask' answer
      formattedAnswer = `Regarding "${prompt}" in ${targetSubject} (${course}):\n\n` +
        `This is a foundational concept in your paramedical syllabus. It focuses on executing clinical procedures with accuracy, maintaining sterility, and understanding the diagnostic indicators for patient health.\n\n` +
        `To master this topic step-by-step:\n` +
        `1. Identify the normal baseline or reference range.\n` +
        `2. Understand the physiological mechanism or equipment function.\n` +
        `3. Follow standard hospital biosafety and documentation protocols.`;
    }

    return {
      reply: formattedAnswer,
      mcq: generatedMcq,
      mode,
      isOfflineFallback: true
    };
  }

  /**
   * Helper to parse MCQ options from raw LLM output if model generates it
   */
  private static extractMCQFromText(text: string): MCQQuestion | undefined {
    try {
      const optionA = text.match(/\[A\]\s*(.+?)(?=\n|\[B\])/i)?.[1]?.trim();
      const optionB = text.match(/\[B\]\s*(.+?)(?=\n|\[C\])/i)?.[1]?.trim();
      const optionC = text.match(/\[C\]\s*(.+?)(?=\n|\[D\])/i)?.[1]?.trim();
      const optionD = text.match(/\[D\]\s*(.+?)(?=\n|Correct|Answer|$)/i)?.[1]?.trim();

      if (optionA && optionB && optionC && optionD) {
        let answerIndex = 0;
        if (/Correct.*B/i.test(text)) answerIndex = 1;
        else if (/Correct.*C/i.test(text)) answerIndex = 2;
        else if (/Correct.*D/i.test(text)) answerIndex = 3;

        const explanation = text.match(/Explanation:\s*(.+)/i)?.[1]?.trim() || 
          "Review the foundational principles of this subject for a detailed breakdown.";

        const question = text.split(/\[A\]/i)[0].replace(/🎯.*?\n/g, '').trim();

        return {
          question: question || "Select the most accurate statement:",
          options: [optionA, optionB, optionC, optionD],
          answerIndex,
          explanation
        };
      }
    } catch {
      // Ignore parsing errors
    }
    return undefined;
  }
}
