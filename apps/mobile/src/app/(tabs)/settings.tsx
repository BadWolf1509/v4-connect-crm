import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Bell,
  Palette,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';

interface SettingsItem {
  icon: any;
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
              <Text className="text-xl font-bold text-v4-red-500">U</Text>
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-lg font-semibold text-white">Usuário</Text>
              <Text className="text-sm text-gray-400">usuario@empresa.com</Text>
            </View>
          </View>
        </View>

        {/* Settings List */}
        <View className="mt-6">
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
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
        <TouchableOpacity className="flex-row items-center px-4 py-4 mt-6 border-t border-gray-800">
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
