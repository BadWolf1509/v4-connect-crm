/**
 * Template Interpolator
 * Handles variable interpolation in quick replies and other templates
 */

export const AVAILABLE_VARIABLES = {
  contact: {
    nome: 'Nome do contato',
    email: 'E-mail do contato',
    telefone: 'Telefone do contato',
    empresa: 'Empresa do contato',
  },
  agent: {
    agente_nome: 'Nome do agente',
    agente_email: 'E-mail do agente',
  },
  system: {
    data: 'Data atual (DD/MM/YYYY)',
    hora: 'Hora atual (HH:mm)',
    dia_semana: 'Dia da semana',
  },
} as const;

export type VariableCategory = keyof typeof AVAILABLE_VARIABLES;
export type VariableName = keyof (typeof AVAILABLE_VARIABLES)[VariableCategory];

/**
 * Interpolates variables in a template string
 * Variables are in the format {{variable_name}}
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key];
    return value !== undefined ? value : match;
  });
}

/**
 * Extracts all variable names from a template string
 */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
}

/**
 * Validates that all variables in a template are known
 */
export function validateVariables(template: string): {
  valid: boolean;
  unknown: string[];
} {
  const usedVars = extractVariables(template);
  const allKnown = Object.values(AVAILABLE_VARIABLES).flatMap((cat) => Object.keys(cat));
  const unknown = usedVars.filter((v) => !allKnown.includes(v));

  return {
    valid: unknown.length === 0,
    unknown,
  };
}

/**
 * Builds a context object for interpolation from contact, agent, and system data
 */
export function buildInterpolationContext(
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  },
  agent?: {
    name?: string;
    email?: string;
  },
): Record<string, string> {
  const now = new Date();
  const diasSemana = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];

  return {
    // Contact variables
    nome: contact?.name || '',
    email: contact?.email || '',
    telefone: contact?.phone || '',
    empresa: contact?.company || '',

    // Agent variables
    agente_nome: agent?.name || '',
    agente_email: agent?.email || '',

    // System variables
    data: now.toLocaleDateString('pt-BR'),
    hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    dia_semana: diasSemana[now.getDay()],
  };
}

/**
 * Highlights variables in a template for preview
 */
export function highlightVariables(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, '<span class="variable">{{$1}}</span>');
}
