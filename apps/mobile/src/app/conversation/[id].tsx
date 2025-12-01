import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Check,
  CheckCheck,
  ChevronLeft,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Send,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
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
  const [refreshing, setRefreshing] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const { data: conversation, isLoading: conversationLoading } = useConversation(id || '');
  const { data: messagesData, isLoading: messagesLoading, refetch } = useMessages(id || '');
  const sendMessage = useSendMessage();

  const messages = messagesData?.messages || [];
  const isLoading = conversationLoading || messagesLoading;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const pickImage = useCallback(async () => {
    setShowAttachmentMenu(false);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permissao necessaria', 'Precisamos de permissao para acessar suas fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    setShowAttachmentMenu(false);
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permissao necessaria', 'Precisamos de permissao para acessar a camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }, []);

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

    const isImage = item.type === 'image' && item.mediaUrl;

    return (
      <View className={`max-w-[80%] mb-2 ${isUser ? 'self-end' : 'self-start'}`}>
        <View className={`rounded-2xl overflow-hidden ${isUser ? 'bg-v4-red-500' : 'bg-gray-800'}`}>
          {isImage && item.mediaUrl ? (
            <TouchableOpacity onPress={() => setPreviewImage(item.mediaUrl)}>
              <Image
                source={{ uri: item.mediaUrl }}
                className="w-52 h-52"
                resizeMode="cover"
              />
              {item.content && (
                <View className="px-4 py-2">
                  <Text className="text-white">{item.content}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View className="px-4 py-2">
              <Text className="text-white">{item.content}</Text>
            </View>
          )}
          <View className="flex-row items-center justify-end px-4 pb-2">
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
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={messages.length === 0 ? { flex: 1 } : { padding: 16 }}
          inverted={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ef4444"
              colors={['#ef4444']}
            />
          }
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        {/* Selected Image Preview */}
        {selectedImage && (
          <View className="px-4 py-2 border-t border-gray-800 bg-gray-900">
            <View className="flex-row items-center">
              <Image
                source={{ uri: selectedImage }}
                className="w-16 h-16 rounded-lg"
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                className="ml-2 p-1 rounded-full bg-gray-800"
              >
                <X size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Input */}
        <View className="flex-row items-end px-4 py-3 border-t border-gray-800 bg-gray-950">
          <TouchableOpacity onPress={() => setShowAttachmentMenu(true)} className="p-2">
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

          {messageInput.trim() || selectedImage ? (
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

      {/* Attachment Menu Modal */}
      <Modal
        visible={showAttachmentMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachmentMenu(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setShowAttachmentMenu(false)}
        >
          <View className="mt-auto bg-gray-900 rounded-t-3xl p-6">
            <View className="w-12 h-1 bg-gray-700 rounded-full self-center mb-6" />
            <Text className="text-lg font-semibold text-white mb-4">Enviar</Text>
            <View className="flex-row justify-around">
              <TouchableOpacity onPress={pickImage} className="items-center">
                <View className="w-14 h-14 rounded-full bg-purple-500/20 items-center justify-center mb-2">
                  <ImageIcon size={24} color="#a855f7" />
                </View>
                <Text className="text-sm text-gray-300">Galeria</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={takePhoto} className="items-center">
                <View className="w-14 h-14 rounded-full bg-blue-500/20 items-center justify-center mb-2">
                  <ImageIcon size={24} color="#3b82f6" />
                </View>
                <Text className="text-sm text-gray-300">Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View className="flex-1 bg-black items-center justify-center">
          <TouchableOpacity
            onPress={() => setPreviewImage(null)}
            className="absolute top-12 right-4 z-10 p-2 rounded-full bg-black/50"
          >
            <X size={24} color="white" />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              className="w-full h-full"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
