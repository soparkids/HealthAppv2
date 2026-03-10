# HealthApp v2

A comprehensive healthcare management platform for medical practices and patients.

## Features

### For Healthcare Providers
- **Patient Management** - Track patient demographics, medical history, and visits
- **Appointment Scheduling** - Book and manage appointments
- **Lab Results** - Record, track, and AI-interpret lab results
- **Eye Consultations** - Specialized ophthalmology workflow
- **Equipment Management** - Track medical equipment with predictive maintenance
- **Multi-tenant Organizations** - Support multiple clinics/practices

### For Patients
- **Medical Records** - View and manage personal health records
- **Family Members** - Manage healthcare for family members
- **Shared Records** - Securely share records with providers
- **Follow-ups** - Track care recommendations

### Security
- **Field-level Encryption** - AES-256-GCM for sensitive medical data
- **MFA Support** - TOTP-based two-factor authentication
- **Role-based Access** - Patient, Provider, Admin roles
- **Audit Logging** - Complete audit trail of data access
- **Rate Limiting** - Redis-backed protection against abuse

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma 7
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS 4
- **AI**: OpenAI, Anthropic, Google Gemini
- **Rate Limiting**: Upstash Redis

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (we recommend [Neon](https://neon.tech))
- (Optional) Upstash Redis for production rate limiting

### Environment Setup

```bash
cp .env.example .env.local
```

Required variables:
```
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_SECRET="generate-with-openssl-rand-base64-32"
```

Optional (for production):
```
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

### Installation

```bash
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── (auth)/          # Auth pages (login, register)
│   ├── api/             # API routes
│   ├── dashboard/       # Main dashboard
│   ├── patients/        # Patient management
│   └── ...
├── components/          # React components
├── lib/                 # Utilities
│   ├── auth.ts          # NextAuth config
│   ├── encryption.ts    # Field-level encryption
│   ├── prisma.ts        # Database client
│   └── rate-limit.ts    # Rate limiting
└── generated/           # Prisma generated client
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/[...nextauth]` - NextAuth handlers
- `POST /api/auth/mfa/*` - MFA setup and verification

### Patients
- `GET/POST /api/patients` - List/create patients
- `GET/PUT/DELETE /api/patients/[id]` - Patient CRUD

### Medical Records
- `GET/POST /api/records` - Medical records
- `GET/POST /api/lab-results` - Lab results
- `POST /api/lab-results/[id]/interpret` - AI interpretation

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Set environment variables
4. Deploy

### Other Platforms

```bash
npm run build
npm start
```

## Security Considerations

- All sensitive medical data is encrypted at rest using AES-256-GCM
- Encryption keys are derived from ENCRYPTION_SECRET using scrypt
- Rate limiting protects against brute force attacks
- All data access is logged for audit compliance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

Proprietary - All rights reserved
