import { OFFICIAL_COURSES, CollegeCourse } from '@/constants/courses';

export type AcademicYearStr = 'Year 1' | 'Year 2' | 'Year 3';
export type AcademicSemesterStr = 
  | 'Semester 1' 
  | 'Semester 2' 
  | 'Semester 3' 
  | 'Semester 4' 
  | 'Semester 5' 
  | 'Semester 6';

export interface AcademicClassOption {
  id: string; // e.g. "bvoc-mlt-y1-sem-1"
  courseId: string; // "bvoc-mlt"
  courseName: string; // "B.VOC Medical Lab Technology (MLT)"
  courseCode: string; // "BVOC-MLT"
  durationYears: number;
  year: AcademicYearStr;
  yearNumber: 1 | 2 | 3;
  semester: AcademicSemesterStr;
  semesterNumber: 1 | 2 | 3 | 4 | 5 | 6;
  displayName: string; // "B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)"
  shortName: string; // "BVOC-MLT - Sem 1"
}

export interface CourseClassesGroup {
  course: CollegeCourse;
  totalYears: number;
  classes: AcademicClassOption[];
  years: {
    year: AcademicYearStr;
    yearNumber: 1 | 2 | 3;
    semesters: AcademicClassOption[];
  }[];
}

/**
 * Generates all official academic classes for all 9 courses across valid years and semesters.
 * - 3-Year B.VOC courses have Year 1 (Sem 1 & 2), Year 2 (Sem 3 & 4), Year 3 (Sem 5 & 6)
 * - 1-Year Diploma courses have Year 1 (Sem 1 & 2)
 * Replaces old "Section A/B" with exact semester mapping.
 */
export function getAllAcademicClasses(): AcademicClassOption[] {
  const classes: AcademicClassOption[] = [];

  for (const course of OFFICIAL_COURSES) {
    const yearsCount = course.durationYears; // 3 for B.VOC, 1 for Diploma

    for (let yr = 1; yr <= yearsCount; yr++) {
      const yearStr = `Year ${yr}` as AcademicYearStr;
      const yearNum = yr as 1 | 2 | 3;

      // Two semesters per year
      const sem1Num = (yr * 2 - 1) as 1 | 3 | 5;
      const sem2Num = (yr * 2) as 2 | 4 | 6;

      const semNums = [sem1Num, sem2Num] as const;

      for (const sem of semNums) {
        const semStr = `Semester ${sem}` as AcademicSemesterStr;
        const id = `${course.id}-y${yr}-sem-${sem}`;
        const displayName = `${course.name} - ${yearStr} (${semStr})`;
        const shortName = `${course.code} - Sem ${sem}`;

        classes.push({
          id,
          courseId: course.id,
          courseName: course.name,
          courseCode: course.code,
          durationYears: course.durationYears,
          year: yearStr,
          yearNumber: yearNum,
          semester: semStr,
          semesterNumber: sem,
          displayName,
          shortName,
        });
      }
    }
  }

  return classes;
}

/**
 * Groups all available academic classes by Course, then by Academic Year and its valid Semesters.
 */
export function getClassesGroupedByCourse(): CourseClassesGroup[] {
  const allClasses = getAllAcademicClasses();
  const groups: CourseClassesGroup[] = [];

  for (const course of OFFICIAL_COURSES) {
    const courseClasses = allClasses.filter(c => c.courseId === course.id);
    const yearsList: CourseClassesGroup['years'] = [];

    for (let yr = 1; yr <= course.durationYears; yr++) {
      const yearStr = `Year ${yr}` as AcademicYearStr;
      const yearNum = yr as 1 | 2 | 3;
      const semesters = courseClasses.filter(c => c.yearNumber === yr);

      yearsList.push({
        year: yearStr,
        yearNumber: yearNum,
        semesters,
      });
    }

    groups.push({
      course,
      totalYears: course.durationYears,
      classes: courseClasses,
      years: yearsList,
    });
  }

  return groups;
}

/**
 * Normalizes class strings for loose matching against database records.
 */
export function normalizeClassName(className?: string): string {
  if (!className) return '';
  return className
    .toLowerCase()
    .replace(/[()[\]-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether a student record belongs to a specific academic class/semester.
 * Matches student's course/department AND semester/year.
 */
export function matchesStudentClass(
  classOption: AcademicClassOption | string,
  student: {
    department?: string;
    class_name?: string;
    course?: string;
    semester?: string | number;
    year?: string | number;
    current_semester?: string | number;
    academic_year?: string;
    preferences?: any;
  }
): boolean {
  if (!student) return false;

  const targetOption = typeof classOption === 'string' 
    ? getAllAcademicClasses().find(c => 
        c.displayName === classOption || 
        c.id === classOption || 
        c.shortName === classOption ||
        normalizeClassName(c.displayName) === normalizeClassName(classOption)
      )
    : classOption;

  const prefs = student.preferences || {};
  const studentClass = student.class_name || prefs.class_name || '';
  const studentDept = student.department || student.course || prefs.department || prefs.course || '';
  const studentSem = (student.semester ?? student.current_semester ?? prefs.semester ?? prefs.current_semester ?? '').toString();
  const studentYear = (student.year ?? prefs.year ?? '').toString();

  // If exact string match with class display name or ID
  if (typeof classOption === 'string') {
    if (studentClass === classOption) return true;
  }
  if (targetOption) {
    if (studentClass === targetOption.displayName || studentClass === targetOption.id || studentClass === targetOption.shortName) {
      return true;
    }
  }

  if (targetOption) {
    const normStudentDept = normalizeClassName(studentDept);
    const normStudentClass = normalizeClassName(studentClass);
    const normCourseName = normalizeClassName(targetOption.courseName);
    const normCourseCode = normalizeClassName(targetOption.courseCode);

    // 1. Verify Course / Department Match
    const isCourseMatch = 
      normStudentDept.includes(normCourseCode) ||
      normStudentDept.includes(normCourseName) ||
      normCourseName.includes(normStudentDept) ||
      normStudentClass.includes(normCourseCode) ||
      normStudentClass.includes(normCourseName) ||
      normCourseName.includes(normStudentClass);

    if (!isCourseMatch) {
      return false;
    }

    // 2. Resolve Student Semester and Year
    const normClass = normalizeClassName(studentClass);
    const normSem = normalizeClassName(studentSem);
    const normYr = normalizeClassName(studentYear);

    // Extract semester number from student data if available
    let extractedSemNum: number | null = null;
    if (normSem) {
      const match = normSem.match(/(?:sem(?:ester)?\s*)?(\d)/i);
      if (match) extractedSemNum = parseInt(match[1], 10);
    } else {
      const matchInClass = normClass.match(/sem(?:ester)?\s*(\d)/i);
      if (matchInClass) extractedSemNum = parseInt(matchInClass[1], 10);
    }

    // Extract year number from student data if available
    let extractedYrNum: number | null = null;
    if (normYr) {
      const match = normYr.match(/(?:year\s*)?(\d)/i);
      if (match) extractedYrNum = parseInt(match[1], 10);
    } else {
      const matchInClass = normClass.match(/(?:year|yr)\s*(\d)/i);
      if (matchInClass) extractedYrNum = parseInt(matchInClass[1], 10);
    }

    // 3. Matching logic
    if (extractedSemNum !== null) {
      return extractedSemNum === targetOption.semesterNumber;
    }

    if (extractedYrNum !== null) {
      // If student has year but no semester, match odd semester of that year (standard active intake)
      return extractedYrNum === targetOption.yearNumber && targetOption.semesterNumber === (extractedYrNum * 2 - 1);
    }

    // 4. If student has NO semester and NO year specified at all:
    // A fresh admission defaults to Year 1, Semester 1 of that course
    return targetOption.yearNumber === 1 && targetOption.semesterNumber === 1;
  }

  // Fallback if targetOption could not be resolved in catalog
  const targetStr = typeof classOption === 'string' ? classOption : classOption.displayName;
  return studentClass === targetStr;
}

/**
 * Formats a list of assigned classes into a clean, human-readable summary.
 */
export function formatAssignedClassesSummary(assignedClasses: string[]): string {
  if (!assignedClasses || assignedClasses.length === 0) return 'No Classes Assigned';
  if (assignedClasses.length === 1) return assignedClasses[0];
  return `${assignedClasses.length} Semesters Assigned: ${assignedClasses.slice(0, 2).join(', ')}${assignedClasses.length > 2 ? ` (+${assignedClasses.length - 2} more)` : ''}`;
}
