# Atlas

## 📋 Description

Atlas is an enterprise resource planning (ERP) system built specifically for medicine distributors. It streamlines operations through integrated features for inventory management, sales tracking, and customer relationship management.

## 🏗️ Architecture

This project uses a **monorepo structure** with Turbo for task orchestration:

```
atlas/
├── apps/              # Backend and frontend apps
├── packages/          # Shared packages and libraries
├── docs/              # Documentation
└── turbo.json         # Monorepo configuration
```

### Technology Stack

**Backend:**

- Node.js with Express.js
- TypeScript for type safety
- Prisma ORM for database management
- PostgreSQL

**Frontend:**

- React.js with TypeScript
- Tailwind CSS and shadcn/ui
- Zustand
- TanStack query
- TanStack Router

**DevOps & Build:**

- pnpm for package management
- Turbo for monorepo task orchestration
- Docker support (optional)

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.x
- pnpm >= 10.8.1

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd atlas
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

### Development

Start the development server for all applications:

```bash
pnpm run dev
```

This command runs the development mode for both frontend and backend applications concurrently using Turbo.

### Build

Build all applications and packages:

```bash
pnpm run build
```

### Testing

Run the test suite:

```bash
pnpm run test
```

### Linting & Type Checking

```bash
pnpm run lint
pnpm run typecheck
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes using Conventional Commits (examples: `feat(api): add stock endpoint`, `fix(ui): resolve modal crash`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

### Conventional Commits

Commit messages must follow this pattern:

```
<type>(optional scope): <description>

[optional body]

[optional footer(s)]
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`.

Husky + commitlint will validate messages on commit.

## 📝 License

This project is licensed under the GPL 3.0 License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Sergio Pomárico**

- Email: sergiodavid21@gmail.com

## 📞 Support

For issues, feature requests, or questions, please open an issue in the repository.
