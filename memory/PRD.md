# Fomerstick — PRD

## Problem Statement (original)
Design web de UI/UX para a plataforma de gerenciamento e empréstimo de equipamentos 'Fomerstick', inspirado em landing pages de marcas de áudio premium. Sistema funcional com fila inteligente e algoritmo de equidade.

## Architecture (atual)
- **Backend**: FastAPI + asyncpg
- **Database**: **Supabase PostgreSQL** (Transaction Pooler porta 6543) — migrado de MongoDB
- **Storage**: **Supabase Storage** bucket público "imagens"
- **Auth**: JWT Bearer próprio (bcrypt, 24h expiry) com tabela `users` no Postgres
- **Frontend**: React 19 + Tailwind + Shadcn UI
- **Tipografia**: Outfit + Manrope (Google Fonts)
- **Paleta**: #050505 (obsidian) / #111111 (surface) / #FF5A00 (amber CTA)

## Schema (Supabase PostgreSQL)
```sql
users           (id uuid pk, email unique, name, password_hash, role, created_at)
equipment       (id uuid pk, name, category, description, image_url, specs,
                 total_units int, available_units int, created_at)
loans           (id uuid pk, user_id fk users, equipment_id fk equipment,
                 user_name, user_email, equipment_name, equipment_image,
                 status text, queue_position int, requested_at, activated_at,
                 returned_at, due_date, requested_days int, notes)
```
Índices: `idx_loans_eq_status (equipment_id, status)`, `idx_loans_user (user_id)`.

## Algoritmo de Equidade (em SQL)
- Quando empréstimo é solicitado e há `available_units > 0` → ativa imediatamente
- Senão entra na fila com `status='queued'`
- Quando equipamento é devolvido → `_try_activate_next()`:
  1. Busca todos `loans` da equipment com `status='queued'`
  2. Para cada, calcula `fairness_score` = `COUNT(loans WHERE user_id=X AND status IN ('active','returned') AND requested_at >= NOW() - INTERVAL '30 days')`
  3. Ordena por `(fairness_score ASC, requested_at ASC)` → quem usou menos nos últimos 30 dias tem prioridade
  4. Ativa o vencedor, decrementa `available_units`, reorganiza posições da fila

## User Personas
- **Membro de laboratório/estúdio**: solicita equipamentos, espera na fila, devolve
- **Administrador**: cadastra equipamentos (com upload de imagem ao Storage), monitora todas solicitações

## Endpoints API
**Auth**: POST `/api/auth/register`, POST `/api/auth/login`, GET `/api/auth/me`
**Equipment**: GET `/api/equipment`, GET `/api/equipment/{id}`, POST `/api/equipment` (admin), DELETE `/api/equipment/{id}` (admin)
**Loans**: POST `/api/loans/request`, GET `/api/loans/mine`, POST `/api/loans/{id}/return`, POST `/api/loans/{id}/cancel`, GET `/api/loans/all` (admin)
**Storage**: POST `/api/uploads/image` (multipart, auth required)
**Stats**: GET `/api/stats`

## Implemented (2025-12)
- [x] Landing premium (Hero, Recursos bento, Como Funciona, Equipamentos preview, FAQ, CTA)
- [x] Auth JWT (cadastro, login, me)
- [x] CRUD de equipamentos
- [x] Sistema de empréstimo com fila inteligente
- [x] Algoritmo de Equidade em SQL puro
- [x] Painel do usuário (ativos, fila, histórico)
- [x] Painel admin (criar/remover equipamentos, ver todas solicitações)
- [x] Supabase Storage para upload de imagens (bucket público "imagens")
- [x] **Migração completa para Supabase PostgreSQL** (asyncpg via Transaction Pooler)
- [x] 19/19 testes backend pytest passando + frontend e2e validado

## Para a Apresentação
**Pontos técnicos para destacar**:
1. **PostgreSQL relacional com chaves estrangeiras e CASCADE** — diferente de NoSQL, garante integridade referencial entre `users`, `equipment` e `loans`
2. **UUID v4 nativo** via `gen_random_uuid()` da extensão `pgcrypto`
3. **TIMESTAMPTZ** com fuso horário para datas/horários consistentes
4. **Transação ACID** no `request_loan` — INSERT + reposicionar fila + tentar ativar próximo, tudo atômico
5. **Algoritmo de equidade em SQL** — `ORDER BY fairness_score ASC, requested_at ASC` resolve empates pela ordem de chegada
6. **Connection pooling** via Supabase Transaction Pooler (PgBouncer porta 6543) com `statement_cache_size=0`
7. **Supabase Storage** com bucket público; upload via backend usa `service_role_key` (evita expor credencial e contorna RLS)
8. **JWT Bearer auth** com bcrypt (custo padrão), token de 24h

## Backlog
- P1: SELECT FOR UPDATE no equipment dentro da transação de empréstimo (race condition em alta concorrência)
- P1: Política de delete quando há loans ativos (atualmente CASCADE)
- P1: Notificações por e-mail quando empréstimo é ativado (Resend/SendGrid)
- P2: Reservas agendadas por data
- P2: Multi-tenancy
- P2: Upload de avatar do usuário (folder="avatars")

## Credenciais
- Admin: admin@fomerstick.com / admin123 (seedado)
- DATABASE_URL: `postgresql://postgres.tkwxklbjdbflfsbrtoxt:***@aws-1-sa-east-1.pooler.supabase.com:6543/postgres`
- Storage bucket: `imagens` (público, 5MB max)

## Como ver os dados
**No Supabase Dashboard**: Studio → Table Editor (https://app.supabase.com/project/tkwxklbjdbflfsbrtoxt)
**Via SQL** (asyncpg/psql):
```sql
SELECT * FROM equipment;
SELECT * FROM loans WHERE status='active';
SELECT u.name, COUNT(l.id) FROM users u LEFT JOIN loans l ON l.user_id=u.id GROUP BY u.id;
```
