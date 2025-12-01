'use client';

import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { Loader2, Search, User, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Agent {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  status?: 'online' | 'away' | 'offline';
}

interface Team {
  id: string;
  name: string;
  memberCount: number;
}

interface TransferModalProps {
  conversationId: string;
  onClose: () => void;
  onTransferred: () => void;
}

export function TransferModal({ conversationId, onClose, onTransferred }: TransferModalProps) {
  const { api } = useApi();
  const [activeTab, setActiveTab] = useState<'agents' | 'teams'>('agents');
  const [search, setSearch] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch agents and teams in parallel
        const [agentsRes, teamsRes] = await Promise.all([
          api.get<{ users: Agent[] }>('/users'),
          api.get<{ teams: Team[] }>('/teams'),
        ]);
        setAgents(agentsRes.users || []);
        setTeams(teamsRes.teams || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api]);

  const handleTransfer = async () => {
    if (!selectedId) return;

    setTransferring(true);
    try {
      if (activeTab === 'agents') {
        await api.patch(`/conversations/${conversationId}/assign`, {
          assigneeId: selectedId,
        });
      } else {
        await api.post(`/conversations/${conversationId}/transfer`, {
          teamId: selectedId,
        });
      }
      onTransferred();
      onClose();
    } catch (error) {
      console.error('Error transferring conversation:', error);
    } finally {
      setTransferring(false);
    }
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.email.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(search.toLowerCase()),
  );

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
          <h2 className="text-lg font-medium text-white">Transferir Conversa</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab('agents')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition',
              activeTab === 'agents'
                ? 'text-v4-red-500 border-b-2 border-v4-red-500'
                : 'text-gray-400 hover:text-white',
            )}
          >
            <User className="h-4 w-4" />
            Atendentes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition',
              activeTab === 'teams'
                ? 'text-v4-red-500 border-b-2 border-v4-red-500'
                : 'text-gray-400 hover:text-white',
            )}
          >
            <Users className="h-4 w-4" />
            Equipes
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar ${activeTab === 'agents' ? 'atendente' : 'equipe'}...`}
              className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-h-64 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : activeTab === 'agents' ? (
            filteredAgents.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <User className="h-8 w-8 mx-auto mb-2" />
                <p>Nenhum atendente encontrado</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredAgents.map((agent) => (
                  <button
                    type="button"
                    key={agent.id}
                    onClick={() => setSelectedId(agent.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg p-3 text-left transition',
                      selectedId === agent.id
                        ? 'bg-v4-red-500/20 border border-v4-red-500'
                        : 'hover:bg-gray-800',
                    )}
                  >
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                        {agent.avatarUrl ? (
                          <img
                            src={agent.avatarUrl}
                            alt={agent.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="font-medium text-white">
                            {agent.name[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-gray-900',
                          agent.status === 'online'
                            ? 'bg-green-500'
                            : agent.status === 'away'
                              ? 'bg-yellow-500'
                              : 'bg-gray-500',
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{agent.name}</p>
                      <p className="text-sm text-gray-400 truncate">{agent.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : filteredTeams.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhuma equipe encontrada</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTeams.map((team) => (
                <button
                  type="button"
                  key={team.id}
                  onClick={() => setSelectedId(team.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg p-3 text-left transition',
                    selectedId === team.id
                      ? 'bg-v4-red-500/20 border border-v4-red-500'
                      : 'hover:bg-gray-800',
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{team.name}</p>
                    <p className="text-sm text-gray-400">{team.memberCount} membros</p>
                  </div>
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
          <button
            type="button"
            onClick={handleTransfer}
            disabled={!selectedId || transferring}
            className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {transferring && <Loader2 className="h-4 w-4 animate-spin" />}
            Transferir
          </button>
        </div>
      </div>
    </div>
  );
}
