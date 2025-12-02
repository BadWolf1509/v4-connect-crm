'use client';

import { useApi } from '@/hooks/use-api';
import { useQuery } from '@tanstack/react-query';
import { Building2, Clock, Globe, Loader2, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface TenantSettings {
  timezone?: string;
  businessHours?: {
    start: string;
    end: string;
    days: number[];
  };
  autoAssignment?: boolean;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logoUrl?: string;
  settings?: TenantSettings;
}

const timezones = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
];

const weekDays = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export default function CompanySettingsPage() {
  const { api, isAuthenticated } = useApi();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Fetch current tenant data
  const { data: tenantData, isLoading } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => api.get<Tenant>('/auth/me').then((res) => res as unknown as Tenant),
    enabled: isAuthenticated,
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    timezone: 'America/Sao_Paulo',
    businessHoursStart: '09:00',
    businessHoursEnd: '18:00',
    businessDays: [1, 2, 3, 4, 5],
    autoAssignment: true,
  });

  // Update form when data loads
  const tenant = tenantData;
  if (tenant && formData.name === '') {
    setFormData({
      name: tenant.name || '',
      timezone: tenant.settings?.timezone || 'America/Sao_Paulo',
      businessHoursStart: tenant.settings?.businessHours?.start || '09:00',
      businessHoursEnd: tenant.settings?.businessHours?.end || '18:00',
      businessDays: tenant.settings?.businessHours?.days || [1, 2, 3, 4, 5],
      autoAssignment: tenant.settings?.autoAssignment ?? true,
    });
  }

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    toast.info('Funcionalidade de atualização em desenvolvimento');
  }, []);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast.info('Upload de logo em desenvolvimento');
    }
  }, []);

  const toggleDay = useCallback((day: number) => {
    setFormData((prev) => ({
      ...prev,
      businessDays: prev.businessDays.includes(day)
        ? prev.businessDays.filter((d) => d !== day)
        : [...prev.businessDays, day].sort(),
    }));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-v4-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-white">Empresa</h1>
        <p className="mt-1 text-sm text-gray-400">Configure as informações da sua empresa</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-white">Informações da Empresa</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Logo */}
            <div className="md:col-span-2">
              <span className="block text-sm font-medium text-gray-300 mb-2">Logo</span>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-800">
                  {logoPreview || tenant?.logoUrl ? (
                    <img
                      src={logoPreview || tenant?.logoUrl}
                      alt="Logo"
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-gray-500" />
                  )}
                </div>
                <div>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-800">
                    <Upload className="h-4 w-4" />
                    Alterar Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">PNG, JPG até 2MB</p>
                </div>
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="company-name" className="block text-sm font-medium text-gray-300">
                Nome da Empresa
              </label>
              <input
                id="company-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-v4-red-500 focus:outline-none"
              />
            </div>

            {/* Slug */}
            <div>
              <label htmlFor="company-slug" className="block text-sm font-medium text-gray-300">
                Identificador (slug)
              </label>
              <input
                id="company-slug"
                type="text"
                value={tenant?.slug || ''}
                disabled
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-gray-400 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">O identificador não pode ser alterado</p>
            </div>
          </div>
        </div>

        {/* Timezone */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-white">Fuso Horário</h2>
          </div>

          <div className="max-w-md">
            <label htmlFor="company-timezone" className="block text-sm font-medium text-gray-300">
              Selecione o fuso horário
            </label>
            <select
              id="company-timezone"
              value={formData.timezone}
              onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-v4-red-500 focus:outline-none"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Business Hours */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-white">Horário de Funcionamento</h2>
          </div>

          <div className="space-y-4">
            {/* Days */}
            <div>
              <span className="block text-sm font-medium text-gray-300 mb-2">
                Dias de funcionamento
              </span>
              <div className="flex flex-wrap gap-2">
                {weekDays.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      formData.businessDays.includes(day.value)
                        ? 'bg-v4-red-500 text-white'
                        : 'border border-gray-700 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div className="grid gap-4 md:grid-cols-2 max-w-md">
              <div>
                <label
                  htmlFor="business-hours-start"
                  className="block text-sm font-medium text-gray-300"
                >
                  Início
                </label>
                <input
                  id="business-hours-start"
                  type="time"
                  value={formData.businessHoursStart}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      businessHoursStart: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-v4-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="business-hours-end"
                  className="block text-sm font-medium text-gray-300"
                >
                  Fim
                </label>
                <input
                  id="business-hours-end"
                  type="time"
                  value={formData.businessHoursEnd}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      businessHoursEnd: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-v4-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Auto Assignment */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white">Atribuição Automática</h3>
              <p className="text-sm text-gray-400">
                Distribuir novas conversas automaticamente entre os agentes online
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  autoAssignment: !prev.autoAssignment,
                }))
              }
              className={`relative h-6 w-11 rounded-full transition-colors ${
                formData.autoAssignment ? 'bg-v4-red-500' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  formData.autoAssignment ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-v4-red-500 px-6 py-2 font-medium text-white transition hover:bg-v4-red-600"
          >
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}
