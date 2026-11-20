export interface CollegeCourse {
  id: string;
  code: string;
  name: string;
  durationYears: number;
  type: 'Degree' | 'Diploma';
  department: string;
  tuitionFee: number;
  description: string;
}

export const OFFICIAL_COURSES: CollegeCourse[] = [
  {
    id: 'bvoc-mlt',
    code: 'BVOC-MLT',
    name: 'B.VOC Medical Lab Technology (MLT)',
    durationYears: 3,
    type: 'Degree',
    department: 'B.VOC Medical Lab Technology (MLT)',
    tuitionFee: 65000,
    description: '3-Year Bachelor of Vocation in Medical Laboratory Technology'
  },
  {
    id: 'bvoc-dt',
    code: 'BVOC-DT',
    name: 'B.VOC Dialysis Technology',
    durationYears: 3,
    type: 'Degree',
    department: 'B.VOC Dialysis Technology',
    tuitionFee: 70000,
    description: '3-Year Bachelor of Vocation in Renal Replacement and Dialysis Technology'
  },
  {
    id: 'bvoc-rmit',
    code: 'BVOC-RMIT',
    name: 'B.VOC Radiology & Medical Imaging Technology',
    durationYears: 3,
    type: 'Degree',
    department: 'B.VOC Radiology & Medical Imaging Technology',
    tuitionFee: 75000,
    description: '3-Year Bachelor of Vocation in Medical Imaging and Radiography'
  },
  {
    id: 'bvoc-cct',
    code: 'BVOC-CCT',
    name: 'B.VOC Cardiac Care Technology',
    durationYears: 3,
    type: 'Degree',
    department: 'B.VOC Cardiac Care Technology',
    tuitionFee: 80000,
    description: '3-Year Bachelor of Vocation in Cardiovascular Technology'
  },
  {
    id: 'bvoc-ott',
    code: 'BVOC-OTT',
    name: 'B.VOC Operation Theatre Technology',
    durationYears: 3,
    type: 'Degree',
    department: 'B.VOC Operation Theatre Technology',
    tuitionFee: 70000,
    description: '3-Year Bachelor of Vocation in Surgical and Operation Theatre Technology'
  },
  {
    id: 'bvoc-ha3',
    code: 'BVOC-HA3',
    name: 'B.VOC Hospital Administration (3 Years)',
    durationYears: 3,
    type: 'Degree',
    department: 'B.VOC Hospital Administration (3 Years)',
    tuitionFee: 60000,
    description: '3-Year Bachelor of Vocation in Healthcare & Hospital Administration'
  },
  {
    id: 'dip-lscm',
    code: 'DIP-LSCM',
    name: 'Logistics & Supply Chain Management (1 Year)',
    durationYears: 1,
    type: 'Diploma',
    department: 'Logistics & Supply Chain Management (1 Year)',
    tuitionFee: 45000,
    description: '1-Year Professional Diploma in Logistics & Global Supply Chain Management'
  },
  {
    id: 'dip-hm',
    code: 'DIP-HM',
    name: 'Hospitality Management (1 Year)',
    durationYears: 1,
    type: 'Diploma',
    department: 'Hospitality Management (1 Year)',
    tuitionFee: 45000,
    description: '1-Year Diploma in International Hospitality & Hotel Operations'
  },
  {
    id: 'dip-ha1',
    code: 'DIP-HA1',
    name: 'Hospital Administration (1 Year)',
    durationYears: 1,
    type: 'Diploma',
    department: 'Hospital Administration (1 Year)',
    tuitionFee: 45000,
    description: '1-Year Executive Diploma in Healthcare & Clinic Administration'
  }
];

export const OFFICIAL_COURSE_NAMES: string[] = OFFICIAL_COURSES.map(c => c.name);

/**
 * Returns the duration in years for a given course name.
 * 3-Year B.VOC courses -> 3 years
 * 1-Year Diploma courses -> 1 year
 */
export function getCourseDurationYears(courseName?: string): number {
  if (!courseName) return 3;
  const normalized = courseName.trim().toLowerCase();
  const matched = OFFICIAL_COURSES.find(c => 
    c.name.toLowerCase() === normalized ||
    normalized.includes(c.name.toLowerCase()) ||
    c.name.toLowerCase().includes(normalized)
  );
  if (matched) return matched.durationYears;
  if (normalized.includes('1 year') || normalized.includes('diploma')) return 1;
  return 3;
}

/**
 * Returns total semesters for a course:
 * 3-Year courses -> 6 semesters
 * 1-Year courses -> 2 semesters
 */
export function getCourseTotalSemesters(courseName?: string): number {
  return getCourseDurationYears(courseName) * 2;
}

/**
 * Returns an array of semester names dynamically according to course duration.
 * E.g., ['Semester 1', 'Semester 2', ..., 'Semester 6'] for 3-Year B.VOC,
 * or ['Semester 1', 'Semester 2'] for 1-Year Diploma.
 */
export function getCourseSemesters(courseName?: string): string[] {
  const total = getCourseTotalSemesters(courseName);
  return Array.from({ length: total }, (_, i) => `Semester ${i + 1}`);
}

/**
 * Dynamically retrieves courses from collegeDataService (backed by remote Supabase courses table)
 */
export async function getCollegeCourses(collegeId?: string): Promise<CollegeCourse[]> {
  try {
    const { collegeDataService } = await import('@/services/collegeDataService');
    const list = await collegeDataService.getCourses(collegeId);
    return list.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      durationYears: c.duration_years || 3,
      type: c.type === 'Diploma' ? 'Diploma' : 'Degree',
      department: c.department || c.name,
      tuitionFee: c.tuition_fee || 60000,
      description: c.description || ''
    }));
  } catch {
    return [...OFFICIAL_COURSES];
  }
}


