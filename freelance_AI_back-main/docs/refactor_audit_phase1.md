# Phase 1 Audit Report: Backend Refactor Baseline

## Scope and Method

This report implements Phase 1 of the agreed refactor plan: baseline audit and prioritization before mutating architecture.

Covered:
- `cmd/**/*.go`
- `internal/**/*.go`
- `migrations/*.sql`
- `scripts/*`, `run.sh`, `track_ps.expect`
- `go.mod`, `go.sum`

Excluded from line-by-line reading:
- binary/media assets under `storage/media/**`

Audit approach:
- static inventory and metrics across all source files
- targeted deep reads of hotspots and integration points
- route extraction from router
- error/response/auth-context consistency checks
- baseline validation with tests and vet

## Baseline (verified)

- `go test ./...` passes
- `go vet ./...` passes
- No `.git` metadata in this project directory snapshot

## Inventory Summary

### Size / layout

- Total text artifacts in repo scan (`.go/.sql/.sh/.ps1`): `209`
- Go files in `internal/`: `187`
- Total Go LOC (`internal` + `cmd`): `32453`
- Test files: `16`
- Disabled tests: `internal/service/order_service_test.go.disabled`

### Hotspots by file size

1. `internal/service/order_service.go` (~2473 LOC)
2. `internal/http/handlers/ai_order_handler.go` (~1687 LOC)
3. `internal/repository/order_repository.go` (~1447 LOC)
4. `internal/ai/order_actions.go` (~1268 LOC)
5. `internal/service/seed_service_extended.go` (~998 LOC)

### Architectural duplication indicators

- Direct `c.JSON/AbortWithStatusJSON` usages across handlers: `~435`
- Shared `response.*` helper usages in new HTTP layer: `~113`
- Handler methods across both HTTP handler packages: `~151`
- Route registrations in `internal/http/router/router.go`: `167`

## System Map (current state)

Runtime path (observed):
- `cmd/server/main.go` -> `config`, `db`, migrations, seeding
- constructs **legacy repositories/services** and **new persistence/usecases/handlers** in the same composition root
- `internal/http/router/router.go` wires both legacy and new handlers behind the same API tree

Parallel stacks currently coexist:
- HTTP layer:
  - `internal/http/handlers` (legacy/feature handlers)
  - `internal/interface/http/handler` (new handlers)
- persistence layer:
  - `internal/repository` (legacy repositories on `internal/models`)
  - `internal/infrastructure/persistence` (adapters on `internal/domain/entity`)
- data model layer:
  - `internal/models`
  - `internal/domain/entity`

This is the primary structural cause of complexity and duplicated behavior.

## API / Routing Audit

### Key observations

- `internal/http/router/router.go` contains a very large monolithic route registration function with many optional branches.
- `/api` contains a mixed surface (legacy feature handlers + new clean handlers).
- `/api/v2` is added inside the same router file and duplicates many `v1` routes/behaviors.
- The router file is acting as routing, migration strategy, and compatibility policy at the same time.

### Concrete examples

- Mixed dependencies and oversized signature: `internal/http/router/router.go:15`
- Primary API route registration begins: `internal/http/router/router.go:66`
- Large protected route block: `internal/http/router/router.go:114`
- Secondary `/api/v2` route tree duplicates resources: `internal/http/router/router.go:263`

### Impact

- High probability of route drift (same feature behaves differently in `/api` vs `/api/v2`)
- Hard to reason about auth/validation/error consistency
- Difficult to isolate feature modules for refactor

## Error Handling / Exceptions Audit

### Current mechanisms (in parallel)

1. Legacy middleware maps errors via string/sentinel heuristics:
- `internal/http/middleware/error_handler.go:17`
- Uses repository sentinels and keyword matching (`sql`, `internal`, etc.) to infer HTTP status
- Returns `gin.H{"error": "..."}`

2. New `apperror` typed errors:
- `internal/pkg/apperror/errors.go:9`
- Has structured code + HTTP status mapping

3. New response envelope helper:
- `internal/interface/http/response/response.go:11`
- Supports `success/data/error` and pagination envelope

### Inconsistencies found

- Error middleware depends on **legacy repository sentinels** instead of `apperror` (`internal/http/middleware/error_handler.go:42`)
- String-based status inference can misclassify errors (`internal/http/middleware/error_handler.go:52`)
- Many new handlers still bypass `response.*` and return raw `gin.H` (`internal/interface/http/handler/user_handler.go:100`)
- Response formats are mixed across endpoints (`gin.H` vs structured envelope)

### Risk

- Inconsistent client contracts and brittle behavior under refactor
- Error masking behavior is non-deterministic and language/string dependent

## Auth Context / HTTP Helper Audit

### Context key/type inconsistency (important)

`AuthMiddleware` writes both:
- `userID` as **string**: `internal/http/middleware/auth.go:35`
- `user_id` as **uuid.UUID**: `internal/http/middleware/auth.go:36`

Meanwhile:
- New helper expects `user_id` as `uuid.UUID`: `internal/interface/http/handler/helpers.go:11`
- Several handlers manually read `userID` string and parse UUID themselves: `internal/interface/http/handler/user_handler.go:153`
- Legacy helper `currentUserID` reads `middleware.ContextUserIDKey` (`userID`) but asserts `uuid.UUID`, which conflicts with middleware storing string there: `internal/http/handlers/helpers.go:15`

### Impact

- Hidden runtime bugs depending on which helper/handler path is used
- Duplicate parsing/authorization code across handlers
- Blocks reliable handler-level unification

## Persistence / Domain Model Audit

### Model duplication

Overlapping model names exist in both layers (at least):
- `order`, `user`, `payment`, `conversation` in `internal/models` and `internal/domain/entity`

This indicates active parallel domain representations, not just transitional adapters.

### Repository duplication

Overlapping repository/adapters exist (examples):
- `order`, `payment`, `notification`, `portfolio`, `review`, `user`

### Adapter coupling to legacy repository (architecture leak)

`OrderRepositoryAdapter` imports and stores legacy repository directly:
- `internal/infrastructure/persistence/order_repository_adapter.go:15`
- `internal/infrastructure/persistence/order_repository_adapter.go:19`

This means the “new” persistence layer is not fully independent and still depends on the legacy implementation.

### Unused generic repository helpers (dead/abandoned abstraction)

`internal/repository/common/db_helpers.go` contains generic helpers (`GetByID`, `GetByField`, `BatchInserter`, `WithTransaction`) but no usages were found in `internal/**`.

Impact:
- maintenance burden with no runtime value
- confusing signal about intended repository standardization

## Service / Use Case Boundary Audit

### Oversized legacy service as anti-boundary

`internal/service/order_service.go` is a high-risk aggregation point:
- very large file
- giant repository interface with order/proposal/conversation/message/AI-related methods in one contract (`internal/service/order_service.go:18`)
- AI and WS responsibilities included in same service abstraction (`internal/service/order_service.go:76`, `internal/service/order_service.go:116`)

This violates SRP and prevents isolated refactors by capability.

### Composition root mixes both eras

`cmd/server/main.go` constructs:
- legacy repos (`cmd/server/main.go:77`)
- new repos/adapters (`cmd/server/main.go:94`)
- new use cases (`cmd/server/main.go:109`)
- legacy services for compatibility (`cmd/server/main.go:211`)

This is the main refactor bottleneck and first target for decomposition.

## Migrations / DB / Scripts Audit

### Positive findings

- Migrations are idempotent-oriented (`IF NOT EXISTS` guards, defensive DDL)
- Custom migration runner tracks applied migrations in `schema_migrations`
- Migration application is transactional per file (`internal/db/postgres.go:92`)

### Issues and risks

#### P0 security exposure in repo artifacts

- Hardcoded SSH password and host in `track_ps.expect:3` and `track_ps.expect:5`
- Hardcoded DB credentials in `scripts/init_db.go:12`
- Hardcoded multiple DB DSNs with passwords in `scripts/inspect_db/main.go:29`

These should be treated as secrets exposure and removed/rotated immediately.

#### P2 tooling/schema drift in reset script

- `scripts/reset_db.sql` drops `author_type` (`scripts/reset_db.sql:45`) but schema creates `message_author` in migration `0001_init.sql`
- Script also references tables not present in current migrations (`ai_cache`, `skill_categories`, `message_read_status`), indicating drift

Impact:
- reset tooling not aligned with actual schema evolution
- creates false confidence during local recovery/debugging

#### P2 migration-runner limitation to document

- `internal/db/postgres.go` executes an entire migration file in one transaction (`internal/db/postgres.go:92`)
- This is fine today, but future migrations using non-transactional DDL (e.g. `CREATE INDEX CONCURRENTLY`) will fail unless the runner gains per-file transaction mode flags

## Test Audit (coverage shape, not line coverage)

Current tests are concentrated in:
- `internal/usecase/*` (most coverage)
- some `internal/service/*` legacy tests
- minimal handler tests (`internal/http/handlers`, `internal/interface/http/handler`)

Notable gaps:
- router contract tests (none)
- middleware behavior contract tests (auth/error/cors/rate-limit)
- migration runner tests
- repository integration tests for legacy/new parity
- compatibility tests between `/api` and `/api/v2` duplicates

Disabled test:
- `internal/service/order_service_test.go.disabled`
  - likely reflects instability/maintenance pain in legacy `OrderService` boundary

## Prioritized Findings (P0–P3)

## P0 (security / critical risk)

1. **Hardcoded SSH password and target host in repo**
- File: `track_ps.expect:3`
- File: `track_ps.expect:5`
- Symptom: plaintext root SSH password and host committed
- Effect: credential leak, infra compromise risk
- Refactor/fix: remove file or replace with env-based secure helper; rotate credentials immediately
- Risk of change: low code risk, high operational urgency

2. **Hardcoded DB credentials in utility scripts**
- File: `scripts/init_db.go:12`
- File: `scripts/inspect_db/main.go:29`
- File: `scripts/inspect_db/main.go:30`
- Symptom: plaintext DSNs/passwords
- Effect: credential leak and accidental usage against wrong DB
- Refactor/fix: env-only DSN loading; explicit `--dsn` flag; scrub secrets from repo history if possible
- Risk of change: low

## P1 (architectural blockers)

1. **Dual architecture stacks active in runtime**
- File: `cmd/server/main.go:77`
- File: `cmd/server/main.go:94`
- File: `cmd/server/main.go:211`
- Symptom: legacy + new repos/services/usecases wired simultaneously
- Effect: refactor complexity, behavior drift, difficult dependency ownership
- Refactor: extract composition modules and isolate compatibility layer behind explicit module boundary
- Risk: medium/high (touches startup wiring)

2. **Monolithic router mixing versions and migration strategy**
- File: `internal/http/router/router.go:15`
- File: `internal/http/router/router.go:114`
- File: `internal/http/router/router.go:263`
- Symptom: one file owns `/api`, `/api/v2`, optional legacy features, and compatibility routes
- Effect: route drift, hard reviews, difficult automated contract testing
- Refactor: split registration by feature and API version; central registry composes modules
- Risk: medium

3. **Inconsistent error contract across HTTP stack**
- File: `internal/http/middleware/error_handler.go:17`
- File: `internal/pkg/apperror/errors.go:9`
- File: `internal/interface/http/response/response.go:11`
- Symptom: three parallel error/response strategies
- Effect: inconsistent client payloads and fragile error mapping
- Refactor: single app error taxonomy + one HTTP encoder
- Risk: medium/high (API-visible)

4. **Auth context key/type inconsistency**
- File: `internal/http/middleware/auth.go:35`
- File: `internal/http/middleware/auth.go:36`
- File: `internal/http/handlers/helpers.go:17`
- File: `internal/interface/http/handler/helpers.go:12`
- Symptom: same user identity stored under multiple keys/types
- Effect: hidden runtime bugs, duplicated parsing, handler fragility
- Refactor: one typed context accessor package; middleware writes one canonical type
- Risk: medium

5. **New persistence adapter depends on legacy repo**
- File: `internal/infrastructure/persistence/order_repository_adapter.go:15`
- File: `internal/infrastructure/persistence/order_repository_adapter.go:21`
- Symptom: clean adapter imports legacy repository package
- Effect: architecture layering violation, prevents true decommissioning
- Refactor: move shared SQL into internal private package or fully port logic into adapter
- Risk: medium

## P2 (duplication / technical debt)

1. **Large proportion of handlers bypass shared response helper**
- Files: many, e.g. `internal/interface/http/handler/user_handler.go:100`
- Symptom: raw `c.JSON` dominates even in new handler package
- Effect: repeated status/message logic, inconsistent envelopes
- Refactor: standardized responder + handler helper wrappers
- Risk: medium

2. **Oversized legacy `OrderService` boundary**
- File: `internal/service/order_service.go:18`
- Symptom: giant cross-domain interface and mixed responsibilities
- Effect: untestable changes, poor separation of concerns
- Refactor: split by bounded contexts (orders, proposals, conversations, AI augmentation)
- Risk: high if done in one shot, medium if staged

3. **Unused generic repository helper package**
- File: `internal/repository/common/db_helpers.go:1`
- File: `internal/repository/common/errors.go:1`
- Symptom: no usages found
- Effect: dead abstractions/noise
- Refactor: remove or adopt deliberately after design decision
- Risk: low

4. **Schema reset script drift**
- File: `scripts/reset_db.sql:45`
- Symptom: wrong enum/type name (`author_type` vs `message_author`)
- Effect: reset tooling mismatch and maintainability issues
- Refactor: regenerate/reset script from actual schema contracts or replace with migration rollback strategy
- Risk: low

## P3 (cleanup / consistency)

1. **Mixed language and phrasing in API errors**
- Example files: `internal/interface/http/handler/user_handler.go`, `internal/http/middleware/error_handler.go`
- Symptom: Russian + English messages mixed
- Effect: inconsistent client UX/docs
- Refactor: centralize error message catalog

2. **Commented-out legacy constructor arguments in router/main**
- Files: `internal/http/router/router.go`, `cmd/server/main.go`
- Effect: visual noise and unclear deprecation status
- Refactor: remove after compatibility layer extraction

## Refactor Roadmap (implementation-ready order)

### Stage 3.1 — Composition Root + Router modularization (first implementation stage)

Target:
- decompose `cmd/server/main.go` into packages under `internal/app` (or similar):
  - `bootstrap` (config/db/logger)
  - `modules/legacy_compat`
  - `modules/clean_api`
  - `modules/feature_*` (optional)
- split route registration:
  - `register_public_routes`
  - `register_api_v1_routes`
  - `register_api_v2_routes`
  - feature sub-registrars (orders, proposals, conversations, users, payments, etc.)

Acceptance:
- same server boots successfully
- `go test ./...`, `go vet ./...` green
- route snapshot (count/path list) unchanged unless intentionally changed

### Stage 3.2 — HTTP contract unification

Target:
- single response encoder package
- single error mapping package using `apperror`
- canonical auth-context accessor (`GetUserID`, `GetRole`) with typed storage

Acceptance:
- no handler reads raw context keys directly
- no string-based HTTP status inference in middleware
- handler tests for auth/error envelopes added

### Stage 3.3 — Service/usecase boundary cleanup

Target:
- stop adding features to legacy `service/*`
- move feature logic to `usecase/*`
- make handlers thin and orchestration-only

Acceptance:
- legacy `OrderService` usage isolated or removed from request path

### Stage 3.4 — Repository consolidation

Target:
- one repository implementation path per entity in runtime
- remove adapter->legacy imports
- standardize transactions and SQL helper usage

Acceptance:
- parity tests for core entities (orders/payments/users)

### Stage 3.5 — Domain model alignment

Target:
- choose one canonical runtime model set for API/application path
- explicit DTO mappers only at boundaries

Acceptance:
- reduced cross-package conversions
- no ambiguous `models` vs `entity` ownership for same feature

### Stage 3.6 — AI/WS/oversized handler decomposition

Target:
- split `ai_order_handler` and related AI orchestration
- extract SSE/streaming helpers and response streaming primitives

Acceptance:
- reduced file sizes and simpler tests for streaming behavior

### Stage 3.7 — Dead code removal / final cleanup

Target:
- remove compatibility bridges, dead helpers, disabled tests (after replacement)
- simplify naming and package layout

Acceptance:
- no unused compatibility artifacts remain in runtime path

## Recommended Immediate Actions (before Stage 3.1 coding)

1. Remove and rotate exposed secrets (`track_ps.expect`, script DSNs).
2. Freeze API contract changes temporarily while route inventory snapshots are added.
3. Add route inventory regression test (path+method dump) before router refactor.
4. Add middleware contract tests for auth context and error payloads.

## Regression Scenarios to Preserve During Refactor

- Auth: register/login/refresh/session lifecycle
- Orders: create/list/get/update/publish/delete and `/my`
- Proposals: create/list/status updates/my proposal
- Conversations/messages/reactions CRUD
- Payments/escrow hold/release/refund/list
- Notifications list/count/read/delete
- Profile/portfolio/reviews public and self endpoints
- WebSocket auth and connection upgrade path
- AI streaming endpoints (SSE formatting and auth)

## Notes for Next Execution Turn

The next implementation step should be **Stage 3.1 only** (composition root + router modularization), while preserving behavior and adding route snapshot tests first.
