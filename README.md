# Routsky: Global Route Intelligence

**AI-Powered, Agent-Driven Travel Route Planner** built with .NET 10, React 19, and PostgreSQL.

Routsky generates optimized multi-city travel itineraries by treating the Agent as the orchestrator. It uses Gemini 2.5 Flash to synthesize complex travel decisions based on passport visa rules, budget constraints, and real-time data — eliminating hardcoded logic and mock data.

---

## Architecture

```text
routsky/
├── Routsky.Api/          # .NET 10 Web API (Backend Orchestrator)
│   ├── Controllers/     # REST endpoints (Decision, Groups, Auth, Profile)
│   ├── Data/            # DbContext, DbInitializer, Seeders (EF Core)
│   ├── DTOs/            # Request/Response models
│   ├── Entities/        # Domain models (User, Group, Trip, SavedTrip)
│   ├── Services/        # Logic (Agent Orchestrator, MCP Atoms, Weather)
│   └── SeedData/        # JSON seed files
└── Routsky.Web/          # React 19 + Vite + Tailwind (Frontend)
    ├── src/
    │   ├── api/         # Axios API client
    │   ├── components/  # UI components (Globe, Analytics, Team)
    │   ├── context/     # Auth & Theme context
    │   └── pages/       # Discover, GroupDashboard, Analytics, Settings
    └── public/
```

---

## Key Features

- **Agent-as-Orchestrator:** The backend functions as an orchestrator, gathering "facts" (costs, flight times, visa status) via MCP atoms and passing them to the Gemini 2.5 Flash "Brain" for final reasoning and destination selection.
- **Geocoded Live Weather:** Dynamically fetches live weather for any city by first resolving coordinates via geocoding APIs, ensuring accuracy for even smaller regional hubs.
- **Strict Visa Integrity:** Visa requirements are treated as hard filters. If a member's passport requires a visa for a destination and it's not held, the orchestrator automatically eliminates that candidate.
- **Multi-Origin Group Intelligence:** Plan trips with friends departing from different cities (e.g., SYD, IST, BER). The engine calculates fair travel times and costs for the entire group.
- **Mission Control UI:** A high-performance, flat-designed dashboard featuring a real-time reactive Globe and premium analytics.

---

## Getting Started

### Prerequisites
- [.NET 10.0 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (Latest LTS)
- [PostgreSQL](https://www.postgresql.org/) (Running locally or via Docker)

### 1. Clone & Setup Database
```bash
git clone https://github.com/your-username/routsky.git
cd routsky
```

Configure your PostgreSQL connection string in `Routsky.Api/appsettings.json` (Note: Default dev port is **5433**):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5433;Database=routsky_db;Username=postgres;Password=yourpassword"
  }
}
```

### 2. Configure Gemini API
Routsky require a valid Google Gemini API Key. Set the key as an environment variable or in `appsettings.json`:
```bash
# Windows (PowerShell)
$env:Gemini__ApiKey = "your-api-key-here"
```

### 3. Start the Backend API
```bash
cd Routsky.Api
dotnet ef database update   # Apply migrations
dotnet run                  # Starts at http://localhost:5107
```

The database is **automatically seeded** on first run with 26 destinations, visa rules, and flight data.

### 4. Start the Frontend Web App
```bash
cd Routsky.Web
npm install   # Only needed the first time
npm run dev   # Starts at http://localhost:5173
```

---

## Authentication

| Account | Email | Password |
|---------|-------|----------|
| Admin | admin@routsky.com | Admin123! |

JWT-based authentication with protected routes. Register new accounts via `/register`.

---

## Production Deployment (routsky.com)

To ensure secure enterprise-grade production behavior, apply these configuration rules:

- `ASPNETCORE_ENVIRONMENT=Production`
- `JwtSettings:Secret` must be set in environment variables (or `appsettings.Production.json`):
  - `JWT_SETTINGS__SECRET="<strong-secret>"`
  - fallback for non-prod: `Jwt:Key` (`SuperSecretKeyForDevelopmentOnly123!` in dev only)

### OAuth security hardening
- Social callbacks are enforced to production frontend URL:
  - `https://routsky.com/auth/callback`
  - no `.xyz` or `localhost` redirect targets in production
- GitHub OAuth request scope includes `user:email`.
- `OnCreatingTicket` fetches email from `https://api.github.com/user/emails` if not provided.

### Cookie and proxy settings
- `app.UseForwardedHeaders()` is used first in the middleware pipeline for correct proxy URL scheme
- `CookiePolicyOptions.MinimumSameSitePolicy = SameSiteMode.Unspecified`
- Google/GitHub correlation cookies:
  - `SameSite=None`
  - `Secure=true`
  - `HttpOnly=true`

---

## How to Test

1. Open **http://localhost:5173** in your browser
2. Log in with the admin credentials above (or register a new account)
3. Explore the **Discover** page:
   - Enter your Passport, Budget, Duration, and preferred Region.
   - Click to find routes and let the backend orchestrator evaluate feasibility and budget.
4. Open the **Group Dashboard**:
   - Add members with different origins.
   - View dynamic cost comparisons, vote on destinations, and save favorites.
5. Check details: Open trip details to see **Real-Time Weather Insights** generated by the agent.
6. View the **Analytics** and **Settings** pages to customize the engine and see trip statistics.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | .NET 10, Entity Framework Core, PostgreSQL 16+ |
| Orchestration | Semantic Kernel (Agent Orchestrator) |
| AI | Gemini 2.5 Flash via Google AI SDK |
| Frontend | React 19, Vite, Tailwind CSS |
| UI | Framer Motion (Animations), Recharts, Lucide Icons |
| Map | React-Globe.gl (Three.js) |

---

## Seed Data

Seed data lives in `Routsky.Api/SeedData/` as JSON files:
- **`flights.json`** — Flight routes with min/avg/max price ranges and currency
- **`attractions.json`** — City attractions with estimated costs and durations

The seeder runs automatically on startup and only inserts data if the tables are empty. Core reference data (destinations, visa rules, admin user) is handled by `DbInitializer.cs`.

---

## License

This project is for educational and personal use.
