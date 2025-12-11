# MCP Agent Studio

A modern multi-agent orchestration platform for MCP (Model Context Protocol) servers.

## Features

- **Server Management** - Configure and manage MCP server connections
- **Agent Orchestration** - Create and manage AI agents with hierarchical roles
- **Task Scheduling** - Schedule tasks with cron expressions and dependencies
- **Tool Catalog** - Browse and install tools from MCP servers
- **Real-time Monitoring** - Live dashboard with WebSocket updates
- **Chat Interface** - Interact with agents through a chat UI

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TailwindCSS, Radix UI |
| Backend | Fastify 4, Prisma ORM, PostgreSQL |
| Real-time | Socket.IO, WebSockets |
| Auth | JWT, bcrypt, CASL |
| Build | Turborepo, pnpm workspaces |

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker (for PostgreSQL)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-agent-studio

# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Start PostgreSQL
docker compose up -d

# Push database schema
cd server && npx prisma db push && cd ..

# Seed test data
cd server && npx dotenv -e .env -- npx tsx prisma/seed.ts && cd ..

# Start development server
pnpm dev
```

### Access the Application

- **Dashboard**: http://localhost:5173
- **API**: http://localhost:3000
- **Test Credentials**: `test@example.com` / `password123`

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm dev:server` | Start backend only |
| `pnpm dev:dashboard` | Start frontend only |
| `pnpm dev:mcp` | Start sample MCP server |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm mcp:test` | Run MCP protocol tests |

## Testing

### E2E Tests (Playwright)

```bash
# Run E2E tests (requires dev server running)
cd apps/dashboard
pnpm exec playwright test

# Run with UI
pnpm exec playwright test --ui
```

### MCP Integration Tests

```bash
# Start sample MCP server
pnpm dev:mcp

# In another terminal, run tests
pnpm mcp:test
```

## Project Structure

```
mcp-agent-studio/
├── apps/
│   └── dashboard/          # React frontend
├── server/                 # Fastify backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── websocket/      # Socket.IO handlers
│   └── prisma/             # Database schema
├── packages/
│   └── types/              # Shared TypeScript types
├── tools/
│   └── sample-mcp-server/  # Test MCP server
└── docs/
    ├── architecture/       # Architecture docs
    └── plans/              # Implementation plans
```

## MCP Server Integration

### Using the Sample Server

```bash
# Start sample server on port 3001
pnpm dev:mcp

# Add to MCP Agent Studio:
# URL: http://localhost:3001
# Token: sample-token-12345
```

### Sample Server Tools

| Tool | Description |
|------|-------------|
| `echo` | Echoes back a message |
| `calculate` | Basic arithmetic |
| `get_time` | Current server time |
| `execute_prompt` | Simulated prompt execution |
| `list_files` | List directory files |
| `read_file` | Read file contents |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Servers
- `GET /api/servers` - List servers
- `POST /api/servers` - Create server
- `POST /api/servers/:id/test` - Test connection

### Agents
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `POST /api/agents/from-prompt` - Create from NL prompt

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id/dependencies` - Get dependencies

### Chat
- `POST /api/chat/send` - Send message
- `GET /api/chat/sessions` - List sessions

## Environment Variables

Create `.env` in the server directory:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mcp_studio"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
PORT=3000
```

## Documentation

- [Architecture Overview](docs/architecture/README.md)
- [Implementation Status](docs/architecture/v2-implementation-status.md)
- [ADR: Tech Stack](docs/architecture/adr/001-tech-stack.md)
- [ADR: MCP Client](docs/architecture/adr/003-mcp-client.md)

## License

MIT
