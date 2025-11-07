# TinyURL Clone - Backend API

Backend API server for the TinyURL Clone project, built with Express.js, TypeScript, MongoDB, and Redis.

## Tech Stack

- **Runtime:** Node.js 20.x
- **Framework:** Express.js 5.x
- **Language:** TypeScript 5.x
- **Database:** MongoDB 8.x (via Mongoose)
- **Cache:** Redis 7.x
- **Testing:** Jest + Supertest
- **Code Quality:** ESLint + Prettier

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files (DB, Redis, env)
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic layer
│   ├── utils/           # Utility functions
│   ├── jobs/            # Background jobs (cron)
│   ├── app.ts           # Express app configuration
│   └── server.ts        # Server entry point
├── tests/               # Test files
├── dist/                # Compiled JavaScript (generated)
└── logs/                # Application logs (generated)
```

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- MongoDB 8.x
- Redis 7.x
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tinyurl
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
# ... see .env.example for all options
```

### Running the Application

#### Development Mode
```bash
npm run dev
```
This starts the server with hot-reload using nodemon and ts-node.

#### Production Mode
```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm run start:prod
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm test` | Run all tests with coverage |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Check code for linting errors |
| `npm run lint:fix` | Fix linting errors automatically |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Check TypeScript types without compiling |

## API Endpoints

### Health Check
- `GET /api/health` - Basic health check
- `GET /api/ready` - Readiness check (DB, Redis)
- `GET /api/live` - Liveness check

### Authentication (Coming Soon)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Links (Coming Soon)
- `POST /api/links` - Create short link
- `GET /api/links` - Get user's links
- `GET /api/links/:id` - Get specific link
- `PUT /api/links/:id` - Update link
- `DELETE /api/links/:id` - Delete link

### Analytics (Coming Soon)
- `GET /api/analytics/:linkId` - Get link analytics

## Environment Variables

See `.env.example` for all available environment variables. Key variables:

- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection URL
- `JWT_SECRET` - Secret key for JWT tokens
- `FRONTEND_URL` - Frontend URL for CORS

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

## Architecture

### Controller Pattern
Controllers handle HTTP requests and responses:
```typescript
export const shortenUrl = async (req: Request, res: Response) => {
  try {
    const result = await linkService.createShortLink(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
```

### Service Layer
Business logic is separated into services:
```typescript
export class LinkService {
  async createShortLink(data: CreateLinkDto): Promise<Link> {
    // Business logic here
  }
}
```

### Error Handling
Centralized error handling with custom error classes:
```typescript
throw new ValidationError('Invalid URL format');
throw new UnauthorizedError('Invalid credentials');
throw new NotFoundError('Link not found');
```

## Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API rate limiting
- **JWT** - Token-based authentication
- **Bcrypt** - Password hashing
- **Input Validation** - Request validation with Joi

## Code Quality

### Linting
ESLint is configured with TypeScript rules:
```bash
npm run lint
npm run lint:fix
```

### Formatting
Prettier is used for code formatting:
```bash
npm run format
npm run format:check
```

### Type Checking
TypeScript strict mode is enabled:
```bash
npm run type-check
```

## Logging

Winston logger is configured with multiple transports:
- Console output (development)
- File output (production)
- Error log file
- Combined log file

## Database Models

### User Model
- Email/password authentication
- OAuth support
- Profile information
- Subscription tier

### Link Model
- Original URL
- Short slug
- Custom slug support
- Expiration date
- Click tracking

### Analytics Model
- Click events
- User agent tracking
- Referrer tracking
- Geographic data

## Contributing

1. Follow the TypeScript style guide
2. Write tests for new features
3. Update documentation
4. Use conventional commits

## License

MIT
