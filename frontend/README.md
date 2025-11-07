# ShortLinks Frontend

A modern, production-ready frontend for a TinyURL clone built with Next.js 16, TypeScript, and TailwindCSS.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5.x
- **Styling**: TailwindCSS 4.x
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Form Handling**: React Hook Form + Zod
- **Animation**: Framer Motion
- **Authentication**: NextAuth.js v5 (beta)
- **HTTP Client**: Axios
- **Bundler**: Turbopack (stable)
- **Runtime**: React 19

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env.local
```

3. Update environment variables in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

### Development

Run the development server with Turbopack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build

Build for production:

```bash
npm run build
```

### Start Production Server

```bash
npm run start
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   │   ├── login/         # Login page
│   │   └── register/      # Register page
│   ├── (public)/          # Public route group
│   ├── dashboard/         # Dashboard pages
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   └── ui/                # UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
│   ├── axios.ts           # Axios configuration
│   └── utils.ts           # Helper functions
├── stores/                # Zustand stores
│   └── auth-store.ts      # Auth state management
├── types/                 # TypeScript type definitions
│   └── index.ts           # Shared types
├── styles/                # Additional styles
├── public/                # Static assets
├── .env.example           # Environment variables template
├── eslint.config.mjs      # ESLint configuration
├── .prettierrc            # Prettier configuration
├── next.config.ts         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.ts     # TailwindCSS configuration
└── package.json           # Project dependencies
```

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Key Features

- **App Router**: Using Next.js 16 App Router with nested layouts
- **TypeScript**: Strict type checking enabled
- **Turbopack**: Fast development builds (50%+ faster)
- **TailwindCSS 4**: Modern utility-first CSS framework
- **React 19**: Latest React with Server Components support
- **Type-Safe API**: Strongly typed API calls with Axios
- **Form Validation**: Zod schema validation with React Hook Form
- **State Management**: Zustand for global state
- **Code Quality**: ESLint + Prettier for consistent code style

## Development Guidelines

### TypeScript

- Use strict mode (enabled by default)
- Define interfaces for all data structures
- Avoid `any` type usage
- Prefer type inference where possible

### Component Structure

```typescript
'use client'; // Only for client components

import { useState } from 'react';
import type { ComponentProps } from '@/types';

export default function Component({ prop }: ComponentProps) {
  // Component logic
  return <div>Component</div>;
}
```

### Styling

- Use TailwindCSS utility classes
- Follow mobile-first responsive design
- Use the `cn()` utility for conditional classes

### API Calls

```typescript
import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types';

const response = await api.get<ApiResponse<DataType>>('/endpoint');
```

## Environment Variables

| Variable              | Description            | Default                      |
| --------------------- | ---------------------- | ---------------------------- |
| NEXT_PUBLIC_API_URL   | Backend API URL        | http://localhost:5000/api    |
| NEXT_PUBLIC_APP_URL   | Frontend URL           | http://localhost:3000        |
| NEXTAUTH_URL          | NextAuth callback URL  | http://localhost:3000        |
| NEXTAUTH_SECRET       | NextAuth secret key    | (generate random secret)     |

## Learn More

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs)

## License

This project is part of the ShortLinks TinyURL clone application.
