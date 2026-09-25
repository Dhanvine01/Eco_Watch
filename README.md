# 🌿 EcoWatch — Industrial Sustainability & Safety Intelligence Platform

An enterprise-grade, IoT-driven industrial sustainability and workplace safety monitoring platform. Built with real-time sensor telemetry, deterministic alert engines, AI-powered visual defect inspection, cryptographic evidence & integrity verification, and predictive ML degradation analytics.

---

## 🔑 Login Credentials

> Seeded automatically by `npx prisma db seed`.

| Role | Email | Password | Landing Page | Primary Capabilities |
|------|-------|----------|--------------|----------------------|
| **Admin** | `admin@ecowatch.local` | `password123` | `/admin` | Complete facility oversight, energy telemetry, air quality, device management, simulation triggers, deterministic inspection priority queue, equipment degradation analytics, and Evidence & Integrity Center. |
| **Worker** | `worker@ecowatch.local` | `password123` | `/worker` | Streamlined safety dashboard: fire detection, water leak alerts, ambient temperature & humidity, air quality, and emergency safety notifications. |
| **Inspector** | `inspector@ecowatch.local` | `password123` | `/inspector` | Field inspection portal: file multi-point defect reports, upload visual evidence, trigger AI-powered corrosion/damage analysis, and track historical audit trails. |

---

## 🌟 Key Platform Features

### 1. 🛡️ Evidence & Integrity Center (Cryptographic Proof)
- **SHA-256 Hash Chaining:** Every incoming telemetry data packet is linked into an immutable cryptographic hash chain with parent hash anchoring.
- **Anchor Block Verification:** Verifies data authenticity against genesis block hashes to prove zero data loss or database tampering.
- **Interactive Tampering Simulation:** Live security demonstration mode that modifies historical sensor records to visibly trigger:
  $$\text{HASH MISMATCH} \longrightarrow \text{ANCHOR MISMATCH} \longrightarrow \text{TAMPERING DETECTED}$$
- **Pre-Audit Cryptographic Export:** Generate tamper-evident, auditor-ready JSON and PDF compliance packages with cryptographic verification checksums.

### 2. ⚡ Dual Ingestion Architecture (Real Hardware vs Simulation)
- **`ESP-001` (Assembly Floor):** Dedicated ingestion pipeline for physical hardware (ESP32 microcontrollers with DHT22, MQ-135, KY-038, and CT Current sensors) transmitting via authenticated `POST /api/v1/telemetry` using secure `x-device-key` headers.
- **`ESP-002` (Storage Bay):** Realistic automated background telemetry simulation for testing anomalies, threshold breaches, and stress testing.

### 3. 🎨 Verdant Green Luxury Aesthetics
- Tailored organic luxury theme featuring porcelain cream backgrounds (`#fbfbf9`), vibrant forest and emerald accents (`#4f7a38`, `#6fa350`), gold highlights, glassmorphism cards, and an interactive **click-spawn leaf particle animation**.

### 4. 🤖 Multi-Provider AI Vision Inspection
- Automated visual defect analysis for equipment corrosion, structural cracks, leaks, and safety hazards using Qwen3-VL / OpenAI GPT-4o with automated multi-tier fallback to an intelligent mock provider.

### 5. 🔮 Predictive ML Sensor Analytics
- Python-powered Scikit-Learn / XGBoost models analyzing equipment energy draw patterns, temperature anomalies, and vibration metrics to predict Remaining Useful Life (RUL) and maintenance urgency.

---

## ⚡ Quick Start

### Prerequisites
- **Node.js:** `^20.19` or `≥22.12`
- **PostgreSQL:** `14+` running on `localhost:5432`
- **npm:** `9+` (bundled with Node)
- **Python (Optional for ML Service):** `3.8+`

---

### Step 1: Clone and Configure Environment

```powershell
# Clone the repository
git clone https://github.com/Dhanvine01/Eco_Watch.git
cd Eco_Watch

# Backend Environment
copy backend\.env.example backend\.env
```

Ensure `backend\.env` contains your PostgreSQL credentials:
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ecowatch
JWT_SECRET=super-secure-secret-key-change-in-production-min-32-chars
SIMULATION_ENABLED=true
AI_PROVIDER=auto
```

---

### Step 2: Install Dependencies

```powershell
# Install root, backend, and frontend dependencies
npm run install:all
```
*(Or install manually in each folder: `cd backend && npm install` then `cd ../frontend && npm install`)*

---

### Step 3: Initialize Database & Seed Data

```powershell
cd backend
# Run migrations and generate Prisma client
npx prisma migrate deploy
# Seed default users, devices, zones, and equipment
npx prisma db seed
```

---

### Step 4: Run Development Servers

You can launch both backend and frontend concurrently from the root directory:

```powershell
# From the project root
npm run dev
```

Or run them individually in separate terminals:
```powershell
# Terminal 1 — Backend (Port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (Port 5173 / 5174)
cd frontend
npm run dev
```

Open your browser at **`http://localhost:5173`** (or **`http://localhost:5174`**).

---

## 🗺️ Application Routes

### Admin Portal (`/admin/*`)
| URL | Description |
|-----|-------------|
| `/admin` | Real-time overview: live sensor telemetry, active alerts, simulation controls |
| `/admin/integrity` | **Evidence & Integrity Center:** SHA-256 hash-chain validator, tampering simulation demo, audit export |
| `/admin/energy` | High-frequency voltage, current, and energy consumption metrics |
| `/admin/air-quality` | MQ-135 sensor metrics: CO, CO2, smoke, and air quality index (AQI) |
| `/admin/temp-humidity` | DHT22 temperature and relative humidity tracking |
| `/admin/noise` | KY-038 acoustic noise and decibel monitoring |
| `/admin/water-fire` | Critical safety triggers: flame detection and water leak sensors |
| `/admin/alerts` | Alert management dashboard with acknowledgment and resolution tools |
| `/admin/devices` | IoT device health status, signal strength, and firmware status |
| `/admin/history` | Multi-sensor historical time-series charts |
| `/admin/inspections` | Prioritized inspection queue calculated via deterministic scoring |
| `/admin/equipment/:id/history` | Full equipment lifecycle: sensor trends, alert logs, and inspection records |

### Inspector Portal (`/inspector/*`)
| URL | Description |
|-----|-------------|
| `/inspector` | Inspection dashboard: submitted reports, quick actions, pending audits |
| `/inspector/new` | File new inspection with severity rating, zone selection, and photo upload |
| `/inspector/history` | Complete historical inspection logs with status filtering |
| `/inspector/history/:id` | Inspection details with AI-assisted visual analysis feedback |

### Worker Portal (`/worker`)
| URL | Description |
|-----|-------------|
| `/worker` | Simplified industrial floor safety monitor: fire, water leak, air quality alerts |

---

## 🔌 Core API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | None | Backend service health check |
| `/api/v1/auth/login` | POST | None | Authenticate user & issue httpOnly cookie |
| `/api/v1/auth/logout` | POST | Cookie | Destroy active session |
| `/api/v1/auth/me` | GET | Cookie | Current session info |
| `/api/v1/readings/latest` | GET | Cookie | Latest telemetry readings per device |
| `/api/v1/readings/history` | GET | Cookie | Time-series sensor history |
| `/api/v1/stream` | GET | Cookie | Real-time Server-Sent Events (SSE) telemetry stream |
| `/api/v1/telemetry` | POST | Device Key | Ingest real ESP32 hardware telemetry packets |
| `/api/v1/alerts` | GET | Cookie | Fetch active system alerts |
| `/api/v1/alerts/:id/resolve` | POST | Admin | Acknowledge & resolve an active alert |
| `/api/v1/equipment` | GET | Authenticated | List all monitored equipment assets |
| `/api/v1/inspections` | POST | Inspector/Admin | Submit inspection record |
| `/api/v1/inspections/:id/images` | POST | Inspector/Admin | Upload visual inspection photos |
| `/api/v1/simulation/scenario` | POST | Admin | Trigger simulated anomaly scenarios |

---

## 🛠️ Verification & Quality Checks

```powershell
# Backend Typecheck & Tests
cd backend
npx tsc --noEmit
npm test

# Frontend Production Build
cd frontend
npm run build
```

---

## 🏗️ Architecture

```
[ ESP32 Hardware (ESP-001) ] ──┐
                              │  POST /api/v1/telemetry (x-device-key)
[ Telemetry Simulator (ESP-002) ] ─┴─► [ Express 5 Backend :4000 ]
                                         │
                 ┌───────────────────────┼────────────────────────┐
                 ▼                       ▼                        ▼
         [ PostgreSQL DB ]       [ Rule Alert Engine ]    [ SHA-256 Hash Chain ]
         (Prisma ORM)            (Instant evaluation)     (Cryptographic Integrity)
                 │                       │                        │
                 └───────────────────────┼────────────────────────┘
                                         ▼
                             [ SSE Stream /api/v1/stream ]
                                         │
                                         ▼
                             [ React 19 Frontend :5173 ]
```

---

## 📄 License

This project is developed for industrial monitoring and educational hackathon demonstration. Open source under the [MIT License](LICENSE).
