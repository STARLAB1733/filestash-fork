# Stripped version

## Objective

- Reduce CVEs by removing unused plugins and unnecessary OS-level dependencies
- Rebuild image on `ubi9-minimal` base instead of the upstream Debian-based image
- Apply stardrive2.0 production plugin profile — only the backends and features needed are compiled in
- Add support for S3 bucket configuration via environment variables

## Overview of the codebase

- This software works by compiling Javascript with Node.js into static files.
- The Go backend serves the compiled frontend via the usage of embedded files using the `embed` library.
- Static files are loaded from `public` folder
- Plugins are loaded via `server/plugin/index.go`

The notable files of interest are as follow,

```
├─ cmd              # go entry point
├─ dist             # build output
├─ go.mod           # go dependencies
├─ go.sum           # go dependencies checksum
├─ Makefile         # script mechanism to build frontend/backend
├─ docker
│  ├─ Dockerfile        # production image (ubi9-minimal base, built from GitHub)
│  ├─ Dockerfile.local  # local dev build variant (expects pre-built dist/)
│  ├─ entrypoint.sh     # container startup script
│  └─ default-config.json  # seed config applied on first run
└─ server
   └─ plugin        # plugin folders
      ├─ plg_{plugins}
      ├─ ...
      └─ index.go   # plugin loading list
```

## Local Dev & Testing

Straightforward steps via the makefile. The important note is to set up the dev environment in Ubuntu for ease of installing dependencies.

- `make init`
- `make build`
- Run the binary and access the app via `localhost:8334`

For containerised local testing, use `docker/Dockerfile.local` which expects a pre-built `dist/` directory.

## Modifications from upstream

### Docker image
- `docker/Dockerfile` — rebuilt on `registry.access.redhat.com/ubi9-minimal` base; installs only required runtime libs (`libjpeg-turbo`, `libpng`, `libtiff`, `giflib`, `libwebp`, `libheif`, `brotli`) via EPEL; removes unnecessary packages that introduced CVEs
- `docker/Dockerfile.local` — local build variant for dev iteration without cloning from GitHub
- `docker/entrypoint.sh` — startup script with config seeding logic; enforced LF line endings
- `docker/default-config.json` — minimal default config seeded on first container start

### Plugin minimization
- `server/plugin/index.go` — disabled plugins not needed for production: OpenID, SAML, WebAuthn, Tor, and others with unresolved build dependencies; removed `plg_image_light` (CGO-based, replaced by `plg_image_vips`)
- `server/plg_backend_git` — deleted; unused and contained CVE-affected dependencies
- `server/plg_override_download` — minor fix to static hook registration

### S3 backend
- `server/plg_backend_s3/index.go` — reduced config exposed in UI; added logic to read bucket credentials from standard AWS environment variables as priority. Form inputs are used as fallback if env vars are absent. Supported env vars:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_ENDPOINT_URL`

### Config
- `config/config.json` — trimmed backend list to expose only backends in use

### Line endings
- `.gitattributes` — enforces LF for all `.sh` files to prevent CRLF breakage inside Linux containers

## Deployment

Deployment manifests and Helm charts are maintained in a separate repository in starlab1733/starforging/services/stardrive/ repo. This repository contains only the application source and build tooling.
