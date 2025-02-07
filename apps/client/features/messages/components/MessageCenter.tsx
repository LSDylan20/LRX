import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { Send, Paperclip, Search } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { format } from 'date-fns';

type Message = Database['public']['Tables']['messages']['Row'];
type User = Database['public']['Tables']['users']['Row'];

interface Contact {
  id: string;
  company_name: string;
  unread_count: number;
  last_message?: Message;
}

export default function MessageCenter() {
  const user = useAuthStore((state) => state.user);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (user) {
      fetchContacts();
      const subscription = subscribeToMessages();
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
    }
  }, [selectedContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const subscribeToMessages = () => {
    return supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${user?.id}`,
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
        updateContactWithNewMessage(newMessage);
      })
      .subscribe();
  };

  const fetchContacts = async () => {
    try {
      const { data: contactsData, error: contactsError } = await supabase
        .from('users')
        .select('id, company_name')
        .neq('id', user?.id);

      if (contactsError) throw contactsError;

      const contactsWithMessages = await Promise.all(
        contactsData.map(async (contact) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact' })
            .eq('recipient_id', user?.id)
            .eq('sender_id', contact.id)
            .eq('read', false);

          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${contact.id},recipient_id.eq.${contact.id}`)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            id: contact.id,
            company_name: contact.company_name,
            unread_count: count || 0,
            last_message: lastMessage?.[0],
          };
        })
      );

      setContacts(contactsWithMessages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},recipient_id.eq.${contactId}),and(sender_id.eq.${contactId},recipient_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('recipient_id', user?.id)
        .eq('sender_id', contactId);

      // Update unread count for the contact
      setContacts(prev =>
        prev.map(c =>
          c.id === contactId ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          recipient_id: selectedContact.id,
          message_text: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTyping = () => {
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateContactWithNewMessage = (message: Message) => {
    const contactId = message.sender_id === user?.id ? message.recipient_id : message.sender_id;
    setContacts(prev =>
      prev.map(c =>
        c.id === contactId
          ? { ...c, unread_count: c.unread_count + 1, last_message: message }
          : c
      )
    );
  };

  const filteredContacts = contacts.filter(contact =>
    contact.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please sign in to access messages.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md h-[calc(100vh-12rem)]">
      <div className="grid grid-cols-12 h-full">
        {/* Contacts List */}
        <div className="col-span-4 border-r">
          <div className="p-4 border-b">
            <div className="relative">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>
          <div className="overflow-y-auto h-[calc(100%-4rem)]">
            {loading ? (
              <div className="p-4 text-center">
                <p className="text-gray-600">Loading contacts...</p>
              </div>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{contact.company_name}</h3>
                      {contact.last_message && (
                        <p className="text-sm text-gray-600 truncate">
                          {contact.last_message.message_text}
                        </p>
                      )}
                    </div>
                    {contact.unread_count > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                        {contact.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center">
                <p className="text-gray-600">No contacts found</p>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="col-span-8 flex flex-col h-full">
          {selectedContact ? (
            <>
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{selectedContact.company_name}</h3>
                  {isTyping && (
                    <span className="text-sm text-gray-500">Typing...</span>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === user.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender_id === user.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100'
                      }`}
                    >
                      <p>{message.message_text}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {format(new Date(message.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t">
                <form onSubmit={sendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-500">Select a contact to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}