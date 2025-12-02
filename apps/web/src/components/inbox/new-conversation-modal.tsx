'use client';

import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { Loader2, MessageSquare, Phone, Search, User, Wifi, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'whatsapp' | 'instagram' | 'messenger' | 'email';
  isActive: boolean;
  phoneNumber?: string;
}

interface NewConversationModalProps {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

const channelColors: Record<string, string> = {
  whatsapp: 'bg-green-500',
  instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
  messenger: 'bg-blue-500',
  email: 'bg-gray-500',
};

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  email: 'Email',
};

export function NewConversationModal({ onClose, onCreated }: NewConversationModalProps) {
  const { api } = useApi();
  const [step, setStep] = useState<'contact' | 'channel'>('contact');
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [contactsRes, channelsRes] = await Promise.all([
          api.get<{ contacts: Contact[] }>('/contacts'),
          api.get<{ data: Channel[] }>('/channels'),
        ]);
        setContacts(contactsRes.contacts || []);
        setChannels((channelsRes.data || []).filter((ch) => ch.isActive));
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api]);

  const handleCreateConversation = async () => {
    if (!selectedContact || !selectedChannel) return;

    setCreating(true);
    try {
      const response = await api.post<{ conversation: { id: string }; created: boolean }>(
        '/conversations',
        {
          contactId: selectedContact.id,
          channelId: selectedChannel.id,
        },
      );

      if (response.created) {
        toast.success('Conversa criada com sucesso');
      } else {
        toast.info('Conversa existente aberta');
      }

      onCreated(response.conversation.id);
      onClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Erro ao criar conversa');
    } finally {
      setCreating(false);
    }
  };

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      contact.phone?.includes(search) ||
      contact.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setSearch('');
    setStep('channel');
  };

  const handleBack = () => {
    setStep('contact');
    setSelectedChannel(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Fechar modal"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl bg-gray-900 border border-gray-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            {step === 'channel' && (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-4 w-4 rotate-45" />
              </button>
            )}
            <h2 className="text-lg font-medium text-white">
              {step === 'contact' ? 'Nova Conversa' : 'Selecionar Canal'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selected Contact Preview */}
        {selectedContact && step === 'channel' && (
          <div className="flex items-center gap-3 border-b border-gray-800 bg-gray-800/50 p-4">
            <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
              {selectedContact.avatarUrl ? (
                <img
                  src={selectedContact.avatarUrl}
                  alt={selectedContact.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="font-medium text-white">
                  {selectedContact.name[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{selectedContact.name}</p>
              <p className="text-sm text-gray-400 truncate">
                {selectedContact.phone || selectedContact.email}
              </p>
            </div>
          </div>
        )}

        {/* Search (only for contacts) */}
        {step === 'contact' && (
          <div className="p-4 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar contato por nome, telefone ou email..."
                className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-h-80 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : step === 'contact' ? (
            filteredContacts.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <User className="h-8 w-8 mx-auto mb-2" />
                <p>Nenhum contato encontrado</p>
                <p className="text-xs mt-1">Cadastre um contato primeiro</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredContacts.map((contact) => (
                  <button
                    type="button"
                    key={contact.id}
                    onClick={() => handleContactSelect(contact)}
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-gray-800"
                  >
                    <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                      {contact.avatarUrl ? (
                        <img
                          src={contact.avatarUrl}
                          alt={contact.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="font-medium text-white">
                          {contact.name[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{contact.name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : channels.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Wifi className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhum canal conectado</p>
              <p className="text-xs mt-1">Conecte um canal em Configurações</p>
            </div>
          ) : (
            <div className="space-y-1">
              {channels.map((channel) => (
                <button
                  type="button"
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg p-3 text-left transition',
                    selectedChannel?.id === channel.id
                      ? 'bg-v4-red-500/20 border border-v4-red-500'
                      : 'hover:bg-gray-800',
                  )}
                >
                  <div
                    className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center',
                      channelColors[channel.type],
                    )}
                  >
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{channel.name}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>{channelLabels[channel.type]}</span>
                      {channel.phoneNumber && <span>• {channel.phoneNumber}</span>}
                    </div>
                  </div>
                  {channel.isActive && (
                    <div className="h-2 w-2 rounded-full bg-green-500" title="Conectado" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-800 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition"
          >
            Cancelar
          </button>
          {step === 'channel' && (
            <button
              type="button"
              onClick={handleCreateConversation}
              disabled={!selectedChannel || creating}
              className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Iniciar Conversa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
