# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Festora is a Next.js 16 application using the App Router pattern, bootstrapped with Create Next App.

## Commands

- **Dev server**: `npm run dev`
- **Build**: `npm run build`
- **Start production**: `npm start`
- **Lint**: `npm run lint`

## Tech Stack

- **Framework**: Next.js 16 with App Router (`src/app/`)
- **Language**: TypeScript (strict mode)
- **React**: v19 with React Compiler enabled
- **Styling**: Tailwind CSS v4 via PostCSS
- **Linting**: ESLint 9 flat config with next/core-web-vitals and next/typescript
- **Package manager**: npm

## Architecture

- App Router with all routes under `src/app/`
- Path alias: `@/*` maps to `./src/*`
- Server Components by default (Next.js convention)
- Fonts: Geist Sans and Geist Mono loaded via `next/font`
- Dark/light mode via CSS custom properties and `prefers-color-scheme`
