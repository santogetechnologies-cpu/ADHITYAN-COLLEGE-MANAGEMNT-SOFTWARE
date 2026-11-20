import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from './api/errors';
import { storageService } from './storageService';

export interface LibraryBookItem {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category?: string;
  copies_available: number;
  total_copies: number;
  shelf_location?: string;
  created_at?: string;
}

export interface BookIssueItem {
  id: string;
  book_id: string;
  book_title?: string;
  student_id: string;
  student_name?: string;
  issue_date: string;
  due_date: string;
  return_date?: string | null;
  fine_amount?: number;
  status: 'issued' | 'returned' | 'overdue';
}

export interface DigitalResourceItem {
  id: string;
  title: string;
  resource_type: string;
  resource_url: string;
  description?: string;
  uploaded_by?: string;
  created_at?: string;
}

export const libraryService = {
  async listBooks(search?: string): Promise<LibraryBookItem[]> {
    try {
      let query = supabase
        .from('library_books')
        .select('*')
        .order('title', { ascending: true });

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`title.ilike.${term},author.ilike.${term},isbn.ilike.${term}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch library books');
    }
  },

  async createBook(input: Omit<LibraryBookItem, 'id' | 'created_at'>): Promise<LibraryBookItem> {
    try {
      const { data, error } = await supabase
        .from('library_books')
        .insert({
          title: input.title.trim(),
          author: input.author.trim(),
          isbn: input.isbn.trim(),
          category: input.category || 'General',
          copies_available: input.copies_available ?? input.total_copies ?? 1,
          total_copies: input.total_copies ?? 1,
          shelf_location: input.shelf_location || 'Main Stacks',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to add book to library catalog');
    }
  },

  async issueBook(bookId: string, studentId: string, dueDate: string): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('issue_library_book', {
        p_book_id: bookId,
        p_student_id: studentId,
        p_due_date: dueDate,
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'Failed to issue book');
      }
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to issue book');
    }
  },

  async returnBook(issueId: string, fineAmount: number = 0): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('return_library_book', {
        p_issue_id: issueId,
        p_fine_amount: fineAmount,
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'Failed to return book');
      }
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to process book return');
    }
  },

  async listIssues(statusFilter?: string): Promise<BookIssueItem[]> {
    try {
      let query = supabase
        .from('book_issues')
        .select('*')
        .order('issue_date', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: issues, error } = await query;
      if (error) throw error;

      // Join books and students
      const { data: books } = await supabase.from('library_books').select('id, title');
      const { data: students } = await supabase.from('profiles').select('id, name');

      const bookMap = new Map((books || []).map(b => [b.id, b.title]));
      const studentMap = new Map((students || []).map(s => [s.id, s.name]));

      return (issues || []).map((i: any) => ({
        id: i.id,
        book_id: i.book_id,
        book_title: bookMap.get(i.book_id) || 'Library Volume',
        student_id: i.student_id,
        student_name: studentMap.get(i.student_id) || 'Student Patron',
        issue_date: i.issue_date,
        due_date: i.due_date,
        return_date: i.return_date,
        fine_amount: i.fine_amount || 0,
        status: i.status as any,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch book issue records');
    }
  },

  async listDigitalResources(): Promise<DigitalResourceItem[]> {
    try {
      const { data, error } = await supabase
        .from('digital_library_resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        resource_type: r.resource_type || 'PDF',
        resource_url: r.resource_url,
        description: r.description,
        uploaded_by: r.uploaded_by,
        created_at: r.created_at,
      }));
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to load digital resources');
    }
  },

  async uploadDigitalResource(title: string, file: File, description?: string): Promise<DigitalResourceItem> {
    try {
      const uploadRes = await storageService.uploadFile('documents', file, 'library');

      const { data, error } = await supabase
        .from('digital_library_resources')
        .insert({
          title: title.trim(),
          resource_type: file.type.split('/')[1]?.toUpperCase() || 'DOCUMENT',
          resource_url: uploadRes.publicUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to upload digital library resource');
    }
  },
};

export default libraryService;

