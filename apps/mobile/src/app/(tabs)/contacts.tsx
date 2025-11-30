import { Plus, RefreshCw, Search } from 'lucide-react-native';
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
import { type Contact, useContacts } from '../../hooks/use-contacts';

export default function ContactsScreen() {
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useContacts({
    search: search || undefined,
    limit: 50,
  });

  const contacts = data?.contacts || [];

  const renderContact = ({ item }: { item: Contact }) => {
    const initial = item.name[0]?.toUpperCase() || '?';
    const tags = item.tags || [];

    return (
      <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-gray-800">
        <View className="w-12 h-12 rounded-full bg-gray-700 items-center justify-center">
          <Text className="text-lg font-medium text-white">{initial}</Text>
        </View>

        <View className="flex-1 ml-3">
          <Text className="font-medium text-white">{item.name}</Text>
          <Text className="text-sm text-gray-400">{item.phone || item.email || 'Sem contato'}</Text>
          {tags.length > 0 && (
            <View className="flex-row mt-1 flex-wrap">
              {tags.slice(0, 3).map((tag) => (
                <View key={tag} className="px-2 py-0.5 rounded-full bg-gray-800 mr-1 mb-1">
                  <Text className="text-xs text-gray-400">{tag}</Text>
                </View>
              ))}
              {tags.length > 3 && (
                <View className="px-2 py-0.5 rounded-full bg-gray-800 mr-1">
                  <Text className="text-xs text-gray-400">+{tags.length - 3}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-gray-500">Nenhum contato encontrado</Text>
    </View>
  );

  const renderError = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-red-500 mb-4">Erro ao carregar contatos</Text>
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
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-white">Contatos</Text>
          <TouchableOpacity className="p-2 rounded-xl bg-v4-red-500">
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center mt-4 px-3 py-2 rounded-xl bg-gray-900 border border-gray-800">
          <Search size={18} color="#71717a" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar contatos..."
            placeholderTextColor="#71717a"
            className="flex-1 ml-2 text-white"
            autoCapitalize="none"
            autoCorrect={false}
          />
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
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={contacts.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
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
