# V4 Connect CRM - Design System

> Sistema de design alinhado com a identidade visual oficial da V4 Company

## Índice

- [Cores](#cores)
- [Tipografia](#tipografia)
- [Componentes](#componentes)
- [Espaçamento](#espaçamento)
- [Animações](#animações)

---

## Cores

### Paleta de Cores Primárias - V4 Red

A cor vermelha é a identidade principal da marca V4 Company.

| Variante | Hex | RGB | Uso |
|----------|-----|-----|-----|
| `v4-red-400` | `#E30613` | `rgb(227, 6, 19)` | Textos e elementos leves |
| `v4-red-500` | `#E30613` | `rgb(227, 6, 19)` | **Cor principal da marca** |
| `v4-red-600` | `#B20710` | `rgb(178, 7, 16)` | Hover states, botões escuros |
| `v4-red-700` | `#80050B` | `rgb(128, 5, 11)` | Estados profundos |
| `v4-red-800` | `#400306` | `rgb(64, 3, 6)` | Variante mais escura |

**Exemplos de uso:**
```tsx
// Botão primário
<button className="bg-v4-red-500 hover:bg-v4-red-600">
  Ação Principal
</button>

// Link
<a className="text-v4-red-500 hover:underline">Link</a>

// Badge
<span className="bg-v4-red-500/10 text-v4-red-500 border border-v4-red-500/20">
  Destaque
</span>
```

---

### Paleta de Cinzas - V4 Gray

Escala de cinzas oficial da marca para backgrounds e textos secundários.

| Variante | Hex | RGB | Uso |
|----------|-----|-----|-----|
| `v4-gray-100` | `#E5E5E5` | `rgb(229, 229, 229)` | Backgrounds claros (light mode) |
| `v4-gray-200` | `#CCCCCC` | `rgb(204, 204, 204)` | Borders claros |
| `v4-gray-300` | `#B3B3B3` | `rgb(179, 179, 179)` | Textos secundários, placeholders |
| `v4-gray-700` | `#333333` | `rgb(51, 51, 51)` | Cards, borders (dark mode) |
| `v4-gray-800` | `#262626` | `rgb(38, 38, 38)` | Superfícies elevadas (dark mode) |
| `v4-gray-900` | `#1A1A1A` | `rgb(26, 26, 26)` | **Background principal (dark mode)** |
| `v4-gray-950` | `#000000` | `rgb(0, 0, 0)` | Preto puro |

**Exemplos de uso:**
```tsx
// Background principal (dark mode)
<div className="bg-v4-gray-900">...</div>

// Card elevado
<div className="bg-v4-gray-800 border border-v4-gray-700">...</div>

// Texto secundário
<p className="text-v4-gray-300">Descrição secundária</p>
```

---

### Cores Secundárias - Acentos

Cores de acento da marca V4 para status e feedback.

| Cor | Hex | RGB | Uso |
|-----|-----|-----|-----|
| `v4-green` | `#52CC5A` | `rgb(82, 204, 90)` | Sucesso, confirmações, status positivo |
| `v4-yellow` | `#FFC02A` | `rgb(255, 192, 42)` | Avisos, alertas, atenção |

**Exemplos de uso:**
```tsx
// Badge de sucesso
<Badge variant="success">Ativo</Badge>
// Renderiza: bg-v4-green/10 text-v4-green border border-v4-green/20

// Badge de aviso
<Badge variant="warning">Pendente</Badge>
// Renderiza: bg-v4-yellow/10 text-v4-yellow border border-v4-yellow/20
```

---

## Tipografia

### Fontes da Marca

O sistema utiliza as fontes oficiais da V4 Company:

| Fonte | Pesos | Uso | Classe Tailwind |
|-------|-------|-----|-----------------|
| **Montserrat** | 300, 400, 500, 600, 700, 800 | Fonte principal para todo o sistema | `font-montserrat` |
| **Bebas Neue** | 400 | Títulos especiais, display, destaques | `font-bebas` |

**Configuração:**
```tsx
// apps/web/src/app/layout.tsx
import { Montserrat, Bebas_Neue } from 'next/font/google';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
});

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
});
```

---

### Hierarquia Tipográfica

#### 📱 Hierarquia para UI de Aplicação (Dashboard)

Usada em **dashboards, configurações, páginas internas**:

| Tag | Tamanho | Peso | Line Height | Classe Tailwind | Uso |
|-----|---------|------|-------------|-----------------|-----|
| **H1** | 24px | Bold (700) | tight | `text-2xl font-bold` | Títulos principais de página |
| **H2** | 18px | Semibold (600) | tight | `text-lg font-semibold` | Títulos de seção |
| **H3** | 16px | Semibold (600) | normal | `text-base font-semibold` | Subtítulos |
| **H4** | 14px | Medium (500) | normal | `text-sm font-medium` | Títulos menores, labels de grupos |
| **H5** | 14px | Medium (500) | normal | `text-sm font-medium` | Labels, cabeçalhos de cards |
| **H6** | 12px | Medium (500) | normal | `text-xs font-medium uppercase` | Overlines, categorias |

**Implementação Global:**
```css
/* apps/web/src/app/globals.css */
h1 { @apply text-2xl font-bold leading-tight; }        /* 24px - "Membros (2)" */
h2 { @apply text-lg font-semibold leading-tight; }     /* 18px - "Informações da Empresa" */
h3 { @apply text-base font-semibold leading-normal; }  /* 16px - "Fuso Horário" */
h4 { @apply text-sm font-medium leading-normal; }      /* 14px - Labels de grupo */
h5 { @apply text-sm font-medium leading-normal; }      /* 14px - Cabeçalhos de cards */
h6 { @apply text-xs font-medium uppercase; }           /* 12px - Categorias */
```

**Exemplos de uso:**
```tsx
// Página de configurações
<h1>Membros (2)</h1>
<h2>Informações da Empresa</h2>
<h3>Fuso Horário</h3>
<h4>Nome da Empresa</h4>
<h5>Detalhes do contato</h5>
<h6>Configurações avançadas</h6>
```

---

#### 🎨 Hierarquia para Marketing (Guia de Marca Original)

Usada em **landing pages, banners, materiais de marketing**:

| Tag | Tamanho | Peso | Line Height | Classe Manual | Uso |
|-----|---------|------|-------------|---------------|-----|
| **Display 1** | 72px | ExtraBold (800) | 58px | `text-7xl font-extrabold` | Hero sections, destaques |
| **Display 2** | 60px | Bold (700) | 58px | `text-6xl font-bold` | Títulos principais de landing page |
| **Heading** | 22px | Regular (400) | 29px | `text-2xl font-normal` | Subtítulos de marketing |
| **Subheading** | 18px | Light (300) | 20px | `text-lg font-light` | Descrições curtas |

**Exemplos de uso:**
```tsx
// Landing page / Marketing
<h1 className="text-7xl font-extrabold font-bebas">V4 Connect CRM</h1>
<h2 className="text-6xl font-bold">Bem-vindo ao futuro do atendimento</h2>
<p className="text-2xl font-normal">Conecte-se com seus clientes</p>
```

> **⚠️ Importante:** Use a hierarquia de **Marketing** apenas em páginas públicas (landing, login, registro). Use a hierarquia de **UI de Aplicação** em todo o dashboard e páginas internas.

---

## Componentes

### Button

Componente de botão com 6 variantes baseadas nas cores da marca.

```tsx
import { Button } from '@/components/ui/button';

// Variantes disponíveis
<Button variant="default">Ação Principal</Button>      // bg-v4-red-500
<Button variant="destructive">Excluir</Button>         // bg-v4-red-600
<Button variant="outline">Cancelar</Button>            // border-v4-gray-700
<Button variant="secondary">Secundário</Button>        // bg-v4-gray-800
<Button variant="ghost">Limpar</Button>                // text-v4-gray-300
<Button variant="link">Ver mais</Button>               // text-v4-red-500

// Tamanhos
<Button size="sm">Pequeno</Button>       // h-8
<Button size="default">Padrão</Button>   // h-10
<Button size="lg">Grande</Button>        // h-12
<Button size="icon"><Icon /></Button>    // h-10 w-10
```

**Propriedades:**
- `variant`: `'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'`
- `size`: `'default' | 'sm' | 'lg' | 'icon'`
- `asChild`: boolean (permite composição com Slot do Radix UI)

---

### Badge

Componente de badge com suporte às cores secundárias V4.

```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="default">Padrão</Badge>       // v4-red-500
<Badge variant="secondary">Secundário</Badge> // v4-gray-800
<Badge variant="success">Sucesso</Badge>      // v4-green
<Badge variant="warning">Aviso</Badge>        // v4-yellow
<Badge variant="destructive">Erro</Badge>     // v4-red-600
<Badge variant="outline">Contorno</Badge>     // border-v4-gray-700
```

**Propriedades:**
- `variant`: `'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'`

---

### Card

Componente de card com backgrounds e borders da marca.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Título do Card</CardTitle>
    <CardDescription>Descrição opcional</CardDescription>
  </CardHeader>
  <CardContent>
    Conteúdo do card
  </CardContent>
  <CardFooter>
    <Button>Ação</Button>
  </CardFooter>
</Card>
```

**Estilos padrão:**
- Background: `bg-v4-gray-800` (dark mode)
- Border: `border-v4-gray-700`
- Border Radius: `rounded-xl`

---

## Espaçamento

Sistema de espaçamento baseado em múltiplos de 4px:

| Classe | Valor | Uso |
|--------|-------|-----|
| `p-1` | 4px | Espaçamento mínimo |
| `p-2` | 8px | Padding de badges, small elements |
| `p-3` | 12px | Padding de botões pequenos |
| `p-4` | 16px | Padding padrão de botões e cards |
| `p-6` | 24px | Padding de containers |
| `p-8` | 32px | Padding de seções |

**Gaps:**
- `gap-2` (8px): Elementos inline próximos
- `gap-3` (12px): Elementos relacionados
- `gap-4` (16px): Gap padrão
- `gap-6` (24px): Separação de seções

---

## Animações

### Transições Padrão

Todos os componentes interativos usam transições suaves:

```css
transition-colors  /* Cor de fundo, texto, borders */
duration-200       /* 200ms - padrão para interações */
```

**Exemplos:**
```tsx
// Hover suave em botões
className="transition-colors hover:bg-v4-red-600"

// Hover em cards
className="transition-all hover:shadow-lg"
```

### Animações Personalizadas

Configuradas via `tailwindcss-animate`:

- `animate-in` / `animate-out`: Entrada/saída
- `fade-in` / `fade-out`: Fade
- `zoom-in` / `zoom-out`: Zoom
- `slide-in-from-*`: Slide de direções
- `spin`: Loading states

---

## Modo Escuro (Dark Mode)

O sistema V4 Connect usa **dark mode por padrão** com as cores da marca:

```css
/* Dark Mode - Valores padrão */
--background: #1A1A1A;     /* v4-gray-900 */
--foreground: #FAFAFA;
--card: #262626;           /* v4-gray-800 */
--border: #333333;         /* v4-gray-700 */
--primary: #E30613;        /* v4-red-500 */
```

**Toggle de tema:**
```tsx
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();

<button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  Alternar Tema
</button>
```

---

## Boas Práticas

### ✅ Fazer

- Usar cores V4 (`v4-red-*`, `v4-gray-*`, `v4-green`, `v4-yellow`)
- Seguir hierarquia tipográfica (H1-H4)
- Usar componentes prontos do design system
- Aplicar opacidades com `/10`, `/20`, `/50` para backgrounds
- Usar `transition-colors` em elementos interativos

### ❌ Evitar

- Usar cores Tailwind genéricas (`gray-*`, `red-*`, `green-*`, `yellow-*`)
- Criar novos tamanhos de texto fora da hierarquia
- Hardcodar valores de cores HEX/RGB diretamente
- Criar componentes sem acessibilidade (usar Radix UI)
- Ignorar estados de hover/focus

---

## Arquivos de Configuração

### Tailwind Config
```typescript
// apps/web/tailwind.config.ts
export default {
  theme: {
    extend: {
      fontFamily: {
        montserrat: ['var(--font-montserrat)'],
        bebas: ['var(--font-bebas)'],
      },
      colors: {
        'v4-red': { 400, 500, 600, 700, 800 },
        'v4-gray': { 100, 200, 300, 700, 800, 900, 950 },
        'v4-green': '#52CC5A',
        'v4-yellow': '#FFC02A',
      },
    },
  },
}
```

### Variáveis CSS
```css
/* apps/web/src/app/globals.css */
:root {
  --v4-red-500: 357 92% 46%;
  --v4-gray-900: 0 0% 10%;
  --v4-green: 124 55% 56%;
  --v4-yellow: 42 100% 58%;
}
```

---

## Referências

- [Guia de Marca V4 Company](https://brand.v4company.com/identidade-visual/cores-e-tipografias)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Radix UI Components](https://radix-ui.com)
- [shadcn/ui](https://ui.shadcn.com)

---

**Última atualização:** Dezembro 2024
**Versão:** 1.0.0
