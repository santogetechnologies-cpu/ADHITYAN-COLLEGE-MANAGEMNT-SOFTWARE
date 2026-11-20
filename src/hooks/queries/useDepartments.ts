import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
  departmentService,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  DepartmentWithSections,
} from '@/services/departmentService';
import type { Department, Profile } from '@/types/database';

export function useDepartments(search?: string) {
  return useQuery<DepartmentWithSections[], Error>({
    queryKey: queryKeys.departments.list(search),
    queryFn: () => departmentService.listDepartments(search),
  });
}

export function useDepartment(id: string) {
  return useQuery<DepartmentWithSections, Error>({
    queryKey: queryKeys.departments.detail(id),
    queryFn: () => departmentService.getDepartment(id),
    enabled: Boolean(id),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation<DepartmentWithSections, Error, CreateDepartmentInput>({
    mutationFn: (input) => departmentService.createDepartment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation<Department, Error, { id: string; input: UpdateDepartmentInput }>({
    mutationFn: ({ id, input }) => departmentService.updateDepartment(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.detail(variables.id) });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => departmentService.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
    },
  });
}

export function useTeachers() {
  return useQuery<Profile[], Error>({
    queryKey: queryKeys.teachers.all,
    queryFn: () => departmentService.listTeachers(),
  });
}

