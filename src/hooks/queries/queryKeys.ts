export const queryKeys = {
  departments: {
    all: ['departments'] as const,
    lists: () => [...queryKeys.departments.all, 'list'] as const,
    list: (search?: string) => [...queryKeys.departments.lists(), { search }] as const,
    details: () => [...queryKeys.departments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.departments.details(), id] as const,
  },
  sections: {
    all: ['sections'] as const,
    byDepartment: (deptId: string) => [...queryKeys.sections.all, 'department', deptId] as const,
  },
  teachers: {
    all: ['teachers'] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    byRole: (role: string) => [...queryKeys.profiles.all, 'role', role] as const,
  },
  courses: {
    all: ['courses'] as const,
  },
};

