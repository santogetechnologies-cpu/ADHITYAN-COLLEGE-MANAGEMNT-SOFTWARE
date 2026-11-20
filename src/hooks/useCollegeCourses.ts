import { useState, useEffect, useCallback } from 'react';
import { Course } from '@/types/database.types';
import { CollegeCourse, OFFICIAL_COURSES } from '@/constants/courses';
import { collegeDataService, DataChangeEventPayload } from '@/services/collegeDataService';

export function useCollegeCourses(collegeId?: string) {
  const [courses, setCourses] = useState<Course[]>(() => {
    // Initial sync from OFFICIAL_COURSES so SSR / instant first-paint has data
    return OFFICIAL_COURSES.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      duration_years: c.durationYears,
      type: c.type,
      department: c.department,
      tuition_fee: c.tuitionFee,
      description: c.description,
      eligibility: '10+2 with Science / Relevant Stream',
      status: 'active'
    }));
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCourses = useCallback(async (force = false) => {
    try {
      setLoading(true);
      const data = await collegeDataService.getCourses(collegeId, force);
      setCourses([...data]);
    } catch (err) {
      console.warn('useCollegeCourses fetch warning:', err);
    } finally {
      setLoading(false);
    }
  }, [collegeId]);

  useEffect(() => {
    fetchCourses();

    const handleDataChange = (event: Event) => {
      const customEvent = event as CustomEvent<DataChangeEventPayload>;
      if (customEvent.detail && customEvent.detail.entity === 'courses') {
        fetchCourses(true);
      }
    };

    window.addEventListener('college_data_updated', handleDataChange);
    return () => {
      window.removeEventListener('college_data_updated', handleDataChange);
    };
  }, [fetchCourses]);

  // Compatibility CollegeCourse format
  const collegeCourses: CollegeCourse[] = courses.map(c => ({
    id: c.id,
    code: c.code,
    name: c.name,
    durationYears: c.duration_years || 3,
    type: c.type === 'Diploma' ? 'Diploma' : 'Degree',
    department: c.department || c.name,
    tuitionFee: c.tuition_fee || 60000,
    description: c.description || ''
  }));

  return {
    courses,
    collegeCourses,
    loading,
    refresh: () => fetchCourses(true),
    createCourse: (newCourse: Omit<Course, 'id' | 'created_at' | 'updated_at'>) => 
      collegeDataService.createCourse(newCourse, collegeId),
    updateCourse: (id: string, updates: Partial<Course>) => 
      collegeDataService.updateCourse(id, updates, collegeId),
    deleteCourse: (id: string) => 
      collegeDataService.deleteCourse(id, collegeId)
  };
}
