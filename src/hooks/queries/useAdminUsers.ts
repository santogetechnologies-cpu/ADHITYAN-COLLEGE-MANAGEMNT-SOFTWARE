import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUserService, CreateUserData, UpdateUserData, AdminManagedUser } from '@/services/adminUserService';
import { queryKeys } from './queryKeys';

export function useAdminUsers(roleFilter?: string, searchTerm?: string) {
  return useQuery<AdminManagedUser[], Error>({
    queryKey: ['admin-users', { roleFilter, searchTerm }],
    queryFn: () => adminUserService.listUsers(roleFilter, searchTerm),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation<AdminManagedUser, Error, CreateUserData>({
    mutationFn: (userData) => adminUserService.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { userId: string; updates: UpdateUserData }>({
    mutationFn: ({ userId, updates }) => adminUserService.updateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { userId: string; active: boolean }>({
    mutationFn: ({ userId, active }) => adminUserService.setUserActiveStatus(userId, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (userId) => adminUserService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
    },
  });
}

