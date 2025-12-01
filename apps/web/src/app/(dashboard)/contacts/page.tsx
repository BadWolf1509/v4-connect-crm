'use client';

import { ImportModal } from '@/components/contacts/import-modal';
import { MergeModal } from '@/components/contacts/merge-modal';
import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import {
  Download,
  GitMerge,
  Loader2,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  tags: string[];
  createdAt: string;
}

interface ContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
}

export default function ContactsPage() {
  const { api, isAuthenticated } = useApi();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tags: [] as string[],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tagInput, setTagInput] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);

  // Get unique tags from all contacts
  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags || [])));

  const fetchContacts = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (searchQuery) params.search = searchQuery;
      if (selectedTag) params.tag = selectedTag;

      const data = await api.get<ContactsResponse>('/contacts', { params });
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [api, isAuthenticated, page, searchQuery, selectedTag]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Debounced search - reset page when search changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentional debounce pattern
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleOpenModal = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name,
        email: contact.email || '',
        phone: contact.phone || '',
        tags: contact.tags || [],
      });
    } else {
      setEditingContact(null);
      setFormData({ name: '', email: '', phone: '', tags: [] });
    }
    setFormError(null);
    setTagInput('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingContact(null);
    setFormData({ name: '', email: '', phone: '', tags: [] });
    setFormError(null);
    setTagInput('');
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tagToRemove) });
  };

  // Export contacts to CSV
  const handleExportContacts = useCallback(() => {
    if (contacts.length === 0) {
      toast.error('Nenhum contato para exportar');
      return;
    }

    const headers = ['Nome', 'Email', 'Telefone', 'Tags', 'Data de Criação'];
    const rows = contacts.map((c) => [
      c.name,
      c.email || '',
      c.phone || '',
      (c.tags || []).join(';'),
      new Date(c.createdAt).toLocaleDateString('pt-BR'),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contatos-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Contatos exportados com sucesso');
  }, [contacts]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setFormError('Nome e obrigatorio');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (editingContact) {
        await api.patch(`/contacts/${editingContact.id}`, formData);
      } else {
        await api.post('/contacts', formData);
      }
      handleCloseModal();
      fetchContacts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar contato');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;

    try {
      await api.delete(`/contacts/${contactId}`);
      fetchContacts();
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
    setMenuOpen(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Contatos</h2>
          <p className="text-sm text-gray-400">
            {total} contato{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import */}
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <Upload className="h-4 w-4" />
            Importar
          </button>
          {/* Merge Duplicates */}
          <button
            type="button"
            onClick={() => setShowMergeModal(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <GitMerge className="h-4 w-4" />
            Duplicados
          </button>
          {/* Export */}
          <button
            type="button"
            onClick={handleExportContacts}
            disabled={contacts.length === 0}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
          {/* New Contact */}
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-v4-red-600"
          >
            <UserPlus className="h-4 w-4" />
            Novo Contato
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, email ou telefone..."
            className="w-full rounded-lg border border-gray-800 bg-gray-900 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
          />
        </div>

        {/* Tags filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition',
                !selectedTag
                  ? 'bg-v4-red-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white',
              )}
            >
              Todos
            </button>
            {allTags.slice(0, 5).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition',
                  selectedTag === tag
                    ? 'bg-v4-red-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white',
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-12 text-center">
          <User className="mx-auto h-12 w-12 text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-white">
            {searchQuery || selectedTag ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            {searchQuery || selectedTag
              ? 'Tente ajustar os filtros de busca'
              : 'Adicione seu primeiro contato para comecar'}
          </p>
          {!searchQuery && !selectedTag && (
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-v4-red-600"
            >
              <Plus className="h-4 w-4" />
              Adicionar Contato
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900/50">
          <table className="w-full">
            <thead className="border-b border-gray-800 bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Contato
                </th>
                <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 md:table-cell">
                  Email
                </th>
                <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 lg:table-cell">
                  Telefone
                </th>
                <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 xl:table-cell">
                  Tags
                </th>
                <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 xl:table-cell">
                  Criado em
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-800/50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700">
                        {contact.avatarUrl ? (
                          <img
                            src={contact.avatarUrl}
                            alt={contact.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-white">
                            {getInitials(contact.name)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">{contact.name}</p>
                        <p className="text-sm text-gray-400 md:hidden">
                          {contact.email || contact.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-6 py-4 md:table-cell">
                    {contact.email ? (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Mail className="h-4 w-4 text-gray-500" />
                        {contact.email}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap px-6 py-4 lg:table-cell">
                    {contact.phone ? (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Phone className="h-4 w-4 text-gray-500" />
                        {contact.phone}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap px-6 py-4 xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(contact.tags || []).slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                      {(contact.tags || []).length > 3 && (
                        <span className="text-xs text-gray-500">+{contact.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-6 py-4 text-sm text-gray-400 xl:table-cell">
                    {formatDate(contact.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMenuOpen(menuOpen === contact.id ? null : contact.id)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuOpen === contact.id && (
                        <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-gray-800 bg-gray-900 py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenModal(contact);
                              setMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                          >
                            <User className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(contact.id)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Mostrando {(page - 1) * 20 + 1} a {Math.min(page * 20, total)} de {total} contatos
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-800 px-3 py-1 text-sm text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= total}
              className="rounded-lg border border-gray-800 px-3 py-1 text-sm text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proximo
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingContact ? 'Editar Contato' : 'Novo Contato'}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-300">
                  Nome *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do contato"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-300">
                  Telefone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+55 11 99999-9999"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="tags" className="mb-2 block text-sm font-medium text-gray-300">
                  Tags
                </label>
                <div className="space-y-2">
                  {/* Tags display */}
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-300"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 text-gray-500 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Tag input */}
                  <div className="flex gap-2">
                    <input
                      id="tags"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Digite uma tag e pressione Enter"
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      disabled={!tagInput.trim()}
                      className="rounded-lg border border-gray-700 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Tag suggestions */}
                  {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-gray-500 mr-1">Sugestões:</span>
                      {allTags
                        .filter((tag) => !formData.tags.includes(tag))
                        .slice(0, 5)
                        .map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, tags: [...formData.tags, tag] })
                            }
                            className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-700 hover:text-white"
                          >
                            {tag}
                          </button>
                        ))}
                    </div>
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
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-v4-red-500 py-2 font-medium text-white transition-colors hover:bg-v4-red-600 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  ) : editingContact ? (
                    'Salvar'
                  ) : (
                    'Criar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal open={showImportModal} onClose={() => setShowImportModal(false)} />

      {/* Merge Modal */}
      <MergeModal open={showMergeModal} onClose={() => setShowMergeModal(false)} />
    </div>
  );
}
