import { router } from 'expo-router';
import { Filter, RefreshCw, Search } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Conversation, useConversations } from '../../hooks/use-conversations';

const channelColors: Record<string, string> = {
  whatsapp: '#22c55e',
  instagram: '#e879f9',
  messenger: '#3b82f6',
  webchat: '#6b7280',
};

function formatTimestamp(date: string | null): string {
  if (!date) return '';

  const messageDate = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - messageDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return messageDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) {
    return 'Ontem';
  }
  if (diffDays < 7) {
    return messageDate.toLocaleDateString('pt-BR', { weekday: 'short' });
  }
  return messageDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function InboxScreen() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, isLoading, error, refetch, isRefetching } = useConversations({
    search: search || undefined,
    status: statusFilter,
    limit: 50,
  });

  const conversations = data?.conversations || [];

  const renderConversation = ({ item }: { item: Conversation }) => {
    const channelType = item.channel?.type || 'webchat';
    const contactName = item.contact?.name || 'Desconhecido';
    const initial = contactName[0]?.toUpperCase() || '?';

    return (
      <TouchableOpacity
        onPress={() => router.push(`/conversation/${item.id}`)}
        className="flex-row items-center px-4 py-3 border-b border-gray-800"
      >
        {/* Avatar */}
        <View className="relative">
          <View className="w-12 h-12 rounded-full bg-gray-700 items-center justify-center">
            <Text className="text-lg font-medium text-white">{initial}</Text>
          </View>
          <View
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-950"
            style={{ backgroundColor: channelColors[channelType] }}
          />
        </View>

        {/* Content */}
        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-medium text-white" numberOfLines={1}>
              {contactName}
            </Text>
            <Text className="text-xs text-gray-500">{formatTimestamp(item.lastMessageAt)}</Text>
          </View>
          <Text className="text-sm text-gray-400 mt-0.5" numberOfLines={1}>
            {item.lastMessagePreview || 'Sem mensagens'}
          </Text>
        </View>

        {/* Unread badge */}
        {item.unreadCount > 0 && (
          <View className="ml-2 px-2 py-0.5 rounded-full bg-v4-red-500 min-w-[20px] items-center">
            <Text className="text-xs font-medium text-white">{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-gray-500">Nenhuma conversa encontrada</Text>
    </View>
  );

  const renderError = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-red-500 mb-4">Erro ao carregar conversas</Text>
      <TouchableOpacity
        onPress={() => refetch()}
        className="flex-row items-center px-4 py-2 rounded-lg bg-gray-800"
      >
        <RefreshCw size={16} color="#fff" />
        <Text className="text-white ml-2">Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      {/* Header */}
      <View className="px-4 py-4 border-b border-gray-800">
        <Text className="text-2xl font-bold text-white">Inbox</Text>

        {/* Search */}
        <View className="flex-row items-center mt-4 px-3 py-2 rounded-xl bg-gray-900 border border-gray-800">
          <Search size={18} color="#71717a" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar conversas..."
            placeholderTextColor="#71717a"
            className="flex-1 ml-2 text-white"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity>
            <Filter size={18} color="#71717a" />
          </TouchableOpacity>
        </View>

        {/* Status Filters */}
        <View className="flex-row mt-3 gap-2">
          {[
            { label: 'Todas', value: undefined },
            { label: 'Abertas', value: 'open' },
            { label: 'Pendentes', value: 'pending' },
            { label: 'Resolvidas', value: 'resolved' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.label}
              onPress={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 rounded-lg ${
                statusFilter === filter.value ? 'bg-v4-red-500' : 'bg-gray-800'
              }`}
            >
              <Text
                className={`text-sm ${
                  statusFilter === filter.value ? 'text-white font-medium' : 'text-gray-400'
                }`}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : error ? (
        renderError()
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={conversations.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#ef4444"
              colors={['#ef4444']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
