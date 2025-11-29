import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ChevronRight } from 'lucide-react-native';

interface Deal {
  id: string;
  title: string;
  value: number;
  contact: string;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  deals: Deal[];
}

const stages: Stage[] = [
  {
    id: '1',
    name: 'Novo Lead',
    color: '#3B82F6',
    deals: [
      { id: 'd1', title: 'Website Empresa X', value: 5000, contact: 'João' },
      { id: 'd2', title: 'App Mobile', value: 15000, contact: 'Maria' },
    ],
  },
  {
    id: '2',
    name: 'Qualificação',
    color: '#F59E0B',
    deals: [
      { id: 'd3', title: 'E-commerce', value: 25000, contact: 'Pedro' },
    ],
  },
  {
    id: '3',
    name: 'Proposta',
    color: '#8B5CF6',
    deals: [
      { id: 'd4', title: 'Sistema ERP', value: 50000, contact: 'Ana' },
    ],
  },
  {
    id: '4',
    name: 'Negociação',
    color: '#EC4899',
    deals: [],
  },
  {
    id: '5',
    name: 'Fechado',
    color: '#10B981',
    deals: [
      { id: 'd5', title: 'Landing Page', value: 3000, contact: 'Carlos' },
    ],
  },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function CRMScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      {/* Header */}
      <View className="px-4 py-4 border-b border-gray-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-white">CRM</Text>
          <TouchableOpacity className="p-2 rounded-xl bg-v4-red-500">
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>
        <Text className="text-gray-400 mt-1">Pipeline de Vendas</Text>
      </View>

      {/* Stages */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        {stages.map((stage) => (
          <View
            key={stage.id}
            className="w-72 mr-4 rounded-xl bg-gray-900 border border-gray-800"
          >
            {/* Stage Header */}
            <View className="flex-row items-center p-3 border-b border-gray-800">
              <View
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: stage.color }}
              />
              <Text className="flex-1 font-medium text-white">{stage.name}</Text>
              <Text className="text-sm text-gray-500">{stage.deals.length}</Text>
            </View>

            {/* Deals */}
            <ScrollView className="max-h-96 p-2">
              {stage.deals.map((deal) => (
                <TouchableOpacity
                  key={deal.id}
                  className="p-3 mb-2 rounded-lg bg-gray-800"
                >
                  <Text className="font-medium text-white">{deal.title}</Text>
                  <View className="flex-row items-center justify-between mt-2">
                    <Text className="text-sm text-gray-400">{deal.contact}</Text>
                    <Text className="text-sm font-medium text-v4-red-500">
                      {formatCurrency(deal.value)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Add deal button */}
              <TouchableOpacity className="flex-row items-center justify-center p-3 rounded-lg border border-dashed border-gray-700">
                <Plus size={16} color="#71717a" />
                <Text className="text-gray-500 ml-1">Adicionar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
