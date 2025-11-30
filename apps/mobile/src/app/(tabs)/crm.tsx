import { Plus, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Stage, useDeals, usePipelines } from '../../hooks/use-pipelines';

const formatCurrency = (value: string | number | null) => {
  const numValue = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!numValue) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
};

export default function CRMScreen() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  const {
    data: pipelinesData,
    isLoading: pipelinesLoading,
    error: pipelinesError,
    refetch: refetchPipelines,
    isRefetching: pipelinesRefetching,
  } = usePipelines();

  const pipelines = pipelinesData?.pipelines || [];
  const currentPipeline =
    pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0] || null;

  const {
    data: dealsData,
    isLoading: dealsLoading,
    refetch: refetchDeals,
    isRefetching: dealsRefetching,
  } = useDeals(currentPipeline?.id);

  const deals = dealsData?.deals || [];
  const isLoading = pipelinesLoading || dealsLoading;
  const isRefetching = pipelinesRefetching || dealsRefetching;

  const handleRefresh = () => {
    refetchPipelines();
    refetchDeals();
  };

  const getStageDeals = (stageId: string) => {
    return deals.filter((deal) => deal.stageId === stageId || deal.stage?.id === stageId);
  };

  const renderError = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-red-500 mb-4">Erro ao carregar pipelines</Text>
      <TouchableOpacity
        onPress={handleRefresh}
        className="flex-row items-center px-4 py-2 rounded-lg bg-gray-800"
      >
        <RefreshCw size={16} color="#fff" />
        <Text className="text-white ml-2">Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-gray-500 mb-4">Nenhum pipeline encontrado</Text>
      <TouchableOpacity className="flex-row items-center px-4 py-2 rounded-lg bg-v4-red-500">
        <Plus size={16} color="#fff" />
        <Text className="text-white ml-2">Criar Pipeline</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStage = (stage: Stage) => {
    const stageDeals = getStageDeals(stage.id);
    const totalValue = stageDeals.reduce(
      (sum, d) => sum + (Number.parseFloat(String(d.value)) || 0),
      0,
    );

    return (
      <View key={stage.id} className="w-72 mr-4 rounded-xl bg-gray-900 border border-gray-800">
        {/* Stage Header */}
        <View className="flex-row items-center p-3 border-b border-gray-800">
          <View
            className="w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: stage.color || '#6b7280' }}
          />
          <Text className="flex-1 font-medium text-white">{stage.name}</Text>
          <Text className="text-sm text-gray-500">{stageDeals.length}</Text>
        </View>

        {/* Stage Total */}
        <View className="px-3 py-2 border-b border-gray-800">
          <Text className="text-sm text-gray-500">{formatCurrency(totalValue)}</Text>
        </View>

        {/* Deals */}
        <ScrollView className="max-h-96 p-2">
          {stageDeals.map((deal) => (
            <TouchableOpacity key={deal.id} className="p-3 mb-2 rounded-lg bg-gray-800">
              <Text className="font-medium text-white">{deal.title}</Text>
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-sm text-gray-400">{deal.contact?.name || 'Sem contato'}</Text>
                <Text className="text-sm font-medium text-v4-red-500">
                  {formatCurrency(deal.value)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {stageDeals.length === 0 && (
            <View className="items-center py-4">
              <Text className="text-sm text-gray-500">Sem deals</Text>
            </View>
          )}

          {/* Add deal button */}
          <TouchableOpacity className="flex-row items-center justify-center p-3 rounded-lg border border-dashed border-gray-700">
            <Plus size={16} color="#71717a" />
            <Text className="text-gray-500 ml-1">Adicionar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

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

        {/* Pipeline Tabs */}
        {pipelines.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
            {pipelines.map((pipeline) => (
              <TouchableOpacity
                key={pipeline.id}
                onPress={() => setSelectedPipelineId(pipeline.id)}
                className={`px-4 py-2 mr-2 rounded-lg ${
                  currentPipeline?.id === pipeline.id ? 'bg-v4-red-500' : 'bg-gray-800'
                }`}
              >
                <Text
                  className={`font-medium ${
                    currentPipeline?.id === pipeline.id ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {pipeline.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : pipelinesError ? (
        renderError()
      ) : pipelines.length === 0 ? (
        renderEmpty()
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor="#ef4444"
              colors={['#ef4444']}
            />
          }
        >
          {currentPipeline?.stages?.sort((a, b) => a.order - b.order).map(renderStage)}

          {(!currentPipeline?.stages || currentPipeline.stages.length === 0) && (
            <View className="w-72 items-center justify-center rounded-xl border border-dashed border-gray-700 p-8">
              <Text className="text-gray-500 text-center mb-4">Nenhuma etapa no pipeline</Text>
              <TouchableOpacity className="flex-row items-center px-4 py-2 rounded-lg bg-gray-800">
                <Plus size={16} color="#fff" />
                <Text className="text-white ml-2">Adicionar Etapa</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
