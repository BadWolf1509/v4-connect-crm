'use client';

import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';

interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  content?: string;
  scheduledAt?: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
  channel?: {
    id: string;
    name: string;
    type: string;
  };
}

interface Channel {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface Contact {
  id: string;
  name: string;
  phone?: string;
}

interface CampaignsResponse {
  campaigns: Campaign[];
  total: number;
}

const statusConfig: Record<CampaignStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Rascunho', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
  scheduled: { label: 'Agendada', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  running: { label: 'Enviando', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  paused: { label: 'Pausada', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  completed: { label: 'Concluída', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  cancelled: { label: 'Cancelada', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

export default function CampaignsPage() {
  const { api, isAuthenticated } = useApi();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    channelId: '',
    content: '',
    scheduledAt: '',
    contactIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Data for form
  const [channels, setChannels] = useState<Channel[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  const fetchCampaigns = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;

      const data = await api.get<CampaignsResponse>('/campaigns', { params });
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }, [api, isAuthenticated, statusFilter]);

  const fetchChannels = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingChannels(true);
    try {
      const data = await api.get<{ data: Channel[] }>('/channels');
      setChannels((data.data || []).filter((c) => c.isActive));
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  }, [api, isAuthenticated]);

  const fetchContacts = useCallback(
    async (search?: string) => {
      if (!isAuthenticated) return;
      setLoadingContacts(true);
      try {
        const params: Record<string, string | number> = { limit: 50 };
        if (search) params.search = search;
        const data = await api.get<{ contacts: Contact[] }>('/contacts', { params });
        setContacts(data.contacts || []);
      } catch (err) {
        console.error('Failed to fetch contacts:', err);
      } finally {
        setLoadingContacts(false);
      }
    },
    [api, isAuthenticated],
  );

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleOpenModal = () => {
    setFormData({
      name: '',
      channelId: '',
      content: '',
      scheduledAt: '',
      contactIds: [],
    });
    setFormError(null);
    setContactSearch('');
    fetchChannels();
    fetchContacts();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleCreateCampaign = async () => {
    if (!formData.name.trim()) {
      setFormError('Nome é obrigatório');
      return;
    }
    if (!formData.channelId) {
      setFormError('Selecione um canal');
      return;
    }
    if (!formData.content.trim()) {
      setFormError('Conteúdo é obrigatório');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        channelId: formData.channelId,
        content: formData.content.trim(),
        scheduledAt: formData.scheduledAt || undefined,
        contactIds: formData.contactIds,
      };

      await api.post('/campaigns', payload);
      toast.success('Campanha criada com sucesso');
      handleCloseModal();
      fetchCampaigns();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar campanha');
    } finally {
      setSaving(false);
    }
  };

  const handleStartCampaign = async (campaignId: string) => {
    try {
      await api.post(`/campaigns/${campaignId}/start`, {});
      toast.success('Campanha iniciada');
      fetchCampaigns();
    } catch (err) {
      toast.error('Erro ao iniciar campanha');
      console.error('Start error:', err);
    }
    setMenuOpen(null);
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await api.post(`/campaigns/${campaignId}/pause`, {});
      toast.success('Campanha pausada');
      fetchCampaigns();
    } catch (err) {
      toast.error('Erro ao pausar campanha');
      console.error('Pause error:', err);
    }
    setMenuOpen(null);
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;

    try {
      await api.delete(`/campaigns/${campaignId}`);
      toast.success('Campanha excluída');
      fetchCampaigns();
    } catch (err) {
      toast.error('Erro ao excluir campanha');
      console.error('Delete error:', err);
    }
    setMenuOpen(null);
  };

  const toggleContactSelection = (contactId: string) => {
    setFormData((prev) => ({
      ...prev,
      contactIds: prev.contactIds.includes(contactId)
        ? prev.contactIds.filter((id) => id !== contactId)
        : [...prev.contactIds, contactId],
    }));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredCampaigns =
    statusFilter === 'all' ? campaigns : campaigns.filter((c) => c.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white">Campanhas</h1>
          <p className="text-sm text-gray-400">Crie e gerencie campanhas de mensagens em massa</p>
        </div>
        <button
          type="button"
          onClick={handleOpenModal}
          className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-v4-red-600"
        >
          <Plus className="h-4 w-4" />
          Nova Campanha
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'draft', 'scheduled', 'running', 'completed'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              statusFilter === status
                ? 'bg-v4-red-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white',
            )}
          >
            {status === 'all' ? 'Todas' : statusConfig[status].label}
          </button>
        ))}
      </div>

      {/* Campaigns List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-12 text-center">
          <Send className="mx-auto h-12 w-12 text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-white">Nenhuma campanha</h3>
          <p className="mt-2 text-sm text-gray-400">
            Crie sua primeira campanha para enviar mensagens em massa
          </p>
          <button
            type="button"
            onClick={handleOpenModal}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-v4-red-600"
          >
            <Plus className="h-4 w-4" />
            Criar Campanha
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="relative rounded-lg border border-gray-800 bg-gray-900/50 p-4"
            >
              {/* Menu */}
              <div className="absolute right-2 top-2">
                <button
                  type="button"
                  onClick={() => setMenuOpen(menuOpen === campaign.id ? null : campaign.id)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen === campaign.id && (
                  <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-gray-800 bg-gray-900 py-1 shadow-lg">
                    {campaign.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleStartCampaign(campaign.id)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                      >
                        <Play className="h-4 w-4" />
                        Iniciar
                      </button>
                    )}
                    {campaign.status === 'running' && (
                      <button
                        type="button"
                        onClick={() => handlePauseCampaign(campaign.id)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                      >
                        <Pause className="h-4 w-4" />
                        Pausar
                      </button>
                    )}
                    {campaign.status === 'paused' && (
                      <button
                        type="button"
                        onClick={() => handleStartCampaign(campaign.id)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                      >
                        <Play className="h-4 w-4" />
                        Continuar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="pr-8">
                <h3 className="font-medium text-white">{campaign.name}</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {campaign.channel?.name || 'Sem canal'}
                </p>
              </div>

              {/* Status */}
              <div className="mt-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    statusConfig[campaign.status].bgColor,
                    statusConfig[campaign.status].color,
                  )}
                >
                  {campaign.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                  {campaign.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
                  {campaign.status === 'scheduled' && <Clock className="h-3 w-3" />}
                  {statusConfig[campaign.status].label}
                </span>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold text-white">{campaign.sentCount}</p>
                  <p className="text-xs text-gray-500">Enviados</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-green-400">{campaign.deliveredCount}</p>
                  <p className="text-xs text-gray-500">Entregues</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-blue-400">{campaign.readCount}</p>
                  <p className="text-xs text-gray-500">Lidos</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-red-400">{campaign.failedCount}</p>
                  <p className="text-xs text-gray-500">Falhas</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(campaign.createdAt)}
                </span>
                {campaign.scheduledAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Agendada: {formatDate(campaign.scheduledAt)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-gray-800 bg-gray-900 p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Nova Campanha</h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label
                  htmlFor="campaign-name"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Nome da Campanha *
                </label>
                <input
                  id="campaign-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Promoção de Natal"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                />
              </div>

              {/* Channel */}
              <div>
                <label
                  htmlFor="campaign-channel"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Canal *
                </label>
                {loadingChannels ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando canais...
                  </div>
                ) : (
                  <select
                    id="campaign-channel"
                    value={formData.channelId}
                    onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-v4-red-500 focus:outline-none"
                  >
                    <option value="">Selecione um canal</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name} ({channel.type})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Content */}
              <div>
                <label
                  htmlFor="campaign-content"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Mensagem *
                </label>
                <textarea
                  id="campaign-content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Digite o conteúdo da mensagem..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none resize-none"
                />
              </div>

              {/* Schedule */}
              <div>
                <label
                  htmlFor="campaign-schedule"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Agendar envio (opcional)
                </label>
                <input
                  id="campaign-schedule"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-v4-red-500 focus:outline-none"
                />
              </div>

              {/* Contacts */}
              <div>
                <label
                  htmlFor="contact-search"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Destinatários ({formData.contactIds.length} selecionados)
                </label>
                <input
                  id="contact-search"
                  type="text"
                  value={contactSearch}
                  onChange={(e) => {
                    setContactSearch(e.target.value);
                    fetchContacts(e.target.value);
                  }}
                  placeholder="Buscar contatos..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none mb-2"
                />
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800">
                  {loadingContacts ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  ) : contacts.length === 0 ? (
                    <p className="p-4 text-sm text-gray-400 text-center">
                      Nenhum contato encontrado
                    </p>
                  ) : (
                    contacts.map((contact) => (
                      <label
                        key={contact.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.contactIds.includes(contact.id)}
                          onChange={() => toggleContactSelection(contact.id)}
                          className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-v4-red-500 focus:ring-v4-red-500"
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700">
                            <Users className="h-4 w-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-white">{contact.name}</p>
                            {contact.phone && (
                              <p className="text-xs text-gray-400">{contact.phone}</p>
                            )}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {formError && <p className="text-sm text-red-400">{formError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-lg border border-gray-700 py-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateCampaign}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-v4-red-500 py-2 font-medium text-white transition-colors hover:bg-v4-red-600 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Criar Campanha'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
