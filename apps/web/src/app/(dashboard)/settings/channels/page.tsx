'use client';

import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Instagram,
  Loader2,
  MessageCircle,
  MoreVertical,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Channel {
  id: string;
  name: string;
  type: 'whatsapp' | 'instagram' | 'messenger' | 'email';
  provider: string;
  phoneNumber?: string;
  isActive: boolean;
  connectedAt?: string;
  config?: {
    instanceName?: string;
  };
}

interface QRCodeData {
  base64?: string;
  code?: string;
  pairingCode?: string;
}

type ConnectionState = 'idle' | 'creating' | 'qrcode' | 'connecting' | 'connected' | 'error';

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      const data = await apiClient.get<{ data: Channel[] }>('/channels');
      setChannels(data.data || []);
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Poll for connection state when showing QR code
  useEffect(() => {
    if (connectionState !== 'qrcode' || !currentChannelId) return;

    const interval = setInterval(async () => {
      try {
        const response = await apiClient.get<{ state: string; isActive: boolean }>(
          `/whatsapp/instances/${currentChannelId}/state`,
        );

        if (response.state === 'open' || response.isActive) {
          setConnectionState('connected');
          fetchChannels();
          setTimeout(() => {
            setShowModal(false);
            resetModal();
          }, 2000);
        }
      } catch (err) {
        console.error('Failed to check state:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [connectionState, currentChannelId, fetchChannels]);

  const resetModal = () => {
    setConnectionState('idle');
    setQrCode(null);
    setNewChannelName('');
    setCurrentChannelId(null);
    setError(null);
  };

  const handleCreateWhatsApp = async () => {
    if (!newChannelName.trim()) {
      setError('Digite um nome para o canal');
      return;
    }

    setError(null);
    setConnectionState('creating');

    try {
      // Create instance
      const response = await apiClient.post<{ channel: Channel }>('/whatsapp/instances', {
        name: newChannelName.trim(),
      });

      setCurrentChannelId(response.channel.id);
      setConnectionState('qrcode');

      // Get QR code
      const qrResponse = await apiClient.get<QRCodeData>(
        `/whatsapp/instances/${response.channel.id}/qrcode`,
      );

      setQrCode(qrResponse);
    } catch (err) {
      setConnectionState('error');
      setError(err instanceof Error ? err.message : 'Falha ao criar instancia');
    }
  };

  const handleRefreshQR = async () => {
    if (!currentChannelId) return;

    try {
      const qrResponse = await apiClient.get<QRCodeData>(
        `/whatsapp/instances/${currentChannelId}/qrcode`,
      );
      setQrCode(qrResponse);
    } catch (err) {
      console.error('Failed to refresh QR:', err);
    }
  };

  const handleDisconnect = async (channelId: string) => {
    try {
      await apiClient.post(`/whatsapp/instances/${channelId}/disconnect`, {});
      fetchChannels();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
    setMenuOpen(null);
  };

  const handleDelete = async (channelId: string) => {
    if (!confirm('Tem certeza que deseja excluir este canal?')) return;

    try {
      await apiClient.delete(`/whatsapp/instances/${channelId}`);
      fetchChannels();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
    setMenuOpen(null);
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <Smartphone className="h-6 w-6 text-green-500" />;
      case 'instagram':
        return <Instagram className="h-6 w-6 text-pink-500" />;
      case 'messenger':
        return <MessageCircle className="h-6 w-6 text-blue-500" />;
      default:
        return <MessageCircle className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Canais</h2>
          <p className="text-sm text-gray-400">
            Conecte canais de comunicacao para receber mensagens
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-v4-red-600"
        >
          <Plus className="h-4 w-4" />
          Adicionar Canal
        </button>
      </div>

      {/* Channels List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-12 text-center">
          <Smartphone className="mx-auto h-12 w-12 text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-white">Nenhum canal conectado</h3>
          <p className="mt-2 text-sm text-gray-400">
            Conecte seu primeiro canal WhatsApp para comecar a receber mensagens
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-v4-red-600"
          >
            <Plus className="h-4 w-4" />
            Conectar WhatsApp
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="relative rounded-lg border border-gray-800 bg-gray-900/50 p-4"
            >
              {/* Menu */}
              <div className="absolute right-2 top-2">
                <button
                  type="button"
                  onClick={() => setMenuOpen(menuOpen === channel.id ? null : channel.id)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen === channel.id && (
                  <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-gray-800 bg-gray-900 py-1 shadow-lg">
                    {channel.isActive && (
                      <button
                        type="button"
                        onClick={() => handleDisconnect(channel.id)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Desconectar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(channel.id)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-gray-800 p-3">{getChannelIcon(channel.type)}</div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">{channel.name}</h3>
                  <p className="text-sm text-gray-400 capitalize">{channel.type}</p>
                  {channel.phoneNumber && (
                    <p className="text-xs text-gray-500">{channel.phoneNumber}</p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="mt-4 flex items-center gap-2">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    channel.isActive ? 'bg-green-500' : 'bg-yellow-500',
                  )}
                />
                <span className="text-xs text-gray-400">
                  {channel.isActive ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-900 p-6">
            {/* Modal Header */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {connectionState === 'connected' ? 'Conectado!' : 'Conectar WhatsApp'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetModal();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            {connectionState === 'idle' && (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Nome do Canal
                  </label>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="Ex: WhatsApp Principal"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button
                  type="button"
                  onClick={handleCreateWhatsApp}
                  className="w-full rounded-lg bg-v4-red-500 py-2 font-medium text-white transition-colors hover:bg-v4-red-600"
                >
                  Continuar
                </button>
              </div>
            )}

            {connectionState === 'creating' && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-12 w-12 animate-spin text-v4-red-500" />
                <p className="mt-4 text-gray-400">Criando instancia...</p>
              </div>
            )}

            {connectionState === 'qrcode' && (
              <div className="space-y-4">
                <p className="text-center text-sm text-gray-400">
                  Escaneie o QR Code com seu WhatsApp
                </p>

                {/* QR Code */}
                <div className="flex justify-center">
                  {qrCode?.base64 ? (
                    <img
                      src={qrCode.base64}
                      alt="QR Code"
                      className="h-64 w-64 rounded-lg bg-white p-2"
                    />
                  ) : (
                    <div className="flex h-64 w-64 items-center justify-center rounded-lg bg-gray-800">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Pairing Code */}
                {qrCode?.pairingCode && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Ou use o codigo de pareamento:</p>
                    <p className="mt-1 font-mono text-lg text-white">{qrCode.pairingCode}</p>
                  </div>
                )}

                {/* Refresh */}
                <button
                  type="button"
                  onClick={handleRefreshQR}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar QR Code
                </button>

                <p className="text-center text-xs text-gray-500">
                  Aguardando conexao... O QR Code expira em 60 segundos.
                </p>
              </div>
            )}

            {connectionState === 'connected' && (
              <div className="flex flex-col items-center py-8">
                <div className="rounded-full bg-green-500/20 p-4">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <p className="mt-4 text-lg font-medium text-white">WhatsApp conectado!</p>
                <p className="text-sm text-gray-400">Voce ja pode receber mensagens</p>
              </div>
            )}

            {connectionState === 'error' && (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-4">
                  <div className="rounded-full bg-red-500/20 p-4">
                    <X className="h-12 w-12 text-red-500" />
                  </div>
                  <p className="mt-4 text-lg font-medium text-white">Erro ao conectar</p>
                  <p className="text-sm text-gray-400">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={resetModal}
                  className="w-full rounded-lg border border-gray-700 py-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
