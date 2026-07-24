# Session Handoff — Filestash upstream upgrade (`b48ed3c`)

Self-contained context to resume this upgrade from a fresh client. Pair with `UPGRADE-NOTES.md`
(the upgrade guide) and `STARLAB1733/starforging` → `services/stardrive/docs/operations/upgrading.md`
(authoritative process). Last updated 2026-07-24.

## Status at handoff

| Step | State |
|---|---|
| Rebase `fork` (2 custom commits) onto latest upstream `b48ed3c1` | ✅ done — 6 conflicts resolved |
| Compile / image build (`docker/Dockerfile.local`, Go 1.26) | ✅ builds & runs |
| Trivy CVE gate (0 HIGH/CRITICAL) | ✅ passed (after lib minimization) |
| Test image on Docker Hub | ✅ `waahhaa/filestash:upgrade-b48ed3c-test` |
| Auth-passthrough / functional / state-migration tests | ⬜ pending — need CRC/Istio/Keycloak/MinIO env |
| Decision: enable `plg_editor_codemirror` / `plg_widget_console`? | ⬜ pending — currently disabled |
| Promote to prod (`master_fork`, tag, GitOps) | ⬜ not started |

## Branch / repo state

- Local clone: `C:\Users\tan_5\Documents\GitHub\filestash-fork` (remotes: `origin` = STARLAB1733 fork, `upstream` = mickael-kerjean).
- **Working branch `upgrade/upstream-b48ed3c`** (this branch) = the rebased + hardened + documented tree,
  tip built the pushed image. Layout (top → base):
  ```
  <docs>   docs: build/scan results + CVE hardening
  <fix>    harden(docker): mirror runtime lib minimization to prod Dockerfile
  <fix>    harden(docker): drop unused image libs + curl (clears 13 HIGH CVEs)
  <fix>    fix(docker): bump Dockerfile.local builder to golang:1.26
  4cfd5cb1 feat: stardrive2.0 ... (custom commit 2, replayed)
  7948dc79 Squashed refactor ... (custom commit 1, replayed)
  b48ed3c1 upstream tip (= origin/master = upstream/master)
  ```
- Branch model: `master` mirrors latest upstream (sync via GitHub "Sync fork"); `fork` = prod.
  Upgrade = replay the 2 custom commits onto `master`, then promote. **Do not** treat `master` as prod.
- Prod `fork` and the un-rebased history were **not** modified. (Previous remote tip of this branch,
  `b6254bcf`, was replaced via `--force-with-lease`; recoverable from reflog if ever needed.)

## Test image

- `waahhaa/filestash:upgrade-b48ed3c-test`
- digest `sha256:5aff06e8350e1b9e8e30324207f97bbd5f081af2812a2df931bcc9806a3b7cfe`
- 234 MB, UBI9-minimal, non-root `1001:0`, `EXPOSE 8334`. Enabled plugins: passthrough auth, local, s3, starter_http.

## Tooling on the build host

- Docker Desktop (daemon 24.0.6) — start it before building: `"/c/Program Files/Docker/Docker/Docker Desktop.exe"`.
- Trivy 0.72.0 at `~/AppData/Local/Microsoft/WinGet/Packages/AquaSecurity.Trivy_*/trivy.exe` (installed via winget).
- No local Go toolchain — build/scan via Docker only.

## Reproduce build + scan

```bash
cd C:/Users/tan_5/Documents/GitHub/filestash-fork
git checkout upgrade/upstream-b48ed3c
docker build -f docker/Dockerfile.local -t filestash-fork:upgrade-b48ed3c-test .
# quick run check
docker run -d --name fs -p 18334:8334 filestash-fork:upgrade-b48ed3c-test && docker logs fs
# CVE gate
trivy image --scanners vuln --severity HIGH,CRITICAL filestash-fork:upgrade-b48ed3c-test   # expect 0
# publish
docker tag  filestash-fork:upgrade-b48ed3c-test waahhaa/filestash:upgrade-b48ed3c-test
docker push waahhaa/filestash:upgrade-b48ed3c-test
```

## Key facts / gotchas

- **CVE fix = runtime lib minimization.** `ldd /app/filestash` shows the binary links only brotli +
  libc/libm. Image libs (libjpeg/png/tiff/webp/heif/vips) and curl/libcurl are unused by the minimized
  plugin set, so both Dockerfiles install only `brotli`+`ca-certificates` and `rpm -e curl-minimal
  libcurl-minimal`. This cleared 13 HIGH (no-fix-available) CVEs. **If image plugins are re-enabled,
  restore the EPEL repo + image libs + libsharpyuv** (noted inline in both Dockerfiles).
- **Go 1.26 required:** upstream `go.mod` declares `go 1.26`; both Dockerfile builders must be `golang:1.26-*`.
- **go.mod/go.sum:** took upstream's (newer than the fork's old CVE bumps; jwt v5.3.1, aws-sdk-go v1.55.8).
  Prod Dockerfile has no build-time `go mod tidy`, so committed files must stand alone — they do.
- **Prod `docker/Dockerfile` clones `master_fork` from GitHub** (not the local tree). It will only build
  this upgrade once these commits land on `master_fork`. Use `docker/Dockerfile.local` for the local tree.
- **Auth model:** Filestash does no auth — 100% Istio mesh passthrough. Biggest regression risk =
  upstream reintroducing auth/session/CSRF. Verified `passthrough` plugin still matches upstream's
  `IAuthentication` interface after the rebase.

## Next actions

1. Deploy `waahhaa/filestash:upgrade-b48ed3c-test` in the CRC harness; run auth-passthrough + functional
   (local + S3) + state-migration gates (see `UPGRADE-NOTES.md`).
2. Decide on `plg_editor_codemirror` / `plg_widget_console` (edit `server/plugin/index.go`, rebuild).
3. On green: promote per `upgrading.md` — land commits on `master_fork`, tag a MINOR bump, `docker save`
   tar, GitOps (chart `appVersion` + image tag → helm-charts + argohub → MR → ArgoCD sync).
