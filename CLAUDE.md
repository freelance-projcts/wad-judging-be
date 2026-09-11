@AGENTS.md
You are a senior full-stack software engineer. Build a production-ready web application called **WAD Judging System** based on the attached screen recording and the requirements below.

The attached screen recording is the primary visual reference for the application's UI, navigation, screens, workflows, form fields, tables, buttons, filters, dialogs, notifications, marks entry, and result pages.

IMPORTANT:

* First inspect the attached screen recording carefully.
* Reproduce the functionality and overall UI/UX shown in the recording as closely as reasonably possible.
* Do not invent major functionality that is not supported by the recording or the requirements below.
* You may improve usability, responsiveness, validation, accessibility, and code structure while keeping the demonstrated business workflow intact.
* Build the application as a real working full-stack application, not a static mockup.
* All CRUD operations must persist to PostgreSQL.
* All role restrictions must be enforced on the server, not only hidden in the frontend.

==================================================

1. TECHNOLOGY STACK
   ==================================================

Frontend:

* Next.js 15+ using App Router
* TypeScript
* React
* Tailwind CSS
* shadcn/ui
* Lucide React icons
* React Hook Form
* Zod validation

Backend:

* Use Next.js server-side APIs / Route Handlers for the backend.
* Keep the application as a modular monolith rather than microservices.
* Use TypeScript throughout.

Database:

* PostgreSQL

ORM:

* Prisma

Authentication:

* Secure credential-based authentication.
* Use HTTP-only secure cookies for session/token handling.
* Implement role-based access control.
* Never store plain-text passwords.

File storage:

* Abstract image storage behind a storage service.
* For local development, allow local storage.
* Keep the design ready for S3-compatible/object storage in production.

Documentation:

* Add Swagger/OpenAPI or an equivalent API documentation mechanism where practical.

Testing:

* Unit tests for important business logic.
* Integration tests for authentication, marks, edit requests, and results.
* Add load-testing documentation/scenarios for at least 500 concurrent users.

Deployment:

* Application must be Docker-ready.
* Provide Dockerfile and docker-compose.yml for local development with PostgreSQL.
* Structure the application so that it can be deployed to Netlify or another serverless/cloud environment.
* Do not depend on local filesystem state for persistent business data.

==================================================
2. MAIN USERS / ROLES
=====================

Implement two primary roles.

ROLE 1: ADMINISTRATOR

The administrator can:

* Login
* View dashboard
* Create students
* View/search students
* Edit student information
* Delete students where permitted
* Create events
* Edit events
* Delete events
* Filter events
* Assign students to Team A or Team B
* View competition results
* Download results
* View mark-entry notifications
* View mark-edit requests
* Approve mark-edit requests
* Reject mark-edit requests
* View/manage profile
* Logout

ROLE 2: PERFORMANCE JUDGE

The judge/performance user can:

* Login
* Access the assigned performance
* View performance dashboard/home
* Search students
* Filter students by gender
* Filter students by province
* View students belonging to relevant teams
* Enter marks
* Add additional scoring rounds
* Edit marks only when authorized
* View results for the assigned performance
* View/manage profile
* Logout

IMPORTANT:
Do not implement the judge as a generic unrestricted user.

A judge must have explicit performance permissions.

For example:

JUDGE
-> PERFORMANCE_1
-> PERFORMANCE_2

A judge assigned only to PERFORMANCE_1 must not be able to access PERFORMANCE_2 data.

This authorization must be enforced in backend/API logic.

==================================================
3. APPLICATION LAYOUT
=====================

Recreate the general layout shown in the screen recording.

Use:

* Sidebar navigation
* Top/header area
* Dashboard cards
* Tables
* Filters
* Search
* Modal/dialog forms
* Toast notifications
* Confirmation dialogs
* Responsive layout

The UI should feel like a professional competition/judging management system.

Use consistent spacing, typography, buttons, status badges, table styling, and modal behavior.

Make the application responsive for:

* Desktop
* Laptop
* Tablet
* Mobile where practical

==================================================
4. AUTHENTICATION
=================

Create:

Login page:

* Email
* Password
* Show/hide password
* Sign In
* Forgot Password
* Sign Up

Registration:

* Name
* Email
* Password
* Confirm Password

IMPORTANT SECURITY RULE:
A public user must NOT be allowed to register themselves as ADMIN.

Use one of these approaches:

* Public signup creates only JUDGE accounts
  OR
* Admin accounts are created through a protected administration mechanism.

Implement:

* Strong password validation
* Password hashing using Argon2 or bcrypt
* Session management
* Logout
* Password reset flow
* Protected routes
* Server-side role checks
* Unauthorized page / API response
* Automatic redirect after login based on role

==================================================
5. ADMIN DASHBOARD
==================

Recreate the dashboard shown in the recording.

Display cards such as:

* Total Students
* Total Events
* Pending Requests

Also show:

* Welcome message
* Current date
* Recently Added Students

Recently Added Students should display:

* Avatar/photo
* Student name
* Student ID

Dashboard statistics must come from PostgreSQL.

Do not hard-code dashboard counts.

==================================================
6. STUDENT MANAGEMENT
=====================

Create Student page.

Fields demonstrated in the recording:

* Student Photo
* Student ID
* Full Name
* Gender
* Province

Gender:

* Male
* Female
* Other

Province should support:

* Central
* Eastern
* Northern
* Southern
* Western
* North Western
* North Central

Requirements:

* Student ID must be unique.
* Required fields must be validated.
* Validate uploaded image type and size.
* Display validation errors clearly.
* Display success/error toast messages.
* Save student to PostgreSQL.

Student List:

* Display photo
* Student name
* Student ID
* Gender
* Province
* Team
* Actions

Add:

* Search by name
* Search by Student ID
* Province filter
* Gender filter where useful
* Pagination
* View
* Edit
* Delete with confirmation

Use server-side pagination and filtering.

==================================================
7. EVENT MANAGEMENT
===================

Create Manage Events page.

The recording demonstrates events such as:

* Floor Exercises
* Rings
* Pommel Horse
* Vault Table
* Uneven Bars

Each event should contain at minimum:

* Event ID
* Event Name
* Gender
* Status
* Created date
* Updated date

Functions:

* Add Event
* Edit Event
* Delete Event
* Gender filter
* Search event

Prevent invalid duplicate events where appropriate.

If an event has existing marks/results, handle deletion safely.
Prefer soft-delete/deactivation when appropriate.

==================================================
8. TEAM ASSIGNMENT
==================

Create Assign Teams page.

Supported teams:

* Team A
* Team B

Filters:

* Gender
* Province
* Search

Display:

* Student name
* Student ID
* Current team
* Team A control
* Team B control

Requirements:

* A student can have only one current team.
* Changing the selected team must update PostgreSQL.
* Display a confirmation message such as "Team Updated".
* Record who performed the assignment and when.

Recommended database model:

Student
Team
TeamAssignment

Do not simply store team information without audit/history if it can be avoided.

==================================================
9. PERFORMANCE MANAGEMENT
=========================

Support at least:

Performance 1
Performance 2

Each performance should have:

* ID
* Name
* Display order
* Status

Judges can be assigned to one or more performances.

Admin should eventually be able to manage judge-performance assignments, even if the screen recording does not show a dedicated page for it.

==================================================
10. PERFORMANCE JUDGE DASHBOARD
===============================

Recreate the structure shown in the recording.

Navigation:

Performance 1

* Home
* Marks
* Results

Performance 2

* Home
* Marks
* Results

General

* Profile
* Logout

Only show/use performances to which the authenticated judge is assigned.

Do not expose unauthorized performance data through API requests.

==================================================
11. PERFORMANCE MARKS SCREEN
============================

The marks screen shown in the recording contains filters such as:

* Gender
* Province
* Search

Show matching students.

Group students by team, for example:

Team A Students (6)

Each student row should display:

* Student ID
* Student name
* Team
* Add Marks button
* Edit action when authorized

==================================================
12. MARK ENTRY
==============

Implement a mark-entry modal/dialog similar to the screen recording.

The scoring categories shown include:

* D
* E1
* E2
* E3
* E4
* P

Each scoring item should support:

* Score
* Supervisor

The exact scoring configuration should NOT be hard-coded into the UI.

Create configurable performance criteria in the database.

Recommended structure:

Performance
PerformanceCriterion

Example:

Performance 1
D
E1
E2
E3
E4
P

For each mark:

* Validate numeric value
* Validate minimum
* Validate maximum
* Validate required status
* Associate mark with student
* Associate mark with performance
* Associate mark with round
* Record judge/user who entered the mark
* Record timestamp

==================================================
13. MULTIPLE ROUNDS
===================

The recording clearly demonstrates:

"Add Round 2"

Therefore the system MUST support multiple rounds.

Do NOT design the database with fixed columns such as:

d_score
e1_score
e2_score
...

Instead use a normalized structure.

Recommended conceptual model:

Mark

* id
* studentId
* performanceId
* roundNumber
* criterionId
* score
* supervisor
* enteredBy
* createdAt
* updatedAt

This allows:

Round 1
Round 2
Round 3
etc.

without database schema changes.

The UI should allow:

* Add Round
* View existing rounds
* Edit authorized marks
* Delete/cancel a round only when permitted

==================================================
14. MARK SUBMISSION
===================

Mark saving must be transactional.

When a judge submits a group of marks:

BEGIN TRANSACTION

* Validate user
* Validate performance permission
* Validate student
* Validate round
* Validate criteria
* Validate scores
* Save marks
* Save audit information
* Create relevant notification if required

COMMIT

If anything fails:
ROLLBACK

Never allow partial mark submission.

After successful submission:

* Show success notification
* Refresh relevant data
* Display the saved marks

==================================================
15. MARK EDIT REQUEST WORKFLOW
==============================

The recording demonstrates notifications involving requests to edit marks.

Implement:

Judge
->
Requests mark edit
->
Admin notification
->
Admin reviews
->
Approve / Reject
->
Judge receives result
->
If approved, judge can edit relevant marks

EditRequest fields:

* id
* requestedBy
* studentId
* performanceId
* roundId if applicable
* reason
* status
* reviewedBy
* reviewedAt
* createdAt
* updatedAt

Statuses:

* PENDING
* APPROVED
* REJECTED
* CANCELLED if needed

Admin actions:

* View
* Approve
* Reject

Approved request:

* Allow edit within the authorized scope
* Record the modification
* Record previous value
* Record new value
* Record who changed it
* Record timestamp

==================================================
16. NOTIFICATIONS
=================

Create Notifications page for administrators.

Sections/categories demonstrated:

* Mark Entry Notifications
* Admin Edit Requests

Notifications should identify:

* Requesting user
* Student
* Event/performance
* Action
* Date/time
* Status

Implement read/unread state.

For example:

* Unread
* Read

Add notification badge where appropriate.

Do not rely on browser-only state for notifications.

Persist notifications in PostgreSQL.

==================================================
17. RESULTS
===========

Admin Results page should support the result categories shown in the recording:

* Team Performance
* Top 8
* All Rounders
* Performance 2

Support:

* Event selection
* Search
* Gender-specific results
* Ranking
* Calculated scores
* Downloadable results

The recording demonstrates result downloads such as:

* Male P2 Results
* Female P2 Results

Implement download functionality.

Possible formats:

* CSV
* Excel
* PDF

At minimum implement CSV/Excel export.

Results must be calculated from persisted marks.

Do not manually hard-code results.

==================================================
18. RESULT CALCULATION ARCHITECTURE
===================================

Design the scoring logic so it can evolve.

Create a dedicated result/calculation service.

Example conceptual flow:

Student
-> Performance
-> Rounds
-> Criteria Scores
-> Calculate total
-> Apply scoring rules
-> Rank
-> Result

Do not tightly couple scoring calculations to the UI.

Use a service such as:

ResultCalculationService

The service should be testable independently.

If the exact scoring formula cannot be conclusively determined from the screen recording, implement a configurable scoring structure and clearly isolate the calculation logic so business rules can later be changed without rewriting the UI.

==================================================
19. PROFILE
===========

Create Profile page.

Display:

* Name
* Email
* Role
* Assigned performances if applicable

Allow permitted profile updates.

Allow password change.

Do not allow a normal user to change their own role.

==================================================
20. DATABASE DESIGN
===================

Use PostgreSQL + Prisma.

Create a normalized schema around:

User
Role
Student
Team
TeamAssignment
Event
Performance
PerformanceCriterion
JudgePerformanceAssignment
Mark
Round
EditRequest
Notification
AuditLog

Recommended relationships:

User
-> Role

User
-> JudgePerformanceAssignment
-> Performance

Student
-> TeamAssignment
-> Team

Student
-> Mark
-> Performance
-> Round
-> PerformanceCriterion
-> User

Student
-> EditRequest

User
-> Notification

User
-> AuditLog

Create foreign keys and indexes.

Important indexes:

* studentId
* student name where appropriate
* province
* gender
* team
* performanceId
* roundNumber
* mark student/performance combination
* edit request status
* notification recipient/read status

Use unique constraints where necessary.

==================================================
21. AUDIT LOGGING
=================

Competition marks are sensitive business data.

Implement AuditLog.

Record:

* actor
* action
* entity type
* entity ID
* previous data where appropriate
* new data where appropriate
* timestamp
* IP/user-agent where appropriate

Audit at minimum:

* Student creation
* Student edit
* Student deletion/deactivation
* Event creation/edit/deletion
* Team assignment
* Mark creation
* Mark modification
* Mark edit approval/rejection
* Role/performance assignment

==================================================
22. SECURITY
============

Implement secure application practices.

Requirements:

* Hash passwords with Argon2 or bcrypt
* HTTP-only secure cookies
* CSRF protection where applicable
* Input validation with Zod
* Server-side authorization
* Protection against SQL injection through Prisma
* XSS-safe rendering
* Rate limiting for authentication endpoints
* Brute-force protection
* Secure headers
* File-upload validation
* Maximum upload size
* Access control for uploaded files
* Never expose password hashes or secrets
* Secrets must be stored in environment variables
* Do not commit .env files
* Validate all IDs and request payloads
* Never trust role information supplied by the browser

==================================================
23. SERVER-SIDE AUTHORIZATION
=============================

This is critical.

Do not implement authorization like:

if (user.role === 'ADMIN') showAdminMenu()

only.

Every server endpoint must verify:

1. User is authenticated
2. User has required role
3. User has access to the relevant performance/event/student
4. User has permission for requested operation

Example:

A Performance 1 judge requesting:

GET /api/performance/2/marks

must receive an authorization error if they are not assigned to Performance 2.

Similarly, a judge must not be able to manipulate marks merely by modifying a request body.

==================================================
24. API STRUCTURE
=================

Create clean REST-style APIs.

Examples:

POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

GET    /api/dashboard

POST   /api/students
GET    /api/students
GET    /api/students/:id
PUT    /api/students/:id
DELETE /api/students/:id

POST   /api/events
GET    /api/events
PUT    /api/events/:id
DELETE /api/events/:id

PUT    /api/students/:id/team

GET    /api/performances
GET    /api/performances/:id/students

POST   /api/marks
GET    /api/marks
PUT    /api/marks/:id

POST   /api/edit-requests
GET    /api/edit-requests
PUT    /api/edit-requests/:id/approve
PUT    /api/edit-requests/:id/reject

GET    /api/results
GET    /api/results/:performanceId

GET    /api/notifications
PUT    /api/notifications/:id/read

GET    /api/profile
PUT    /api/profile

Actual route organization may differ if you have a cleaner Next.js structure.

==================================================
25. UI COMPONENT ARCHITECTURE
=============================

Create reusable components.

Examples:

components/
layout/
sidebar/
header/
dashboard/
students/
events/
teams/
performances/
marks/
results/
notifications/
profile/
common/
forms/
tables/
dialogs/

Avoid copying the same table/filter/modal code across screens.

Create reusable:

* DataTable
* SearchInput
* FilterSelect
* ConfirmDialog
* FormModal
* EmptyState
* LoadingState
* ErrorState
* Pagination
* StatusBadge

==================================================
26. LOADING / ERROR / EMPTY STATES
==================================

Every API-driven screen must handle:

Loading
Success
Empty
Error

Do not leave blank screens.

For example:

Loading:
Skeletons/spinners

Empty:
"No students found"

Error:
Friendly error + retry action

==================================================
27. PAGINATION / SEARCH / FILTERING
===================================

Do not retrieve thousands of records and filter everything in the browser.

Use server-side:

* pagination
* searching
* filtering
* sorting

For example:

GET /api/students?page=1&pageSize=20&province=Central&gender=Male&search=John

Return:

* items
* total
* page
* pageSize
* totalPages

==================================================
28. PERFORMANCE REQUIREMENTS
============================

The application should be designed to support at least:

500 concurrent users

Expected workload:

* Login
* Student searches
* Mark entry
* Results viewing
* Notifications
* Admin operations

Important:
500 concurrent users does NOT mean creating 500 database connections.

Use:

* PostgreSQL connection pooling
* Efficient queries
* Proper indexes
* Transactions
* Pagination
* Avoid N+1 queries
* Avoid repeated expensive result calculations

Results should be designed efficiently enough that many users can view results simultaneously.

==================================================
29. LOAD TESTING
================

Prepare the project for load testing.

Document test scenarios using k6 or another suitable tool.

Test at least:

1. 100 concurrent users
2. 250 concurrent users
3. 500 concurrent users
4. 750 concurrent users
5. 1000 concurrent users

Test:

* Login
* Student search
* Mark submission
* Results retrieval

Track:

* requests/sec
* p50 latency
* p95 latency
* p99 latency
* error rate
* CPU
* memory
* PostgreSQL connections
* PostgreSQL CPU

Target:

* p95 API response generally under 2 seconds for normal CRUD/search operations under expected load
* error rate below 1% during normal peak load

Clearly document that exact limits must be validated through real load testing.

==================================================
30. DEPLOYMENT
==============

Make the application deployable to Netlify.

Preferred initial production architecture:

Next.js
+
Server-side/API functionality
+
PostgreSQL
+
Object storage

Database can be Netlify Database/PostgreSQL or another managed PostgreSQL service.

The application must not require an always-running server for normal operation unless there is a technical reason.

However, keep architecture sufficiently modular that the backend can later be moved to:

* Cloud Run
* AWS ECS
* standalone Node server
* Kubernetes

without rewriting the business logic.

==================================================
31. ENVIRONMENT CONFIGURATION
=============================

Create:

.env.example

Include examples such as:

DATABASE_URL=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=

Never hard-code secrets.

==================================================
32. PRISMA
==========

Create:

* schema.prisma
* migrations
* seed script

Create seed data for development:

* 1 admin user
* 2 judge users
* Performance 1
* Performance 2
* sample events
* sample students
* Team A
* Team B
* sample marks
* sample notifications

Clearly document development credentials in README only if they are generated specifically for local development and are not production credentials.

==================================================
33. DEMO DATA
=============

The seeded application should immediately show a realistic dashboard.

Include:

* students
* events
* teams
* performances
* marks
* edit requests
* notifications
* results

This allows the application to be reviewed without manually entering hundreds of records.

==================================================
34. IMPORTANT UI/UX REQUIREMENT
===============================

The attached screen recording is the visual reference.

Inspect it carefully and reproduce:

* navigation structure
* page structure
* labels
* terminology
* table organization
* filters
* modal/dialog flow
* button placement
* notification behavior
* marks-entry workflow
* round functionality
* result sections

Do NOT replace the shown application workflow with a generic dashboard template.

The result should clearly resemble the demonstrated WAD Judging System.

==================================================
35. BUSINESS RULES
==================

Implement these rules:

1. Student ID must be unique.
2. Student can have only one current team.
3. Judge can only access assigned performances.
4. Judge cannot modify protected marks without authorization.
5. Edit requests must have status.
6. Only administrators can approve/reject edit requests.
7. Approved edit requests must allow only the relevant authorized modification.
8. Every mark modification must be audited.
9. Results must be generated from stored marks.
10. Unauthorized API requests must return proper HTTP authorization errors.
11. Deleted/deactivated events must not corrupt historical results.
12. Historical marks must remain associated with their original performance/event context.

==================================================
36. CODE QUALITY
================

Follow production-level standards.

Requirements:

* strict TypeScript
* ESLint
* Prettier
* clear naming
* modular architecture
* reusable components
* no duplicated business logic
* no unnecessary `any`
* proper error handling
* typed API responses
* database transactions for critical operations
* comments only where they add real value

Do not generate one giant file containing the entire application.

==================================================
37. DOCUMENTATION
=================

Create a comprehensive README.md containing:

* Project overview
* Architecture
* Technology stack
* Folder structure
* Environment variables
* PostgreSQL setup
* Prisma migration instructions
* Seed instructions
* Local development instructions
* Test instructions
* Build instructions
* Docker instructions
* Deployment instructions
* Netlify deployment considerations
* Load testing instructions
* API overview
* Role/permission model

==================================================
38. IMPLEMENTATION PROCESS
==========================

Follow this sequence:

PHASE 1
Inspect screen recording and identify:

* all pages
* navigation
* forms
* dialogs
* tables
* filters
* actions
* workflows
* roles

PHASE 2
Design database schema and relationships.

PHASE 3
Create Prisma schema and migrations.

PHASE 4
Implement authentication and RBAC.

PHASE 5
Implement Admin functionality.

PHASE 6
Implement Judge/Performance functionality.

PHASE 7
Implement marks and multiple rounds.

PHASE 8
Implement edit requests and notifications.

PHASE 9
Implement result calculation and exports.

PHASE 10
Implement responsive UI and polish.

PHASE 11
Add tests.

PHASE 12
Add Docker/deployment support.

PHASE 13
Run lint, typecheck, tests, and production build.

Fix all errors before finishing.

==================================================
39. IMPORTANT INSTRUCTION ABOUT UNKNOWN BUSINESS RULES
======================================================

Where the screen recording does not provide enough information to determine an exact business rule, do NOT silently invent a complicated rule.

Instead:

* implement a sensible configurable design
* isolate the business rule in a service/configuration
* document the assumption in README
* make the rule easy to change later

This is especially important for:

* exact score calculation
* ranking/tie-breaking
* Top 8 rules
* All Rounders rules
* team scoring formulas
* final-result calculation

==================================================
40. FINAL ACCEPTANCE CRITERIA
=============================

The implementation is complete only when:

* Admin can register/login through the supported mechanism.
* Judge can login.
* Admin dashboard works with real database data.
* Student CRUD works.
* Student search/filter works.
* Event CRUD works.
* Team assignment works.
* Performance assignment works.
* Judge can access only assigned performances.
* Judge can search/filter students.
* Judge can enter marks.
* Judge can add multiple rounds.
* Marks persist in PostgreSQL.
* Marks are validated.
* Mark edit requests work.
* Admin receives notifications.
* Admin can approve/reject edit requests.
* Authorized mark modifications are audited.
* Results are calculated from marks.
* Results can be filtered.
* Results can be exported.
* Profile works.
* Logout works.
* Unauthorized API calls are rejected.
* Application is responsive.
* Loading/error/empty states work.
* Prisma migrations work.
* Seed script works.
* Docker setup works.
* Production build succeeds.
* TypeScript has no errors.
* ESLint has no blocking errors.
* Tests pass.
* Documentation is complete.

==================================================
41. DELIVERABLES
================

At the end, provide:

1. Complete source code
2. PostgreSQL/Prisma schema
3. Database migrations
4. Seed script
5. Authentication implementation
6. Role/permission implementation
7. All frontend pages
8. API implementation
9. Tests
10. Docker configuration
11. .env.example
12. README.md
13. API documentation
14. Load-testing configuration/examples
15. Deployment instructions

Do not stop after creating the UI.

The final result must be a functioning full-stack application backed by PostgreSQL.

Start by analyzing the attached screen recording, then implement the project in a clean, production-oriented way.
