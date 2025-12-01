'use client';

import { useApi } from '@/hooks/use-api';
import type { Contact, Deal, Stage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineId: string;
  stages: Stage[];
  deal?: Deal | null;
  defaultStageId?: string | null;
}

interface ContactsResponse {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Deal form with multiple fields
export function DealModal({
  isOpen,
  onClose,
  pipelineId,
  stages,
  deal,
  defaultStageId,
}: DealModalProps) {
  const { api } = useApi();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(deal?.title || '');
  const [value, setValue] = useState(deal?.value?.toString() || '');
  const [stageId, setStageId] = useState(deal?.stage?.id || defaultStageId || stages[0]?.id || '');
  const [contactId, setContactId] = useState(deal?.contact?.id || '');
  const [contactSearch, setContactSearch] = useState('');
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [notes, setNotes] = useState(deal?.notes || '');
  const [probability, setProbability] = useState(deal?.probability?.toString() || '50');
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    deal?.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().split('T')[0] : '',
  );

  const { data: contactsData } = useQuery({
    queryKey: ['contacts', contactSearch],
    queryFn: () =>
      api.get<ContactsResponse>('/contacts', {
        params: { search: contactSearch, limit: 10 },
      }),
    enabled: showContactSearch && contactSearch.length > 0,
  });

  const contacts = contactsData?.contacts || [];

  const createDeal = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/deals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      onClose();
    },
  });

  const updateDeal = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/deals/${deal?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      onClose();
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const data = {
        title,
        value: value ? Number.parseFloat(value) : null,
        stageId,
        contactId: contactId || null,
        pipelineId,
        notes: notes || null,
        probability: probability ? Number.parseInt(probability) : 50,
        expectedCloseDate: expectedCloseDate || null,
      };

      if (deal) {
        updateDeal.mutate(data);
      } else {
        createDeal.mutate(data);
      }
    },
    [
      title,
      value,
      stageId,
      contactId,
      pipelineId,
      notes,
      probability,
      expectedCloseDate,
      deal,
      createDeal,
      updateDeal,
    ],
  );

  const selectContact = useCallback((contact: Contact) => {
    setContactId(contact.id);
    setContactSearch(contact.name);
    setShowContactSearch(false);
  }, []);

  const isSubmitting = createDeal.isPending || updateDeal.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Backdrop click to close modal */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <h2 className="text-lg font-semibold text-white">{deal ? 'Editar Deal' : 'Novo Deal'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
              Titulo *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Nome do negocio"
              className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
            />
          </div>

          {/* Value */}
          <div>
            <label htmlFor="value" className="block text-sm font-medium text-gray-300 mb-1">
              Valor
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
              <input
                id="value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-gray-800 bg-gray-950 pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Stage */}
          <div>
            <label htmlFor="stage" className="block text-sm font-medium text-gray-300 mb-1">
              Etapa
            </label>
            <select
              id="stage"
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2 text-sm text-white focus:border-v4-red-500 focus:outline-none"
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          {/* Contact */}
          <div className="relative">
            <label htmlFor="contact" className="block text-sm font-medium text-gray-300 mb-1">
              Contato
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                id="contact"
                type="text"
                value={contactSearch}
                onChange={(e) => {
                  setContactSearch(e.target.value);
                  setShowContactSearch(true);
                }}
                onFocus={() => setShowContactSearch(true)}
                placeholder="Buscar contato..."
                className="w-full rounded-lg border border-gray-800 bg-gray-950 pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
              />
            </div>

            {/* Contact Search Results */}
            {showContactSearch && contacts.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-800 bg-gray-950 shadow-lg z-10">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => selectContact(contact)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-800"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {contact.name[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{contact.name}</p>
                      <p className="text-xs text-gray-400">{contact.phone || contact.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Probability */}
          <div>
            <label htmlFor="probability" className="block text-sm font-medium text-gray-300 mb-1">
              Probabilidade: {probability}%
            </label>
            <input
              id="probability"
              type="range"
              value={probability}
              onChange={(e) => setProbability(e.target.value)}
              min="0"
              max="100"
              step="5"
              className="w-full accent-v4-red-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Expected Close Date */}
          <div>
            <label htmlFor="closeDate" className="block text-sm font-medium text-gray-300 mb-1">
              Previsao de fechamento
            </label>
            <input
              id="closeDate"
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2 text-sm text-white focus:border-v4-red-500 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">
              Notas
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observacoes sobre o negocio..."
              rows={3}
              className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title || isSubmitting}
              className={cn(
                'flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600 disabled:opacity-50',
              )}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {deal ? 'Salvar' : 'Criar Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
