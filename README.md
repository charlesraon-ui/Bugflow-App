# BugFlow - QA Test Case Management System

A complete production-ready QA Test Case Management System built with modern technologies.

📚 **[Click here for the complete How to Use Guide](./USAGE.md)**

## Tech Stack

### Frontend
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Zustand (state management)
- Axios
- React Hook Form
- Zod validation

### Backend
- Node.js
- Express.js
- Prisma ORM
- JWT Authentication
- bcrypt
- Cloudinary (file storage)

### Database
- MySQL

## Project Structure

```
BugFlow/
├── backend/                 # Express.js backend
│   ├── src/
│   │   ├── config/         # Prisma configuration
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # JWT auth middleware
│   │   ├── routes/         # API routes
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utility functions
│   │   └── server.ts       # Entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── package.json
│   └── tsconfig.json
└── bugflow/                # Next.js frontend
    ├── app/
    │   ├── dashboard/      # Dashboard page
    │   ├── login/          # Login page
    │   ├── register/       # Register page
    │   ├── projects/       # Projects page
    │   └── test-cases/     # Test cases page
    ├── components/
    │   ├── ui/             # shadcn/ui components
    │   └── Sidebar.tsx
    ├── stores/             # Zustand store
    ├── lib/
    │   └── api.ts          # API client
    └── package.json
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- MySQL 8+
- Cloudinary account (for file uploads)

### 1. Backend Setup

#### Step 1: Configure Environment Variables
Create/Update `backend/.env`:
```env
DATABASE_URL="mysql://USERNAME:PASSWORD@localhost:3306/bugflow"
JWT_SECRET="your-super-secret-jwt-key-here-change-it-in-production"
JWT_EXPIRES_IN="7d"
PORT=3001
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
```

#### Step 2: Install Dependencies
```bash
cd backend
npm install
```

#### Step 3: Initialize Database
```bash
npx prisma generate
npx prisma migrate dev --name init
```

#### Step 4: Start Backend Server
```bash
npm run dev
```
Backend will be available at `http://localhost:3001`

### 2. Frontend Setup

#### Step 1: Install Dependencies
```bash
cd bugflow
npm install
```

#### Step 2: Start Frontend Server
```bash
npm run dev
```
Frontend will be available at `http://localhost:3000`

## Features

### Authentication
- User registration (QA Analyst or Developer)
- User login with JWT
- Protected routes
- Role-based access

### Dashboard
- Overview statistics
- Total projects and test cases
- Status breakdown (OPEN, TO FIX, FOR QA, PASS, FAILED, CLOSED)

### Projects
- Create, read, update, delete projects
- Project details and statistics
- Associate test cases with projects

### Test Cases
- Full CRUD operations
- Case number auto-increment (CASE_001, CASE_002, etc.)
- Advanced filtering and search
- Status management (OPEN → TO FIX → FOR QA → PASS/FAILED → CLOSED)
- Severity and priority levels
- File attachments (images, videos, PDFs via Cloudinary)
- Activity logs
- Comments and solution tracking

### User Roles
- **QA Analyst**: Create projects, test cases, assign developers, verify fixes
- **Developer**: View assigned cases, update fixes, change status to FOR QA

## API Endpoints

### Auth
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Test Cases
- `GET /api/test-cases/dashboard` - Get dashboard statistics
- `GET /api/test-cases` - Get all test cases
- `POST /api/test-cases` - Create test case
- `GET /api/test-cases/:id` - Get test case by ID
- `PUT /api/test-cases/:id` - Update test case
- `DELETE /api/test-cases/:id` - Delete test case

### Attachments
- `POST /api/attachments` - Upload attachment
- `DELETE /api/attachments/:id` - Delete attachment

## Database Schema

### users
- id, fullname, email, password, role, created_at, updated_at

### projects
- id, name, description, status, created_by, created_at, updated_at

### test_cases
- id, project_id, case_number, version, title, expected_result, actual_result, test_data, steps_to_reproduce, severity, priority, issue_type, status, assigned_to, root_cause, action_plan, developer_solution, developer_push_date, verified_by, verification_date, comments, logs_date, created_by, created_at, updated_at

### attachments
- id, test_case_id, url, public_id, file_name, file_type, size, created_at

### activity_logs
- id, test_case_id, user_id, action, old_value, new_value, created_at

## License

MIT
