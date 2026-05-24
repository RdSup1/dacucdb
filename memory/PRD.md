# Fomerstick — PRD

## Problem Statement (original)
Design web de UI/UX para a plataforma de gerenciamento e empréstimo de equipamentos 'Fomerstick', inspirado em landing pages de marcas de áudio premium. Estética sofisticada, imersiva e elegante. Hero com título marcante bold sans-serif, subtítulo sobre 'Equidade e Fila Inteligente', fotografia dramática de notebooks, SSDs e equipamentos de laboratório com iluminação cinemática sobre fundo escuro premium. CTAs vibrantes de alto contraste. Tendência Dribbble, altamente detalhado.

## Architecture
- Backend: FastAPI + Motor (async MongoDB) — /app/backend/server.py
- Frontend: React 19 + Tailwind + Shadcn UI — /app/frontend/src
- Auth: JWT Bearer (PyJWT + bcrypt). Token em localStorage 'fs_token'. 24h expiry.
- Design: Outfit + Manrope (Google Fonts). Paleta #050505 / #111111 / #FF5A00.

## User Personas
- **Membro de laboratório/estúdio**: solicita equipamentos, espera na fila inteligente, devolve.
- **Administrador**: cadastra equipamentos, monitora todas solicitações, gerencia catálogo.

## Core Requirements
- Landing page premium com hero, recursos (bento), como funciona, equipamentos preview, FAQ, CTA.
- Catálogo público de equipamentos com filtro e busca.
- Cadastro/login JWT.
- Sistema de empréstimo com fila inteligente baseada em equidade (histórico 30d).
- Painel do usuário (ativos, fila, histórico).
- Painel admin (CRUD equipamentos, ver todas solicitações).

## Implemented (2025-12)
- [x] Backend: auth (register, login, me), equipment CRUD, loans (request/return/cancel), stats, admin protection, seed admin + 6 equipamentos
- [x] Algoritmo de Equidade: prioriza usuário com menor count de loans nos últimos 30d
- [x] Frontend: 6 páginas (Landing, Login, Cadastro, Equipamentos, Painel, Admin)
- [x] Tema premium dark com tipografia Outfit/Manrope, grain texture, glow effects, animações reveal
- [x] Imagens cinemáticas no hero + ilustrações de equipamentos
- [x] 17/17 testes backend pytest passando
- [x] Frontend e2e validado pelo testing agent
- [x] **Supabase Storage** integrado: bucket público "imagens" criado automaticamente no startup, upload via backend (`POST /api/uploads/image`) usando service_role_key, frontend Admin com input file + preview, URL pública salva em `image_url`

## Backlog
- P1: Notificações por email quando empréstimo é ativado (Resend/SendGrid)
- P1: Reservas com agendamento (data específica)
- P2: QR code de check-in/check-out físico
- P2: Multi-tenancy (múltiplos laboratórios)
- P2: Exportar relatórios CSV de uso
- P2: Política de delete quando há loans ativos

## Credentials
- Admin: admin@fomerstick.com / admin123 (seedado)
- Test user: criar via /api/auth/register
