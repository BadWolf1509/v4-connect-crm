import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, Filter } from 'lucide-react-native';

interface Conversation {
  id: string;
  contact: {
    name: string;
    phone: string;
  };
  channel: 'whatsapp' | 'instagram' | 'messenger';
  lastMessage: string;
  unread: number;
  timestamp: string;
}

const conversations: Conversation[] = [
  {
    id: '1',
    contact: { name: 'João Silva', phone: '+55 11 99999-1234' },
    channel: 'whatsapp',
    lastMessage: 'Olá, gostaria de saber mais sobre o produto',
    unread: 3,
    timestamp: '10:30',
  },
  {
    id: '2',
    contact: { name: 'Maria Santos', phone: '+55 11 99999-5678' },
    channel: 'instagram',
    lastMessage: 'Qual o prazo de entrega?',
    unread: 0,
    timestamp: '09:45',
  },
  {
    id: '3',
    contact: { name: 'Pedro Oliveira', phone: '+55 11 99999-9012' },
    channel: 'messenger',
    lastMessage: 'Obrigado pelo atendimento!',
    unread: 0,
    timestamp: 'Ontem',
  },
];

const channelColors = {
  whatsapp: '#22c55e',
  instagram: '#e879f9',
  messenger: '#3b82f6',
};

export default function InboxScreen() {
  const [search, setSearch] = useState('');

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      onPress={() => router.push(`/conversation/${item.id}`)}
      className="flex-row items-center px-4 py-3 border-b border-gray-800"
    >
      {/* Avatar */}
      <View className="relative">
        <View className="w-12 h-12 rounded-full bg-gray-700 items-center justify-center">
          <Text className="text-lg font-medium text-white">
            {item.contact.name[0]}
          </Text>
        </View>
        <View
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-950"
          style={{ backgroundColor: channelColors[item.channel] }}
        />
      </View>

      {/* Content */}
      <View className="flex-1 ml-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-medium text-white" numberOfLines={1}>
            {item.contact.name}
          </Text>
          <Text className="text-xs text-gray-500">{item.timestamp}</Text>
        </View>
        <Text className="text-sm text-gray-400 mt-0.5" numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>

      {/* Unread badge */}
      {item.unread > 0 && (
        <View className="ml-2 px-2 py-0.5 rounded-full bg-v4-red-500 min-w-[20px] items-center">
          <Text className="text-xs font-medium text-white">{item.unread}</Text>
        </View>
      )}
    </TouchableOpacity>
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
          />
          <TouchableOpacity>
            <Filter size={18} color="#71717a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}
