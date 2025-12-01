'use client';

import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

interface PreviewData {
  headers: string[];
  preview: Array<Record<string, string>>;
  totalRows: number;
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

const buildAutoMapping = (headers: string[]) => {
  const autoMapping: Record<string, string> = {};

  for (const header of headers) {
    const lowerHeader = header.toLowerCase();
    if (lowerHeader.includes('nome') || lowerHeader === 'name') {
      autoMapping[header] = 'name';
    } else if (lowerHeader.includes('email') || lowerHeader === 'e-mail') {
      autoMapping[header] = 'email';
    } else if (
      lowerHeader.includes('telefone') ||
      lowerHeader.includes('phone') ||
      lowerHeader.includes('celular') ||
      lowerHeader.includes('whatsapp')
    ) {
      autoMapping[header] = 'phone';
    } else if (lowerHeader.includes('tag')) {
      autoMapping[header] = 'tags';
    }
  }

  return autoMapping;
};

const CONTACT_FIELDS = [
  { value: 'name', label: 'Nome' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'tags', label: 'Tags (separadas por vírgula)' },
  { value: '', label: '-- Ignorar --' },
];

export function ImportModal({ open, onClose }: ImportModalProps) {
  const { api } = useApi();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'result'>('upload');
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (content: string) =>
      api.post<PreviewData>('/import/contacts/preview', { csvContent: content }),
    onSuccess: (data) => {
      setPreview(data);
      setFieldMapping(buildAutoMapping(data.headers));
      setStep('mapping');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao processar arquivo');
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: () =>
      api.post<ImportResult>('/import/contacts', {
        csvContent,
        fieldMapping,
        options: { skipDuplicates, updateExisting },
      }),
    onSuccess: (data) => {
      setImportResult(data);
      setStep('result');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao importar contatos');
    },
  });

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith('.csv')) {
        toast.error('Por favor, selecione um arquivo CSV');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvContent(content);
        previewMutation.mutate(content);
      };
      reader.readAsText(file);
    },
    [previewMutation],
  );

  const handleImport = useCallback(() => {
    // Validate mapping
    const mappedFields = Object.values(fieldMapping).filter(Boolean);
    if (
      !mappedFields.includes('name') &&
      !mappedFields.includes('email') &&
      !mappedFields.includes('phone')
    ) {
      toast.error('Mapeie pelo menos o Nome, Email ou Telefone');
      return;
    }

    setStep('importing');
    importMutation.mutate();
  }, [fieldMapping, importMutation]);

  const handleClose = useCallback(() => {
    setStep('upload');
    setCsvContent(null);
    setPreview(null);
    setFieldMapping({});
    setImportResult(null);
    onClose();
  }, [onClose]);

  const downloadTemplate = useCallback(() => {
    const template =
      'nome,email,telefone,tags\nJoão Silva,joao@email.com,+5511999999999,"cliente,vip"';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_contatos.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl border border-gray-800 bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-v4-red-500" />
            <h2 className="text-lg font-semibold text-white">Importar Contatos</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 border-b border-gray-800 px-6 py-3">
          {['upload', 'mapping', 'result'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  step === s || ['mapping', 'importing', 'result'].indexOf(step) > i
                    ? 'bg-v4-red-500 text-white'
                    : 'bg-gray-700 text-gray-400',
                )}
              >
                {i + 1}
              </div>
              <span className={cn('ml-2 text-sm', step === s ? 'text-white' : 'text-gray-400')}>
                {s === 'upload' && 'Upload'}
                {s === 'mapping' && 'Mapeamento'}
                {s === 'result' && 'Resultado'}
              </span>
              {i < 2 && <ChevronRight className="mx-2 h-4 w-4 text-gray-600" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="rounded-xl border-2 border-dashed border-gray-700 p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="flex cursor-pointer flex-col items-center">
                  {previewMutation.isPending ? (
                    <Loader2 className="h-12 w-12 animate-spin text-v4-red-500" />
                  ) : (
                    <Upload className="h-12 w-12 text-gray-500" />
                  )}
                  <span className="mt-4 text-lg font-medium text-white">
                    {previewMutation.isPending
                      ? 'Processando...'
                      : 'Arraste ou clique para selecionar'}
                  </span>
                  <span className="mt-2 text-sm text-gray-400">Formato aceito: CSV</span>
                </label>
              </div>

              <button
                type="button"
                onClick={downloadTemplate}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                <Download className="h-4 w-4" />
                Baixar modelo de CSV
              </button>
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && preview && (
            <div className="space-y-6">
              <div className="text-sm text-gray-400">
                Encontrados <span className="font-medium text-white">{preview.totalRows}</span>{' '}
                contatos no arquivo. Mapeie as colunas do CSV para os campos do contato.
              </div>

              <div className="space-y-3">
                {preview.headers.map((header) => (
                  <div key={header} className="flex items-center gap-4">
                    <div className="w-1/3">
                      <span className="rounded bg-gray-800 px-2 py-1 text-sm font-mono text-white">
                        {header}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                    <select
                      value={fieldMapping[header] || ''}
                      onChange={(e) =>
                        setFieldMapping({ ...fieldMapping, [header]: e.target.value })
                      }
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-v4-red-500 focus:outline-none"
                    >
                      {CONTACT_FIELDS.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800">
                    <tr>
                      {preview.headers.map((header) => (
                        <th key={header} className="px-3 py-2 text-left font-medium text-gray-300">
                          {fieldMapping[header] || header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {preview.preview.slice(0, 3).map((row, i) => {
                      const rowKey =
                        Object.entries(row)
                          .map(([key, value]) => `${key}:${value}`)
                          .join('|') || `row-${i}`;
                      return (
                        <tr key={rowKey}>
                          {preview.headers.map((header) => (
                            <td key={header} className="px-3 py-2 text-gray-400">
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Options */}
              <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-v4-red-500 focus:ring-v4-red-500"
                  />
                  <span className="text-sm text-gray-300">Pular contatos duplicados</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-v4-red-500 focus:ring-v4-red-500"
                  />
                  <span className="text-sm text-gray-300">Atualizar contatos existentes</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-v4-red-500" />
              <p className="mt-4 text-lg font-medium text-white">Importando contatos...</p>
              <p className="mt-2 text-sm text-gray-400">Isso pode levar alguns segundos</p>
            </div>
          )}

          {/* Step 4: Result */}
          {step === 'result' && importResult && (
            <div className="space-y-6">
              <div className="text-center">
                {importResult.imported > 0 ? (
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                ) : (
                  <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
                )}
                <h3 className="mt-4 text-lg font-medium text-white">
                  Importação {importResult.imported > 0 ? 'concluída' : 'finalizada'}
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-800 p-4 text-center">
                  <div className="text-2xl font-bold text-green-500">{importResult.imported}</div>
                  <div className="text-sm text-gray-400">Importados</div>
                </div>
                <div className="rounded-lg bg-gray-800 p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-500">{importResult.skipped}</div>
                  <div className="text-sm text-gray-400">Ignorados</div>
                </div>
                <div className="rounded-lg bg-gray-800 p-4 text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {importResult.errors.length}
                  </div>
                  <div className="text-sm text-gray-400">Erros</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <div className="text-sm font-medium text-red-400">Erros encontrados:</div>
                  <ul className="mt-2 space-y-1 text-sm text-red-300">
                    {importResult.errors.slice(0, 5).map((error, i) => (
                      <li key={`${error.row}-${i}`}>
                        Linha {error.row}: {error.error}
                      </li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>... e mais {importResult.errors.length - 5} erros</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-800 p-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
          >
            {step === 'result' ? 'Fechar' : 'Cancelar'}
          </button>
          {step === 'mapping' && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-v4-red-600 disabled:opacity-50"
            >
              {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Importar Contatos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
