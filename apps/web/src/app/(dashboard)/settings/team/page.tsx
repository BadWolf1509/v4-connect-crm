'use client';

import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Copy,
  Crown,
  Loader2,
  Mail,
  MoreVertical,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'agent';
  isActive: boolean;
  lastSeenAt?: string;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface Invite {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'agent';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
  invitedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

const roleLabels: Record<string, string> = {
  owner: 'Proprietario',
  admin: 'Administrador',
  agent: 'Agente',
};

const roleIcons: Record<string, typeof User> = {
  owner: Crown,
  admin: Shield,
  agent: User,
};

const roleColors: Record<string, string> = {
  owner: 'text-yellow-500 bg-yellow-500/10',
  admin: 'text-blue-500 bg-blue-500/10',
  agent: 'text-gray-400 bg-gray-500/10',
};

export default function TeamSettingsPage() {
  const { api, isAuthenticated } = useApi();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [inviteMenuOpen, setInviteMenuOpen] = useState<string | null>(null);

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<{ users: TeamMember[] }>('/users'),
    enabled: isAuthenticated,
  });

  // Fetch teams
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get<{ teams: Team[] }>('/teams'),
    enabled: isAuthenticated,
  });

  // Fetch invites
  const { data: invitesData, isLoading: invitesLoading } = useQuery({
    queryKey: ['invites'],
    queryFn: () => api.get<{ invites: Invite[] }>('/invites'),
    enabled: isAuthenticated,
  });

  const users = usersData?.users || [];
  const teams = teamsData?.teams || [];
  const invites = invitesData?.invites || [];
  const pendingInvites = invites.filter((i) => i.status === 'pending');

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: (data: { email: string; role: 'admin' | 'agent' }) =>
      api.post<{ invite: Invite; inviteUrl: string }>('/invites', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast.success('Convite enviado com sucesso');
      // Copy invite URL to clipboard
      navigator.clipboard.writeText(data.inviteUrl);
      toast.info('Link do convite copiado para a área de transferência');
      setShowInviteModal(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao enviar convite');
    },
  });

  // Resend invite mutation
  const resendInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      api.post<{ invite: Invite; inviteUrl: string }>(`/invites/${inviteId}/resend`, {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast.success('Convite reenviado');
      navigator.clipboard.writeText(data.inviteUrl);
      toast.info('Novo link copiado para a área de transferência');
    },
    onError: () => {
      toast.error('Erro ao reenviar convite');
    },
  });

  // Revoke invite mutation
  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: string) => api.delete(`/invites/${inviteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast.success('Convite revogado');
    },
    onError: () => {
      toast.error('Erro ao revogar convite');
    },
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => api.post('/teams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Equipe criada com sucesso');
      setShowTeamModal(false);
    },
    onError: () => {
      toast.error('Erro ao criar equipe');
    },
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: (teamId: string) => api.delete(`/teams/${teamId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Equipe excluida');
    },
    onError: () => {
      toast.error('Erro ao excluir equipe');
    },
  });

  const handleCreateInvite = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const role = formData.get('role') as 'admin' | 'agent';

      if (!email.trim()) {
        toast.error('Email é obrigatório');
        return;
      }

      createInviteMutation.mutate({ email, role });
    },
    [createInviteMutation],
  );

  const handleCreateTeam = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;

      if (!name.trim()) {
        toast.error('Nome da equipe é obrigatório');
        return;
      }

      createTeamMutation.mutate({ name, description });
    },
    [createTeamMutation],
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastSeen = (date?: string) => {
    if (!date) return 'Nunca';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 5) return 'Online';
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  if (usersLoading || teamsLoading || invitesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-v4-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-white">Equipe</h1>
        <p className="mt-1 text-sm text-gray-400">
          Gerencie os membros da sua equipe e suas permissões
        </p>
      </div>

      {/* Members Section */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-white">Membros ({users.length})</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-v4-red-600"
          >
            <UserPlus className="h-4 w-4" />
            Convidar
          </button>
        </div>

        <div className="divide-y divide-gray-800">
          {users.map((user) => {
            const RoleIcon = roleIcons[user.role] || User;
            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 hover:bg-gray-800/50"
              >
                <div className="flex items-center gap-4">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-white">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{user.name}</span>
                      {!user.isActive && (
                        <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-500">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">{user.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                      roleColors[user.role],
                    )}
                  >
                    <RoleIcon className="h-3.5 w-3.5" />
                    {roleLabels[user.role]}
                  </div>

                  <div className="text-right">
                    <div
                      className={cn(
                        'text-xs',
                        formatLastSeen(user.lastSeenAt) === 'Online'
                          ? 'text-green-500'
                          : 'text-gray-500',
                      )}
                    >
                      {formatLastSeen(user.lastSeenAt)}
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {menuOpen === user.id && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            toast.info('Funcionalidade em desenvolvimento');
                            setMenuOpen(null);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                        >
                          <Shield className="h-4 w-4" />
                          Alterar permissão
                        </button>
                        {user.role !== 'owner' && (
                          <button
                            type="button"
                            onClick={() => {
                              toast.info('Funcionalidade em desenvolvimento');
                              setMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                          >
                            <UserMinus className="h-4 w-4" />
                            Remover membro
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {users.length === 0 && (
            <div className="p-8 text-center text-gray-400">Nenhum membro encontrado</div>
          )}
        </div>
      </div>

      {/* Pending Invites Section */}
      {pendingInvites.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50">
          <div className="flex items-center justify-between border-b border-gray-800 p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-white">
                Convites Pendentes ({pendingInvites.length})
              </h2>
            </div>
          </div>

          <div className="divide-y divide-gray-800">
            {pendingInvites.map((invite) => {
              const expired = isExpired(invite.expiresAt);
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{invite.email}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>Convidado por {invite.invitedBy?.name || 'Sistema'}</span>
                        <span>•</span>
                        <span>{formatDate(invite.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                        roleColors[invite.role],
                      )}
                    >
                      {roleLabels[invite.role]}
                    </div>

                    {expired ? (
                      <div className="flex items-center gap-1 text-xs text-red-400">
                        <Clock className="h-3.5 w-3.5" />
                        Expirado
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        Expira em {formatDate(invite.expiresAt)}
                      </div>
                    )}

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setInviteMenuOpen(inviteMenuOpen === invite.id ? null : invite.id)
                        }
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {inviteMenuOpen === invite.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl">
                          <button
                            type="button"
                            onClick={() => {
                              resendInviteMutation.mutate(invite.id);
                              setInviteMenuOpen(null);
                            }}
                            disabled={resendInviteMutation.isPending}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Reenviar convite
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // We don't have the token here, but we can construct a placeholder
                              toast.info('Use o botão Reenviar para obter um novo link');
                              setInviteMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                          >
                            <Copy className="h-4 w-4" />
                            Copiar link
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Deseja revogar este convite?')) {
                                revokeInviteMutation.mutate(invite.id);
                              }
                              setInviteMenuOpen(null);
                            }}
                            disabled={revokeInviteMutation.isPending}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Revogar convite
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Teams Section */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-white">Times ({teams.length})</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedTeam(null);
              setShowTeamModal(true);
            }}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Criar Time
          </button>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-white">{team.name}</h3>
                  {team.description && (
                    <p className="mt-1 text-sm text-gray-400">{team.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Deseja excluir este time?')) {
                      deleteTeamMutation.mutate(team.id);
                    }
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <Users className="h-3.5 w-3.5" />
                <span>0 membros</span>
              </div>
            </div>
          ))}

          {teams.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-400">
              Nenhum time criado ainda
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Convidar Membro</h2>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvite} className="mt-6 space-y-4">
              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  name="email"
                  required
                  placeholder="email@exemplo.com"
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium text-gray-300">
                  Permissão
                </label>
                <select
                  id="invite-role"
                  name="role"
                  defaultValue="agent"
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-v4-red-500 focus:outline-none"
                >
                  <option value="agent">Agente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <p className="text-xs text-gray-400">
                Um link de convite será gerado e copiado para sua área de transferência. O convite
                expira em 7 dias.
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createInviteMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600 disabled:opacity-50"
                >
                  {createInviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Criar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {selectedTeam ? 'Editar Time' : 'Criar Time'}
              </h2>
              <button
                type="button"
                onClick={() => setShowTeamModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="mt-6 space-y-4">
              <div>
                <label htmlFor="team-name" className="block text-sm font-medium text-gray-300">
                  Nome do Time
                </label>
                <input
                  id="team-name"
                  type="text"
                  name="name"
                  required
                  defaultValue={selectedTeam?.name}
                  placeholder="Ex: Suporte, Vendas..."
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="team-description"
                  className="block text-sm font-medium text-gray-300"
                >
                  Descrição (opcional)
                </label>
                <textarea
                  id="team-description"
                  name="description"
                  rows={3}
                  defaultValue={selectedTeam?.description}
                  placeholder="Descreva o propósito deste time..."
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createTeamMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600 disabled:opacity-50"
                >
                  {createTeamMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {selectedTeam ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
