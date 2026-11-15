# SprintBoard 🚀
### Real-Time Collaborative Issue Tracker & Project Management Platform

SprintBoard is a modern, responsive, full-stack collaborative issue and task management SaaS application built with the **MERN** stack (MongoDB, Express.js, React, Node.js) and **Socket.IO**. Designed for high-performing engineering teams, SprintBoard enables users to create projects, manage agile issues with interactive drag-and-drop Kanban boards, filter and search backlogs with backend query parameters, inspect real-time dashboard analytics, and trace every status transition via an activity audit trail.

---

## 📋 Technical Assessment Compliance & Features Implemented

| Requirement Category | Specification | Implementation Details & Status |
| :--- | :--- | :--- |
| **1. Authentication & User Management** | User registration, login, JWT authentication, bcrypt hashing, protected routes & APIs | **Complete**: Full JWT auth flow, password salt rounds, protected React Router routes, authorization header verification. |
| **2. Project Management** | Create, view, details, update, delete projects. Ownership isolation. | **Complete**: Full CRUD with owner verification (`createdBy → User`). Members manage only their own projects; Admin oversight. |
| **3. Issue Management** | Title, description, status (`To Do`, `In Progress`, `Done`), priority (`Low`, `Medium`, `High`), project association | **Complete**: Interactive Kanban board (drag & drop status change), inline dropdown updates, full CRUD modals. |
| **4. Dashboard & Analytics** | 6 live MongoDB metric cards, progress bars, recent projects & issues | **Complete**: Total projects, total issues, open issues, in progress issues, completed issues, high-priority issues, % completion rate. |
| **5. Advanced Feature – Issue Filtering** | Filter by Status, Priority, Project via backend query parameters | **Complete**: `GET /api/issues?status=in-progress&priority=high&projectId=...` handled efficiently in MongoDB query layer. |
| **6. Search Functionality** | Debounced search by issue title on frontend; backend regex search | **Complete**: 350ms frontend debouncing, sanitized regex matching, empty/invalid input handling. |
| **7. Activity Log – Challenge Feature** | Automatic record when issue is created, updated, or moved to another status | **Complete**: Stores User ID, Issue ID, Project ID, Action description (e.g., *"Hritik changed issue status from To Do to In Progress"*). Displayed on Project Details page. |
| **Bonus Challenge 1: Real-Time Updates** | Socket.IO live updates across connected clients without page refresh | **Complete**: Socket.IO server & client integrated. Status changes, new issues, and deletions sync instantly. |
| **Bonus Challenge 2: Role-Based Access** | Admin and Member roles with differentiated permissions | **Complete**: `admin` can oversee and manage workspace-wide projects and issues; `member` manages their own. |
| **Bonus Challenge 3: Pagination** | Backend pagination for issues (`?page=1&limit=10`) | **Complete**: `GET /api/issues?page=1&limit=10` returns total count, total pages, current page, and slice. |

---

## 🛠 Technology Stack

### Frontend (`client/`)
- **React.js 19** (Modern React Hooks: `useState`, `useEffect`, `useRef`, Context API)
- **Vite 6** (Fast ESM bundler & optimized production build)
- **React Router 7** (Protected route guards, nested layouts, client-side navigation)
- **Socket.IO Client** (Instant real-time WebSocket connection for live issue updates)
- **Axios** (Configured with request/response interceptors for automatic JWT token injection)
- **Lucide React** (Clean, modern iconography)
- **Custom SaaS CSS Design System** (Typography, responsive flex/grid layouts, card containers, data tables, modals, badges, drag-and-drop Kanban lanes)

### Backend (`server/`)
- **Node.js** & **Express.js** (REST API following clean MVC Architecture)
- **Socket.IO** (Bi-directional real-time WebSocket event gateway)
- **MongoDB & Mongoose** (Schemas, relational population, indexing, data modeling)
- **Embedded In-Memory MongoDB Fallback** (`mongodb-memory-server` ready out-of-the-box with zero database setup required)
- **JSON Web Tokens (JWT)** (Stateless secure authentication)
- **bcryptjs** (Salted password hashing)
- **Morgan & CORS** (HTTP request logging and cross-origin resource sharing)

---

## 📁 Repository Structure

```
SprintBoard/
├── client/                        # React Application (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/            # Common UI (Button, Modal, Card, Badge, ProtectedRoute)
│   │   │   └── layout/            # Layout, Navbar, Sidebar
│   │   ├── context/               # AuthContext (login, register, session)
│   │   ├── pages/
│   │   │   ├── Dashboard/         # 6 Live Metric Cards & Analytics
│   │   │   ├── Projects/          # Project Listing, Create/Edit, Table/Card views
│   │   │   ├── ProjectDetails/    # Project Hub, Issues List, Activity Log Timeline
│   │   │   ├── Issues/            # Interactive Kanban Board, Debounced Search, Multi-Filter
│   │   │   ├── Login/             # Sign In
│   │   │   └── Register/          # Registration
│   │   └── services/              # API, Auth, Project, Issue, Activity, Socket Services
│   ├── .env                       # Client environment variables
│   ├── .env.example               # Client environment template
│   └── package.json
│
├── server/                        # Node.js + Express REST API
│   ├── config/
│   │   └── db.js                  # Atlas connection with auto In-Memory fallback
│   ├── controllers/               # Auth, Project, Issue, Activity, Dashboard controllers
│   ├── middleware/                # JWT Auth guard & centralized Error handler
│   ├── models/                    # User, Project, Issue, Activity Mongoose models
│   ├── routes/                    # API route definitions
│   ├── utils/                     # Activity logger, Token generator, Seeder
│   ├── .env                       # Server environment variables
│   ├── .env.example               # Server environment template
│   ├── index.js                   # Express + Socket.IO server entry point
│   └── package.json
│
├── package.json                   # Root orchestrator scripts (concurrently)
├── .env.example                   # Root environment variables reference
└── README.md                      # Complete Project Documentation
```

---

## ⚡ Zero-Config "Ready to Use" Out of the Box

SprintBoard features an **intelligent dual-mode database engine**:
1. **Automatic In-Memory Fallback**: If you do not configure a MongoDB Atlas connection string, the server automatically starts an embedded in-memory MongoDB database and auto-seeds initial demo data. The entire app is **100% functional immediately** with zero setup.
2. **MongoDB Atlas Support**: Simply paste your MongoDB Atlas connection string into `server/.env` (`MONGODB_URI=...`) to switch to your cloud database cluster.

---

## 🚀 Installation & Quick Start

### 1. Clone the repository
```bash
git clone <repository_url>
cd SprintBoard
```

### 2. Install dependencies
```bash
npm run install:all
```
*(Or install in `server` and `client` individually: `cd server && npm install && cd ../client && npm install`)*

### 3. Environment Variables
Create `.env` in `server/` (or use the defaults provided in `.env.example`):
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=sprintboard_super_secret_jwt_key_2026_production
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

In `client/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 4. Run the Application
Start both backend and frontend concurrently with a single command from root:
```bash
npm run dev
```

- **Frontend Client**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Health Check & Socket Status**: `http://localhost:5000/api/health`

---

## 🔑 Default Demo Login Credentials

The database is pre-seeded with realistic projects, issues, and activity logs:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `demo@sprintboard.com` | `Password123!` | Full workspace oversight across all projects and issues |
| **Member** | `sarah@sprintboard.com` | `Password123!` | Manages personal projects and assigned deliverables |

*(You can also register any new user account via `/register` at any time).*

---

## 🧪 API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user & receive JWT token
- `GET  /api/auth/profile` - Get authenticated user profile *(Protected)*

### Projects
- `GET    /api/projects` - View projects (`?status=...&priority=...&search=...`) *(Protected)*
- `POST   /api/projects` - Create a new project *(Protected)*
- `GET    /api/projects/:id` - View single project details & metrics *(Protected)*
- `PUT    /api/projects/:id` - Update project *(Protected)*
- `DELETE /api/projects/:id` - Delete project and cascade-delete issues *(Protected)*

### Issues
- `GET    /api/issues` - Filter & search issues (`?status=in-progress&priority=high&projectId=...&search=...&page=1&limit=10`) *(Protected)*
- `POST   /api/issues` - Create issue & broadcast WebSocket event *(Protected)*
- `PUT    /api/issues/:id` - Update issue status/priority & log activity *(Protected)*
- `DELETE /api/issues/:id` - Delete issue & broadcast WebSocket event *(Protected)*

### Dashboard & Analytics
- `GET    /api/dashboard/stats` - Live aggregated metrics directly from MongoDB *(Protected)*

### Activity History
- `GET    /api/activities` - Live activity audit trail (`?projectId=...`) *(Protected)*
