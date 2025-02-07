import type { Database } from '@types/database';
import type { MessageWithRelations } from '@types/models';
import type { PaginationParams, SortOptions, DateRange } from '@types/common';

export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];

export type MessageType = 'text' | 'document' | 'location' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface MessageFilters {
  conversation_id?: string;
  sender_id?: string;
  receiver_id?: string;
  type?: MessageType[];
  status?: MessageStatus[];
  created_at?: DateRange;
}

export type MessageSortOptions = SortOptions<Message>;

export interface MessageSearchParams extends MessageFilters, PaginationParams {
  sort?: MessageSortOptions;
}

export interface Conversation {
  id: string;
  participants: string[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationFilters {
  participant_id?: string;
  has_unread?: boolean;
  updated_after?: string;
}

export type ConversationSortOptions = SortOptions<Conversation>;

export interface ConversationSearchParams extends ConversationFilters, PaginationParams {
  sort?: ConversationSortOptions;
}

export { MessageWithRelations };
