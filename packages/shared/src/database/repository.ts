import { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdmin } from '../supabase/client';
import type { Database } from '../supabase/types';

export class BaseRepository<T extends { id: string }> {
  protected supabase: SupabaseClient<Database>;
  protected table: string;

  constructor(table: string) {
    this.supabase = createSupabaseAdmin();
    this.table = table;
  }

  async findOne(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select()
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as T;
  }

  async findMany(filter: Partial<T> = {}): Promise<T[]> {
    let query = this.supabase.from(this.table).select();

    // Apply filters
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;

    if (error) throw error;
    return data as T[];
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
    const { data: created, error } = await this.supabase
      .from(this.table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created as T;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const { data: updated, error } = await this.supabase
      .from(this.table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated as T;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async transaction<R>(
    callback: (supabase: SupabaseClient<Database>) => Promise<R>
  ): Promise<R> {
    return callback(this.supabase);
  }
}
