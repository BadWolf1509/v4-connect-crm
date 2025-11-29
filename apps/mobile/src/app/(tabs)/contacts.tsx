import { Plus, Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
}

const contacts: Contact[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '+55 11 99999-1234',
    tags: ['lead', 'vip'],
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@email.com',
    phone: '+55 11 99999-5678',
    tags: ['cliente'],
  },
  {
    id: '3',
    name: 'Pedro Oliveira',
    email: 'pedro@email.com',
    phone: '+55 11 99999-9012',
    tags: ['prospect'],
  },
];

export default function ContactsScreen() {
  const [search, setSearch] = useState('');

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-gray-800">
      <View className="w-12 h-12 rounded-full bg-gray-700 items-center justify-center">
        <Text className="text-lg font-medium text-white">{item.name[0]}</Text>
      </View>

      <View className="flex-1 ml-3">
        <Text className="font-medium text-white">{item.name}</Text>
        <Text className="text-sm text-gray-400">{item.phone}</Text>
        <View className="flex-row mt-1">
          {item.tags.map((tag) => (
            <View key={tag} className="px-2 py-0.5 rounded-full bg-gray-800 mr-1">
              <Text className="text-xs text-gray-400">{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
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
          />
        </View>
      </View>

      {/* Contacts List */}
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}
