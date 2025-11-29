import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement registration
      router.replace('/(tabs)');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-2xl bg-v4-red-500 mb-4" />
            <Text className="text-2xl font-bold text-white">Criar conta</Text>
            <Text className="text-gray-400 mt-2">Comece gratuitamente</Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-300 mb-2">Seu nome</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="João Silva"
                placeholderTextColor="#71717a"
                className="w-full px-4 py-4 rounded-xl border border-gray-800 bg-gray-900 text-white"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-300 mb-2">
                Nome da empresa
              </Text>
              <TextInput
                value={company}
                onChangeText={setCompany}
                placeholder="Minha Empresa"
                placeholderTextColor="#71717a"
                className="w-full px-4 py-4 rounded-xl border border-gray-800 bg-gray-900 text-white"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-300 mb-2">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor="#71717a"
                keyboardType="email-address"
                autoCapitalize="none"
                className="w-full px-4 py-4 rounded-xl border border-gray-800 bg-gray-900 text-white"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-300 mb-2">Senha</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#71717a"
                secureTextEntry
                className="w-full px-4 py-4 rounded-xl border border-gray-800 bg-gray-900 text-white"
              />
              <Text className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</Text>
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-v4-red-500 items-center mt-4"
            >
              <Text className="text-white font-semibold text-base">
                {isLoading ? 'Criando...' : 'Criar conta'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-400">Já tem uma conta? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-v4-red-500 font-medium">Entrar</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
