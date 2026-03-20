# Development Workflow

## Typical Feature Flow
1. `git checkout develop`
2. `git pull`
3. `git checkout -b feature/name-da-feature`
4. Implementation phase.
5. Local testing & validation.
6. `git commit` (Conventional Commits).
7. `git push`.
8. Create PR & Peer Review.
9. Merge to `develop` & Delete branch.

## Review Focus
- Architecture alignment.
- Security vulnerabilities.
- Code legibility.
- Adherence to project guidelines.

## Releases
- Semantic Versioning (SemVer) tags on `main` (e.g., `v1.0.0`).
- Automated changelog generation.
