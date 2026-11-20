# Standard ERP Feature Pattern (30-Line Blueprint)

Every future module follows this 3-tier architecture:

```ts
// 1. DOMAIN SERVICE (src/services/exampleService.ts)
export const exampleService = {
  async list() {
    const { data, error } = await supabase.from('items').select('*').order('created_at');
    if (error) throw handleSupabaseError(error);
    return data;
  },
  async create(input: CreateInput) {
    const { data, error } = await supabase.from('items').insert(input).select().single();
    if (error) throw handleSupabaseError(error);
    return data;
  }
};

// 2. QUERY & MUTATION HOOKS (src/hooks/queries/useExample.ts)
export function useItems() {
  return useQuery({ queryKey: ['items'], queryFn: exampleService.list });
}
export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: exampleService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

// 3. UI INTEGRATION (src/components/.../ExampleComponent.tsx)
export function ExampleList() {
  const { data = [], isLoading, isError, error, refetch } = useItems();
  const createMut = useCreateItem();
  const form = useZodForm(itemSchema);

  return (
    <DataState isLoading={isLoading} isError={isError} error={error} isEmpty={data.length === 0} onRetry={refetch}>
      {data.map(item => <ItemCard key={item.id} item={item} />)}
      <ConfirmDeleteDialog open={!!toDelete} onConfirm={() => delMut.mutate(toDelete.id)} />
    </DataState>
  );
}
```

---

## Pattern Key Elements
1. **Never Call Supabase in Components**: All queries and mutations live in `src/services/` and throw `handleSupabaseError`.
2. **TanStack Cache Management**: Every mutation invalidates its respective queryKey domain.
3. **Always Wrap with `<DataState>`**: Handles loading skeleton, RLS error with retry, and empty state uniformly.
4. **Zod Validation**: Forms use `useZodForm(schema)` with client-side validation before hitting the database.
5. **Mutation Feedback**: Use `createMutationToast({ successTitle, errorTitle })` to catch RLS policy blocks.

