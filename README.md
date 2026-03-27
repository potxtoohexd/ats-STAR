# checkATS - Project Access Guide

This is a **full-stack application** with a Java/Spring Boot backend and a React/TypeScript frontend.

---

## Project Structure

```
c:/AppDev/checkATS/
├── src/                    # Java source code (Backend)
│   ├── main/java/com/checkATS/
│   │   ├── Main.java       # Main application entry
│   │   ├── controller/     # REST controllers
│   │   ├── model/          # Data models
│   │   └── service/        # Business logic
│   └── test/               # Unit tests
├── frontend/               # React frontend (Frontend)
│   ├── src/                # React components
│   ├── package.json        # Node dependencies
│   └── vite.config.ts      # Vite configuration
└── pom.xml                 # Maven configuration
```

---

## Accessing the Java Folder (Backend)

The Java code is located in the `src/` directory:

| Path | Description |
|------|-------------|
| `src/main/java/com/checkATS/Main.java` | Main Spring Boot application |
| `src/main/java/com/checkATS/controller/` | REST API controllers |
| `src/main/java/com/checkATS/model/` | Data models |
| `src/main/java/com/checkATS/service/` | Service layer |

### Running the Backend

```bash
# Using Maven (from project root)
mvn spring-boot:run

# Or compile first
mvn clean install
mvn spring-boot:run
```

**Requirements:** JDK 21+

---

## Accessing the Frontend

The frontend is in the `frontend/` directory:

| Path | Description |
|------|-------------|
| `frontend/src/App.tsx` | Main React component |
| `frontend/src/main.tsx` | Application entry point |
| `frontend/index.html` | HTML template |

### Running the Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

This will start the frontend at **http://localhost:5173** (default Vite port).

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Java 21, Spring Boot, Spring AI |
| Frontend | React 18, TypeScript, Vite |
| Build Tool (Backend) | Maven |
| Package Manager (Frontend) | npm |

---

## Quick Commands Summary

```bash
# Backend
mvn spring-boot:run

# Frontend
cd frontend && npm install && npm run dev
```
