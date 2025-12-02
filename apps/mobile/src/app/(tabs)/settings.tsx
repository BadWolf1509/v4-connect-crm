import { router } from 'expo-router';
import { Bell, ChevronRight, HelpCircle, LogOut, Palette, Shield, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/use-auth';

interface SettingsItem {
  icon: LucideIcon;
  label: string;
  description?: string;
  onPress?: () => void;
  destructive?: boolean;
}

const settingsItems: SettingsItem[] = [
  {
    icon: User,
    label: 'Meu Perfil',
    description: 'Editar informações pessoais',
  },
  {
    icon: Bell,
    label: 'Notificações',
    description: 'Configurar alertas e sons',
  },
  {
    icon: Palette,
    label: 'Aparência',
    description: 'Tema e personalização',
  },
  {
    icon: Shield,
    label: 'Segurança',
    description: 'Senha e autenticação',
  },
  {
    icon: HelpCircle,
    label: 'Ajuda',
    description: 'Central de suporte',
  },
];

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <ScrollView>
        {/* Header */}
        <View className="px-4 py-4 border-b border-gray-800">
          <Text className="text-2xl font-bold text-white">Configurações</Text>
        </View>

        {/* User Card */}
        <View className="mx-4 mt-4 p-4 rounded-xl bg-gray-900 border border-gray-800">
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-v4-red-500/20 items-center justify-center">
              <Text className="text-xl font-bold text-v4-red-500">
                {user?.name ? getInitials(user.name) : 'U'}
              </Text>
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-lg font-semibold text-white">{user?.name || 'Usuário'}</Text>
              <Text className="text-sm text-gray-400">{user?.email || 'usuario@empresa.com'}</Text>
              <Text className="text-xs text-gray-500 mt-1 capitalize">
                {user?.role || 'Membro'}
              </Text>
            </View>
          </View>
        </View>

        {/* Settings List */}
        <View className="mt-6">
          {settingsItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              className="flex-row items-center px-4 py-4 border-b border-gray-800"
            >
              <View className="w-10 h-10 rounded-xl bg-gray-800 items-center justify-center">
                <item.icon size={20} color="#71717a" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-medium text-white">{item.label}</Text>
                {item.description && (
                  <Text className="text-sm text-gray-500">{item.description}</Text>
                )}
              </View>
              <ChevronRight size={20} color="#71717a" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center px-4 py-4 mt-6 border-t border-gray-800"
        >
          <View className="w-10 h-10 rounded-xl bg-red-500/10 items-center justify-center">
            <LogOut size={20} color="#ef4444" />
          </View>
          <Text className="flex-1 ml-3 font-medium text-red-500">Sair</Text>
        </TouchableOpacity>

        {/* Version */}
        <View className="items-center py-8">
          <Text className="text-gray-600">V4 Connect v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
