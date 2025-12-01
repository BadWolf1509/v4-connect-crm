# V4 Connect CRM

> CRM conversacional multi-canal para WhatsApp, Instagram e Messenger com identidade visual V4 Company

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Hono](https://img.shields.io/badge/Hono-4.x-orange)](https://hono.dev/)
[![Drizzle](https://img.shields.io/badge/Drizzle-0.38-green)](https://orm.drizzle.team/)

---

## Sobre o Projeto

O V4 Connect CRM é uma plataforma completa de atendimento e vendas que integra:

- **Inbox Multi-canal**: WhatsApp, Instagram Direct e Facebook Messenger em uma interface unificada
- **CRM Kanban**: Funis de vendas com drag & drop para gestão de deals
- **Automações**: Chatbots e sequências de follow-up
- **Campanhas**: Disparos em massa com segmentação
- **IA Avançada**: Copilot, transcrição de áudios e análise de sentimento

---

## Stack Tecnológica

### Frontend
| Tecnologia | Versão | Função |
|------------|--------|--------|
| Next.js | 15.x | Framework React com App Router |
| React | 19.x | UI Library |
| TypeScript | 5.x | Type-safety |
| Tailwind CSS | 3.x | Estilização |
| TanStack Query | 5.x | Data fetching/cache |
| Zustand | 5.x | Estado global |

### Backend
| Tecnologia | Versão | Função |
|------------|--------|--------|
| Hono.js | 4.x | API Framework |
| Drizzle ORM | 0.38+ | ORM SQL-first |
| PostgreSQL | 16+ | Banco principal (Supabase) |
| Socket.io | 4.x | Real-time |
| BullMQ | 5.x | Filas e jobs |

### Mobile
| Tecnologia | Versão | Função |
|------------|--------|--------|
| React Native | 0.76+ | App nativo |
| Expo | 52.x | Framework/Build |
| Expo Router | 4.x | Navegação |

---

## Estrutura do Monorepo

```
v4-connect-crm/
├── apps/
│   ├── web/                 # Next.js 15 - Painel Web
│   ├── mobile/              # React Native (Expo) - App Mobile
│   ├── api/                 # Hono.js - Backend API
│   ├── worker/              # BullMQ Workers
│   └── websocket/           # Socket.io Server
│
├── packages/
│   ├── database/            # Drizzle ORM + Schema
│   ├── types/               # TypeScript Types compartilhados
│   ├── validators/          # Zod Schemas
│   └── utils/               # Helpers e utilitários
│
└── tooling/
    └── typescript/          # tsconfig base
```

---

## Começando

### Pré-requisitos

- Node.js 20+
- pnpm 9+
- PostgreSQL (ou conta Supabase)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/v4company/v4-connect-crm.git
cd v4-connect-crm

# Instale as dependências
pnpm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Execute as migrations do banco
pnpm db:push

# Popule o banco com dados demo
pnpm db:seed

# Inicie o ambiente de desenvolvimento
pnpm dev
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz com:

```env
# Database (Supabase)
DATABASE_URL="postgresql://..."

# Auth.js
AUTH_SECRET="seu-secret-aqui"
AUTH_URL="http://localhost:3002"

# API URLs
NEXT_PUBLIC_API_URL="http://localhost:3001"
API_URL="http://localhost:3001"
```

---

## Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev              # Inicia todos os apps em modo dev
pnpm dev:web          # Apenas o frontend web
pnpm dev:api          # Apenas a API

# Build
pnpm build            # Build de todos os apps
pnpm build:web        # Build apenas do web

# Database
pnpm db:push          # Sincroniza schema com o banco
pnpm db:seed          # Popula dados demo
pnpm db:studio        # Abre o Drizzle Studio

# Qualidade
pnpm lint             # Executa o linter (Biome)
pnpm typecheck        # Verifica tipos TypeScript
```

---

## Credenciais Demo

Após executar `pnpm db:seed`:

| Email | Senha | Role |
|-------|-------|------|
| admin@v4connect.com | password123 | Owner |
| agent@v4connect.com | password123 | Agent |

---

## Arquitetura

### Apps

- **web**: Painel administrativo Next.js com App Router, SSR e autenticação via Auth.js
- **api**: API REST com Hono.js, endpoints para todas as operações do CRM
- **mobile**: App React Native com Expo para atendentes em campo
- **websocket**: Servidor Socket.io para comunicação real-time
- **worker**: Processadores BullMQ para jobs em background

### Packages

- **database**: Schema Drizzle com todas as tabelas e relações
- **types**: Tipos TypeScript compartilhados entre apps
- **validators**: Schemas Zod para validação de dados
- **utils**: Funções utilitárias (formatadores, helpers)

---

## Funcionalidades

### Fase 1 - MVP (Atual)
- [x] Autenticação com Auth.js
- [x] Multi-tenancy
- [x] CRUD de contatos
- [x] Central de atendimento (Inbox)
- [ ] Integração WhatsApp (Evolution API)
- [ ] Integração Instagram/Messenger

### Fase 2 - CRM
- [ ] Funis Kanban
- [ ] Gestão de deals
- [ ] Chatbots básicos
- [ ] Respostas rápidas

### Fase 3 - IA & Campanhas
- [ ] Transcrição de áudios (Whisper)
- [ ] Copilot do atendente
- [ ] Campanhas em massa
- [ ] Relatórios avançados

---

## Deploy

### Frontend (Vercel)
```bash
# Via CLI
npx vercel --prod
```

### Backend (Railway)
```bash
# Via CLI
railway up
```

### URLs de Produção
- **Web**: https://v4-connect-crm-web.vercel.app
- **API**: https://api-production-c569.up.railway.app

---

## Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## Licença

Este projeto é proprietário da V4 Company. Todos os direitos reservados.

---

## Contato

- **V4 Company**: https://v4company.com
- **Suporte**: suporte@v4company.com

---

*Desenvolvido com Next.js 15, Hono.js, Drizzle ORM e muita dedicação.*
