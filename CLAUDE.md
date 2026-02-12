# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HealthApp is a PocketHealth-like medical imaging patient portal. Patients can view, upload, understand, and share their medical imaging records (MRI, X-ray, ultrasound, CT scans). Providers can receive shared records and manage patients.

## Commands

- `npm run dev` — start Next.js dev server on localhost:3000
- `npm run build` — production build
- `npm run lint` — run ESLint (flat config, `eslint.config.mjs`)
- `npx prisma generate` — regenerate Prisma client (output: `src/generated/prisma`)
- `npx prisma db push` — push schema to database without migrations
- `npx prisma migrate dev` — create and apply migrations
- `npx prisma studio` — open database GUI on localhost:5555

## Architecture

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 (PostgreSQL) · NextAuth v4 (JWT strategy)

**Route groups:**
- `src/app/(auth)/` — login, register (centered card layout, no sidebar)
- `src/app/(dashboard)/` — all authenticated pages (sidebar + header layout via `DashboardLayout`)
- `src/app/api/` — API routes (auth, users, records, follow-ups, shares, family, providers)
- `src/app/shared/[token]/` — public share viewing (no auth required)

**Key patterns:**
- Prisma client singleton at `src/lib/prisma.ts` — always import from `@/lib/prisma`
- Prisma client is generated to `src/generated/prisma` (not `node_modules`), import types from `@/generated/prisma`
- Auth config at `src/lib/auth.ts` — extended JWT carries `id` and `role` (see `src/types/next-auth.d.ts` for type augmentations)
- Route protection via `src/middleware.ts` using `withAuth` — `/provider/*` restricted to PROVIDER role
- Zod validation schemas at `src/lib/validations/` — passwords require 12+ chars, uppercase, lowercase, number, special char
- Mock data for frontend development at `src/lib/mock-data.ts`

**Domain services:**
- `src/services/report-reader.ts` — medical term parsing, simplified report generation, and glossary. Contains a ~50-term radiology dictionary. `parseReportTerms()` identifies terms in report text; `generateSimplifiedReport()` replaces medical jargon with plain language.

**Component organization:**
- `src/components/ui/` — reusable primitives (Button, Input, Card, Badge, Modal, FileUpload, Avatar, Spinner, EmptyState)
- `src/components/layout/` — DashboardLayout, Header, Sidebar
- `src/components/report/` — ReportViewer, TermTooltip, ReportSummary, SimplifiedReport

**Data model roles:** User has `Role` enum (PATIENT, PROVIDER, ADMIN). Provider details are a separate `Provider` model linked 1:1 to User. Family relationships use a self-referencing join through `FamilyMember`.

## Environment

Requires `.env` with `DATABASE_URL` (PostgreSQL), `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`. See `.env.example`.

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
