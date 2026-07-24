# Filestash Fork — Upgrade Notes (upstream `b48ed3c`)

> Authoritative process doc: `STARLAB1733/starforging` → `services/stardrive/docs/operations/upgrading.md`.
> If this file disagrees with it, **`upgrading.md` wins.**

## Branch model

| Branch | Role |
|---|---|
| `master` | Mirror of latest upstream (`mickael-kerjean/filestash`), synced via GitHub "Sync fork". Not prod. |
| `fork` | Production = `master` + our 2 custom commits. This is what ships. |

Upgrade = replay the 2 custom commits onto the latest `master`. As of 2026-07-24, `origin/master`
= `upstream/master` = **`b48ed3c1`** (the current upstream tip), and `fork` is **178 commits behind**
it (`git rev-list --left-right --count origin/master...origin/fork` → `178  2`). Merge-base `c0b22e89`.

## The custom delta

Two commits (`ca9fe61b`, `7e40503a`); `git diff --shortstat <merge-base> origin/fork` =
**31 files, 606 insertions, 1838 deletions** — a *minimization*, not a feature add:

- **Plugins deleted from source:** `plg_backend_git`, `plg_image_light`.
- **Registry (`server/plugin/index.go`):** prod enables only `plg_authenticate_passthrough`,
  `plg_backend_local`, `plg_backend_s3`, `plg_starter_http`; everything else commented out.
- **`plg_backend_s3`** hardened (relevant to PureStorage / `caBundle`).
- **Docker:** hardened UBI9 `docker/Dockerfile` + `docker/Dockerfile.local`; go.mod/go.sum bumps.

## Deployment constraints

- **Auth is 100% at the Istio mesh** (RequestAuthentication / AuthorizationPolicy). Filestash does
  **no** auth — pure passthrough (headless). #1 regression risk = upstream reintroducing auth/session/CSRF.
- **CVE gate:** MEDIUM and below accepted; **0 HIGH/CRITICAL at runtime** (Trivy) must re-clear.
- Standalone OpenShift, disconnected — image ships as a `docker save` tar. Backends: local PVC + PureStorage S3.

## Rebase result (2026-07-24)

`git checkout -B <branch> origin/fork && git rebase origin/master` — replays cleanly except **6 conflicts**,
all resolved below. Result **builds and runs** (see Build & scan results).

| File | Conflict | Resolution |
|---|---|---|
| `.gitignore` | content | Took fork's (superset: adds `.vscode`, `*.br`, `*.gz`). |
| `server/plugin/plg_backend_git/index.go` | modify/delete | `git rm` — stays deleted (minimization). |
| `server/plugin/index.go` | content | Kept prod's minimized set; carried 2 **new** upstream plugins (`plg_editor_codemirror`, `plg_widget_console`) as **commented/disabled**. |
| `docker/Dockerfile` | content | Took fork's UBI9 prod build; **bumped builder `golang:1.25 → 1.26`** (required — upstream `go.mod` declares `go 1.26`). |
| `go.mod` / `go.sum` | content | Took **upstream's** — newer than the fork's old CVE bumps (e.g. jwt `v5.3.1` > `v5.2.0`); prod Dockerfile has no build-time `go mod tidy`, so committed files must stand alone. Extra requires for removed plugins are harmless. |

## Compatibility findings (source analysis)

Disabled plugins and newer deps do **not** break the minimized build:

- **Core never imports plugins** (self-register via `init()`), and the **web UI is served by core**
  (`server/ctrl/static.go`, `routes.go`) — not by the disabled `plg_handler_site`. So disabling
  plugins can't break compilation, and the minimal set still serves a UI.
- The 2 new upstream plugins (`plg_editor_codemirror` = in-browser text editor, `plg_widget_console`)
  are optional, not referenced by core → safe to leave disabled. *(Decision pending: enable either?)*
- All 4 **enabled** plugins satisfy upstream `b48ed3c`'s interfaces despite upstream's "package
  interface change" commit: `passthrough` matches `IAuthentication` (Setup/EntryPoint/Callback →
  Istio-passthrough model intact); `local` + fork-customized `s3` match all 10 `IBackend` methods;
  `starter_http` uses `Hooks.Register.Starter(*mux.Router)`.
- Enabled imports (`aws-sdk-go v1.55.8`, `gorilla/mux`) are all present in upstream `go.mod`.

## Build & scan results (2026-07-24)

Built the rebased tree with `docker build -f docker/Dockerfile.local` (Docker 24.0.6, Go 1.26).

- ✅ **Compiles** (`make init && make build`, `fts5` tag) — confirms the go.mod/go.sum resolution is sound.
- ✅ **Runs:** container status `running`, `[http] listening on :8334`, `/` returns 307 (normal redirect).
- ✅ **Trivy CVE gate PASSED: 0 HIGH / 0 CRITICAL** (Go binary: 0; OS layer: 0). Remaining 77 = 42 MEDIUM + 35 LOW (accepted per policy).

**CVE fix applied — runtime lib minimization.** The first build had **13 HIGH** CVEs, all in
`curl`/`libcurl-minimal` (12) and `libpng` (1), all with *no distro fix available*. `ldd /app/filestash`
proved the binary links **only brotli + libc/libm** — the image-processing libs and curl are unused by
the minimized plugin set. Fix: install only `brotli` + `ca-certificates` and `rpm -e` curl/libcurl
(applied to **both** `Dockerfile` and `Dockerfile.local`). Result: 13 HIGH → 0, image 259 MB → 234 MB.
*If image plugins are ever re-enabled, the removed libs (and their CVEs) must be restored.*

**Test image pushed for separate validation:** `waahhaa/filestash:upgrade-b48ed3c-test`
(digest `sha256:5aff06e8350e1b9e8e30324207f97bbd5f081af2812a2df931bcc9806a3b7cfe`).

### Gates still requiring the CRC/Istio environment (not run here)

- **Auth passthrough:** unauth request rejected at mesh (403), Filestash never invoked; valid-JWT served with no Filestash login.
- **Functional:** local + S3 browse/upload/download (image thumbnails N/A — image plugins disabled).
- **State migration:** boot the new image against a copy of a `v1.2.0` state PVC.

> Note: prod `docker/Dockerfile` clones from GitHub `master_fork`, so it only builds this tree once these
> commits land on `master_fork`. For local builds of the working tree use `docker/Dockerfile.local`.

## Rollout (per `upgrading.md`)

Tag a **MINOR** bump → `docker build` + `docker save` tar → GitOps promote (bump chart `appVersion` +
image tag in helm-charts + `argohub` overlay; MR to `main`; ArgoCD diff + sync after second-person
validation). Back up the state PVC first; smoke test against **real** PureStorage S3 + Keycloak. Rollback
= revert image tag + `appVersion` via Argo (retain prior tar).

## Open items

1. PureStorage S3: path-style vs virtual-host? private CA in use (drives `caBundle` + MinIO fidelity)?
2. Prod-like state PVC snapshot for the migration test.
3. CRC Istio install: Service Mesh operator vs istioctl?
4. Enable `plg_editor_codemirror` / `plg_widget_console`, or keep disabled?
