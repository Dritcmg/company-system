# Product Guidelines & Rules

## Code Style
- Follow Airbnb JavaScript/React Style Guide.
- TypeScript Strict Mode enabled.

## Naming Conventions
- **Variables/Functions:** `camelCase`.
- **Components/Classes:** `PascalCase`.
- **CSS/Files:** `kebab-case`.

## Git & Commits
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`).
- **Branching:** Git Flow (Simplified).
  - `main`: Production.
  - `develop`: Integration.
  - `feature/xxx`: New features.
  - `bugfix/xxx`: Fixes.

## Development Standards
- **Pull Requests:** Clear description, linked issues, mandatory review.
- **Testing:** 
  - Minimum 70% coverage on backend.
  - Unit tests for business logic.
  - E2E tests for critical flows (Login, Expense logging).
- **Security:** Input validation (Zod/Joi), Rate limiting, Helmet.js, Restricted CORS, Secrets via `.env`.
- **Performance:** Lazy loading, Code splitting, Optimized assets.
- **Accessibility:** ARIA labels, WCAG AA contrast.

## Business Rules
- Expenses > R$500 require extra confirmation.
- Default Categories: Food, Transport, Housing, Leisure, Health.
