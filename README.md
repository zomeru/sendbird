# Sendbird Chat Application

A real-time chat application built with Next.js 14, Sendbird UIKit, and Prisma for database management.

## Features

- Real-time messaging using Sendbird
- Authentication with NextAuth.js
- Group Channels
- Channel management (create, update, leave)
- User profile customization
- Responsive design (mobile & desktop)
- Database integration with Prisma
- Channel cover images and names

## Prerequisites

- [Node.js 22+](https://nodejs.org/en/download "Node.js 22+")
- Database management tool (optional, for inspecting the database)
- Sendbird account and application
- [PNPM package manager](https://pnpm.io/installation "PNPM package manager")

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Auth
NEXTAUTH_SECRET=your-secret-key # Generate a secure key
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
DATABASE_URL=your-database-url

# Sendbird
NEXT_PUBLIC_SENDBIRD_APP_ID=your-sendbird-app-id
NEXT_PUBLIC_SENDBIRD_USER_ID=your-sendbird-user-id
SENDBIRD_API_TOKEN=your-sendbird-api-token

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/sendbird.git
   cd sendbird
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up the database:

   ```bash
   # Push the database schema
   npx prisma db push

   # Generate Prisma Client
   npx prisma generate
   ```

4. Run the development server:

   ```bash
   pnpm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
sendbird/
├── src/
│   ├── app/                       # Next.js 14 app directory
│   │   ├── api/                  # API routes
│   │   ├── auth/                # Authentication pages
│   │   └── components/    # React components
│   └── types/                    # TypeScript type definitions
├── prisma/
│   └── schema.prisma       # Database schema
├── lib/
│   ├── db.ts                      # Database utilities
│   ├── sendbird.ts             # Sendbird configuration
└─└── utils.ts                    # Utility functions
```

## API Routes

The application includes several API endpoints:

- `/api/users` - Users
- `/api/channels` - Channels
- `api/auth/signup` - User registration
- `/api/auth/[...nextauth]` - Authentication

## Acknowledgments

- [Sendbird UIKit](https://sendbird.com/docs/uikit)
- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [NextAuth.js](https://next-auth.js.org/)
- [TailwindCSS](https://tailwindcss.com/)
