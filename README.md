# YuvaHire Job Portal

## Overview

YuvaHire is a comprehensive job portal designed for educational institutions where college administrators can post job opportunities and students can apply to them. This implementation fulfills all the requirements of the assignment with additional features for enhanced functionality.

## Features

### Core Requirements ✅

#### For College Admins

- **Registration/Login**: Secure authentication system with email verification
- **Job Management**:
  - Create jobs with title, description, location, and deadline
  - View, update, and delete job postings
  - Review and manage student applications

#### For Students

- **Registration/Login**: Easy registration with college association
- **College Association**:
  - Associate during registration
  - Admin-assigned college association
- **Job Access**: View jobs posted by their own college only
- **Application System**: Apply to jobs with optional resume URL

### Bonus Features ✅

- **JWT Authentication**: Secure access and refresh tokens
- **Role-Based Access Control**: Three distinct roles with proper permissions
- **Job Filtering/Search**: Advanced filtering options for job listings
- **Application History**: Complete tracking of application status and history

### Additional Features ✅

- **Super Admin System**: Platform management and college admin verification
- **Email Verification**: Secure email verification for all users
- **Password Reset Flow**: Complete forgot/reset password functionality
- **Admin Application Process**: Structured workflow for college admin creation

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (access and refresh tokens)
- **Validation**: Zod for request validation
- **Email Service**: Nodemailer with Mailgen templates
- **Logging**: Winston for structured logging
- **Containerization**: Docker for development environment

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- Docker and Docker Compose
- PostgreSQL (optional if using Docker)

### Installation Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/sagar-1m/YuvaHire-Job-Portal.git
   cd YuvaHire-Job-Portal
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your database and SMTP credentials.

4. **Start the PostgreSQL database**

   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**

   ```bash
   npm run prisma:migrate
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

7. **Initialize the system**
   Send a POST request to `/api/v1/setup/init` with:
   ```json
   {
     "adminName": "System Admin",
     "adminEmail": "admin@example.com",
     "adminPassword": "SecurePassword123"
   }
   ```

## API Documentation

A complete Postman collection is provided in the repository (`YuvaHire Job Portal API.postman_collection.json`) with examples for all endpoints. The key API groups include:

- **Authentication**: Register, login, verify email, refresh tokens, password reset
- **Admin Management**: Admin applications, approvals, college association
- **Job Management**: Create, update, delete, and search jobs
- **Student Operations**: Apply to jobs, view applications, track status
- **College Administration**: Manage college details and students

Example API calls:

```
POST /api/v1/auth/login - User login
GET /api/v1/jobs - List jobs with filtering
POST /api/v1/jobs - Create a new job posting
POST /api/v1/jobs/:id/apply - Apply to a job
```

## Development Approach

### System Architecture

The application follows a layered architecture:

1. **Routes Layer**: Defines API endpoints and routes requests
2. **Middleware Layer**: Handles authentication, validation, and error handling
3. **Controllers Layer**: Contains business logic for request handling
4. **Database Layer**: Managed through Prisma ORM for type-safe database operations

### Role-Based Access Control

A sophisticated RBAC system ensures:

- **Super Admins**: Manage the system and verify college admins
- **College Admins**: Can only access resources for their own college
- **Students**: Can only view and apply to jobs from their college

### Key Design Decisions

1. **Admin Application Process**: Structured workflow for college admin creation
2. **College-Student Association**: Students can be associated with colleges during registration or via admin assignment
3. **Email Verification**: All users must verify their email addresses to ensure legitimate accounts
4. **Transaction-Based Operations**: Critical operations use database transactions to maintain data integrity

## Testing

The application includes comprehensive endpoint testing covering all functionality:

1. System initialization and super admin creation
2. College admin application and approval flow
3. Job posting, viewing, updating, and deletion
4. Student registration and college association
5. Job application and status management
6. Authentication, token refresh, and password reset

## What I Would Add With More Time

1. **Social Login**: Integration with Google and LinkedIn for easier registration
2. **Real-time Notifications**: Using WebSockets for instant updates on application status
3. **Advanced Analytics**: Dashboards for colleges to track application metrics
4. **Resume Parsing**: Automatic extraction of skills and experience from uploaded resumes
5. **Interview Scheduling**: Calendar integration for scheduling interviews
6. **Student Profiles**: Enhanced student profiles with skills, projects, and education history

## Code Structure & Organization

The project follows a clean, modular structure:

- **controllers/**: Business logic for handling requests
- **routes/**: API endpoint definitions
- **middleware/**: Authentication and validation
- **services/**: Reusable services like email and tokens
- **utils/**: Helper functions and utilities
- **validations/**: Request validation schemas
- **prisma/**: Database schema and migrations
- **config/**: Configuration files for logger
- **libs/**: Libraries for email and token management

This organization promotes maintainability and separation of concerns.

## Database Design

The database schema is designed with careful consideration of relationships and role-based access control:

### Core Entities and Relationships

- **User**:

  - Central entity with role-based differentiation (`SUPER_ADMIN`, `ADMIN`, `PENDING_ADMIN`, `STUDENT`)
  - Stores authentication data including hashed passwords
  - Manages email verification with tokens and expiry timestamps
  - Handles password reset functionality with dedicated tokens
  - Maintains one-to-one relationships with role-specific profiles (Student or Admin)
  - Tracks refresh tokens and admin applications

- **College**:

  - Represents educational institutions with status management (`ACTIVE`, `PENDING`, `REJECTED`)
  - Contains `isSystemCollege` flag to identify the special system administration college
  - Stores optional `allowedEmailDomain` for automatic student email verification
  - Maintains one-to-many relationships with jobs, students, and admins
  - Tracks location, website, and address information

- **Admin**:

  - Links users with the ADMIN role to specific colleges
  - Contains optional description field for role clarification
  - Enforces one-to-one relationship with users via unique constraint

- **Student**:

  - Associates users with the STUDENT role to specific colleges
  - Stores extensible profile information as JSON
  - Maintains one-to-many relationship with job applications
  - Enforces one-to-one relationship with users via unique constraint

- **Job**:

  - Contains job posting details (title, description, requirements)
  - Includes status tracking (`ACTIVE`, `CLOSED`)
  - Records posting and expiration dates
  - Belongs to a specific college through foreign key relationship
  - Optimized with college ID indexing for efficient querying

- **Application**:
  - Connects students to jobs through a many-to-many relationship
  - Tracks application status (`APPLIED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`)
  - Stores optional resume URL
  - Enforces unique constraint preventing duplicate applications (one per student per job)
  - Optimized with strategic indexing for efficient lookups

### Supporting Entities

- **Token**:

  - Manages refresh tokens for secure authentication
  - Includes expiration tracking and unique token validation
  - Linked to specific users for authentication context

- **AdminApplication**:
  - Implements the admin verification workflow
  - Tracks application status (`PENDING`, `APPROVED`, `REJECTED`)
  - Records verification documents and position information
  - Maintains complex relationships between applicant, reviewer, and college
  - Stores review metadata including timestamps and comments

### Database Schema Highlights

- **Enums**: Strongly typed status fields using PostgreSQL enums
- **Timestamps**: Automatic tracking of creation and update times
- **Indexing**: Strategic indexes on foreign keys and frequently queried fields
- **Constraints**: Unique constraints to prevent data duplication
- **Mapping**: Custom table names using the `@@map` directive

### Entity-Relationship Diagram (Simplified)

```
User <──┬──> Student <───> Application <───> Job
        │                                     ▲
        │                                     │
        └──> Admin                            │
        │                                     │
        └──> AdminApplication                 │
                    │                         │
                    └─────> College <─────────┘
```

This database design supports:

- Clear separation between different user roles
- College-specific isolation of jobs and students
- Efficient querying through strategic indexing
- Complete audit trail with timestamps
- Secure authentication with token management
- Structured admin application workflow

## Functional Correctness

The implementation has been thoroughly tested to ensure:

- **Authentication works** for all user types
- **Role-based access** is properly enforced
- **Data isolation** between colleges is maintained
- **All CRUD operations** function correctly
- **Email verification** and password reset flows work as expected

## Code Structure & Readability

The codebase follows best practices:

- **Consistent naming conventions** throughout
- **Clear separation of concerns** between layers
- **Comprehensive error handling** with descriptive messages
- **Well-documented API endpoints** with validation
- **Modular design** allowing for easy extension

## License

MIT License
