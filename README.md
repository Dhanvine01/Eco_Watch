# 🌿 EcoWatch

### Industrial Sustainability & Safety Intelligence Platform

EcoWatch is an IoT-driven industrial monitoring platform designed to improve **workplace safety, environmental monitoring, equipment inspection, and predictive maintenance**.

The platform combines real-time sensor telemetry, automated alerts, AI-powered visual inspection, predictive analytics, and cryptographic data integrity verification in a unified web application.

---

## ✨ Key Features

* **Real-Time IoT Monitoring** — Collect and monitor temperature, humidity, air quality, energy consumption, noise, water leakage, and fire-related data.
* **Safety Alert System** — Automatically detects threshold violations and critical safety conditions.
* **AI Visual Inspection** — Analyzes equipment images for corrosion, cracks, leaks, and other visible defects.
* **Predictive Maintenance** — Uses machine-learning models to identify abnormal equipment behavior and maintenance requirements.
* **Evidence & Data Integrity** — Uses SHA-256 hash chaining to detect unauthorized modification of historical telemetry.
* **Tampering Demonstration** — Includes a controlled simulation for demonstrating how data manipulation can be detected.
* **Equipment Management** — Maintains equipment history, sensor trends, alerts, and inspection records.
* **Role-Based Access** — Separate interfaces and permissions for administrators, inspectors, and workers.
* **Real-Time Dashboard** — Displays live sensor data and system alerts through a modern web interface.

---

## 🏗️ System Architecture

```text
┌─────────────────────┐
│   ESP32 + Sensors   │
└──────────┬──────────┘
           │
           │ Telemetry
           ▼
┌─────────────────────┐
│   Express Backend   │
│       :4000         │
└──────────┬──────────┘
           │
     ┌─────┼───────────────┐
     ▼     ▼               ▼
┌────────┐ ┌──────────┐ ┌──────────────┐
│Postgres│ │Alert     │ │SHA-256 Hash  │
│  DB    │ │Engine    │ │Chain         │
└────────┘ └──────────┘ └──────────────┘
           │
           ▼
┌─────────────────────┐
│   React Frontend    │
│       :5173         │
└─────────────────────┘
```

The system also includes a telemetry simulator for testing sensor events and abnormal operating conditions without physical hardware.

---

## 🛠️ Technology Stack

| Layer                   | Technology                      |
| ----------------------- | ------------------------------- |
| Frontend                | React, JavaScript               |
| Backend                 | Node.js, Express                |
| Database                | PostgreSQL                      |
| ORM                     | Prisma                          |
| IoT                     | ESP32                           |
| AI Inspection           | Qwen3-VL / OpenAI               |
| Machine Learning        | Python, Scikit-learn, XGBoost   |
| Real-Time Communication | Server-Sent Events (SSE)        |
| Security                | JWT, HTTP-only Cookies, SHA-256 |
| Development             | npm, Git, VS Code               |

---

## 👥 User Roles

### Administrator

* Monitor the entire facility
* View sensor telemetry and alerts
* Manage devices and equipment
* Run system simulations
* Review inspection priorities
* Verify data integrity

### Inspector

* Create inspection reports
* Upload equipment images
* Run AI-based defect analysis
* Review previous inspections

### Worker

* Monitor critical workplace safety conditions
* View fire and water-leak alerts
* Monitor environmental conditions
* Receive emergency notifications

---

## 🚀 Getting Started

### Prerequisites

Make sure the following are installed:

* Node.js `20.19+` or `22.12+`
* PostgreSQL `14+`
* npm `9+`
* Python `3.8+` *(optional, required for ML services)*

### 1. Clone the Repository

```powershell
git clone https://github.com/Dhanvine01/Eco_Watch.git
cd Eco_Watch
```

### 2. Configure Environment Variables

Create the backend environment file:

```powershell
copy backend\.env.example backend\.env
```

Update `backend\.env` with your PostgreSQL credentials:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ecowatch
JWT_SECRET=your-secure-secret-key
SIMULATION_ENABLED=true
AI_PROVIDER=auto
```

### 3. Install Dependencies

```powershell
npm run install:all
```

### 4. Initialize the Database

```powershell
cd backend

npx prisma migrate deploy
npx prisma db seed
```

The seed command creates the default users, devices, equipment, and initial system data.

### 5. Start the Application

From the project root:

```powershell
npm run dev
```

The application will be available at:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:4000
```

---

## 🔐 Demo Accounts

The following accounts are created automatically during database seeding.

| Role      | Email                      | Password      |
| --------- | -------------------------- | ------------- |
| Admin     | `admin@ecowatch.local`     | `password123` |
| Inspector | `inspector@ecowatch.local` | `password123` |
| Worker    | `worker@ecowatch.local`    | `password123` |

> **Note:** These credentials are intended only for local development and demonstration.

---

## 🔒 Data Integrity

EcoWatch includes a cryptographic integrity layer for telemetry records.

Each telemetry record is linked to the previous record using a **SHA-256 hash chain**. This allows the system to identify modifications to historical records.

```text
Telemetry Record
       ↓
 SHA-256 Hash
       ↓
Next Record
       ↓
 SHA-256 Hash
       ↓
Integrity Verification
```

The platform also provides a controlled tampering demonstration that intentionally modifies stored data and verifies whether the integrity chain detects the change.

---

## 🧪 Testing & Verification

### Backend

```powershell
cd backend

npx tsc --noEmit
npm test
```

### Frontend

```powershell
cd frontend

npm run build
```

---

## 📁 Project Structure

```text
Eco_Watch/
│
├── backend/
│   ├── prisma/
│   ├── src/
│   └── .env.example
│
├── frontend/
│   ├── src/
│   └── public/
│
├── package.json
└── README.md
```

---

## 🎯 Project Objective

EcoWatch aims to provide a unified platform for:

**Monitor → Detect → Analyze → Predict → Verify**

By combining IoT sensing, automated safety alerts, AI inspection, machine learning, and cryptographic verification, the system provides a practical approach to industrial safety and sustainability monitoring.

---

## 📄 License

This project is developed for **educational, industrial monitoring, and hackathon demonstration purposes** and is released under the [MIT License](LICENSE).
