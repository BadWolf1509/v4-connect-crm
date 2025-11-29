import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft,
  Phone,
  MoreVertical,
  Send,
  Paperclip,
  Mic,
  Check,
  CheckCheck,
} from 'lucide-react-native';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'contact';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

const messages: Message[] = [
  {
    id: '1',
    content: 'Olá, tudo bem? Gostaria de saber mais sobre o produto X.',
    sender: 'contact',
    timestamp: '10:25',
    status: 'read',
  },
  {
    id: '2',
    content: 'Olá! Tudo ótimo, e com você? O produto X está disponível com entrega em até 3 dias úteis.',
    sender: 'user',
    timestamp: '10:28',
    status: 'read',
  },
  {
    id: '3',
    content: 'Perfeito! Qual o valor?',
    sender: 'contact',
    timestamp: '10:29',
    status: 'read',
  },
  {
    id: '4',
    content: 'O valor é R$ 199,90 com frete grátis para sua região.',
    sender: 'user',
    timestamp: '10:30',
    status: 'delivered',
  },
];

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const [messageInput, setMessageInput] = useState('');

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      className={`max-w-[80%] mb-2 ${
        item.sender === 'user' ? 'self-end' : 'self-start'
      }`}
    >
      <View
        className={`px-4 py-2 rounded-2xl ${
          item.sender === 'user' ? 'bg-v4-red-500' : 'bg-gray-800'
        }`}
      >
        <Text className="text-white">{item.content}</Text>
        <View className="flex-row items-center justify-end mt-1">
          <Text
            className={`text-xs ${
              item.sender === 'user' ? 'text-white/70' : 'text-gray-500'
            }`}
          >
            {item.timestamp}
          </Text>
          {item.sender === 'user' && (
            <View className="ml-1">
              {item.status === 'read' ? (
                <CheckCheck size={12} color="#fff" />
              ) : (
                <Check size={12} color="#fff" />
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-2 py-3 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ChevronLeft size={24} color="white" />
        </TouchableOpacity>

        <View className="flex-1 flex-row items-center ml-2">
          <View className="w-10 h-10 rounded-full bg-gray-700 items-center justify-center">
            <Text className="font-medium text-white">J</Text>
          </View>
          <View className="ml-3">
            <Text className="font-medium text-white">João Silva</Text>
            <Text className="text-xs text-gray-400">Online</Text>
          </View>
        </View>

        <TouchableOpacity className="p-2">
          <Phone size={20} color="#71717a" />
        </TouchableOpacity>
        <TouchableOpacity className="p-2">
          <MoreVertical size={20} color="#71717a" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16 }}
          inverted={false}
        />

        {/* Input */}
        <View className="flex-row items-end px-4 py-3 border-t border-gray-800 bg-gray-950">
          <TouchableOpacity className="p-2">
            <Paperclip size={20} color="#71717a" />
          </TouchableOpacity>

          <View className="flex-1 mx-2 px-4 py-2 rounded-2xl bg-gray-900 border border-gray-800">
            <TextInput
              value={messageInput}
              onChangeText={setMessageInput}
              placeholder="Digite sua mensagem..."
              placeholderTextColor="#71717a"
              multiline
              className="text-white max-h-24"
            />
          </View>

          {messageInput.trim() ? (
            <TouchableOpacity className="p-3 rounded-full bg-v4-red-500">
              <Send size={18} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity className="p-3 rounded-full bg-gray-800">
              <Mic size={18} color="#71717a" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
