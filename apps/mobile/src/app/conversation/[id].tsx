import { router, useLocalSearchParams } from 'expo-router';
import {
  Check,
  CheckCheck,
  ChevronLeft,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Send,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConversation } from '../../hooks/use-conversations';
import { type Message, useMessages, useSendMessage } from '../../hooks/use-messages';

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messageInput, setMessageInput] = useState('');

  const { data: conversation, isLoading: conversationLoading } = useConversation(id || '');
  const { data: messagesData, isLoading: messagesLoading, refetch } = useMessages(id || '');
  const sendMessage = useSendMessage();

  const messages = messagesData?.messages || [];
  const isLoading = conversationLoading || messagesLoading;

  const handleSend = useCallback(() => {
    const content = messageInput.trim();
    if (!content || !id) return;

    sendMessage.mutate(
      {
        conversationId: id,
        type: 'text',
        content,
      },
      {
        onSuccess: () => {
          setMessageInput('');
          refetch();
        },
      },
    );
  }, [messageInput, id, sendMessage, refetch]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    const statusIcon =
      item.status === 'read' ? (
        <CheckCheck size={12} color="#fff" />
      ) : item.status === 'delivered' ? (
        <CheckCheck size={12} color="rgba(255,255,255,0.7)" />
      ) : (
        <Check size={12} color="rgba(255,255,255,0.7)" />
      );

    return (
      <View className={`max-w-[80%] mb-2 ${isUser ? 'self-end' : 'self-start'}`}>
        <View className={`px-4 py-2 rounded-2xl ${isUser ? 'bg-v4-red-500' : 'bg-gray-800'}`}>
          <Text className="text-white">{item.content}</Text>
          <View className="flex-row items-center justify-end mt-1">
            <Text className={`text-xs ${isUser ? 'text-white/70' : 'text-gray-500'}`}>
              {formatTime(item.createdAt)}
            </Text>
            {isUser && <View className="ml-1">{statusIcon}</View>}
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-gray-500">Nenhuma mensagem ainda</Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator size="large" color="#ef4444" />
      </SafeAreaView>
    );
  }

  const contactName = conversation?.contact?.name || 'Desconhecido';
  const contactInitial = contactName[0]?.toUpperCase() || '?';

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-2 py-3 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ChevronLeft size={24} color="white" />
        </TouchableOpacity>

        <View className="flex-1 flex-row items-center ml-2">
          <View className="w-10 h-10 rounded-full bg-gray-700 items-center justify-center">
            <Text className="font-medium text-white">{contactInitial}</Text>
          </View>
          <View className="ml-3">
            <Text className="font-medium text-white">{contactName}</Text>
            <Text className="text-xs text-gray-400">
              {conversation?.contact?.phone || 'Sem telefone'}
            </Text>
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
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={messages.length === 0 ? { flex: 1 } : { padding: 16 }}
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
              editable={!sendMessage.isPending}
            />
          </View>

          {messageInput.trim() ? (
            <TouchableOpacity
              onPress={handleSend}
              disabled={sendMessage.isPending}
              className={`p-3 rounded-full ${sendMessage.isPending ? 'bg-gray-600' : 'bg-v4-red-500'}`}
            >
              {sendMessage.isPending ? (
                <ActivityIndicator size={18} color="white" />
              ) : (
                <Send size={18} color="white" />
              )}
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
