# YuvaHire Job Portal

## Overview

YuvaHire is a job portal platform designed for colleges, where college administrators can post jobs for their students, and students can browse and apply to these jobs. The system includes a robust role-based access control mechanism with clear separation between super admin and college admin roles.

## Role Structure

### Super Admin

- **Purpose**: System administration and college admin verification
- **Responsibilities**:
  - Approving/rejecting college admin applications
  - Managing the system settings
  - Monitoring platform usage
- **Restrictions**:
  - Cannot post or manage jobs
  - Cannot directly interact with students
  - Works only with the system administration college

### College Admin

- **Purpose**: Managing college job postings and students
- **Responsibilities**:
  - Creating and managing job postings
  - Reviewing student applications
  - Managing college information
- **Restrictions**:
  - Can only access their own college's resources
  - Cannot approve other admins

### Student

- **Purpose**: Finding and applying for jobs
- **Responsibilities**:
  - Browsing available jobs at their college
  - Submitting applications
  - Managing their profile
- **Restrictions**:
  - Can only view jobs from their college
  - Cannot access administrative features

## Documentation

The system includes comprehensive documentation:

- **SETUP.md**: Instructions for setting up the system
- **API_DOCUMENTATION.md**: API reference guide
- **ADMIN_VERIFICATION.md**: Details about the admin verification process
- **ROLE_BASED_ACCESS_CONTROL.md**: Explains the role-based access control system
- **SYSTEM_ARCHITECTURE.md**: Overview of the system architecture

## Key Features

1. **One-Time Setup Process**: Initializes the system with the first super admin
2. **College Admin Verification**: Secure process for verifying college administrators
3. **Role-Based Access Control**: Strict enforcement of role permissions
4. **Email Verification**: Email-based verification for all users
5. **College-Student Association**: Students are associated with their respective colleges
6. **Job Posting and Application**: Complete job posting and application workflow

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Email**: Nodemailer for email notifications
- **Validation**: Joi for request validation
- **Logging**: Winston for structured logging

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run migrations: `node scripts/apply-migrations.js`
5. Start the server: `npm start`
6. Initialize the system using the setup endpoint

## Recent Updates

### Enhanced Role Separation (June 2025)

We've improved the separation between super admin and college admin roles:

1. Added system college flag to clearly identify the administrative college
2. Enhanced access control to prevent super admins from posting jobs
3. Added descriptive role information to admin records
4. Created a utility for checking college access permissions
5. Improved documentation around role separation
6. Added additional safeguards in job-related controllers

## API Endpoints

See `API_DOCUMENTATION.md` for complete API reference.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
