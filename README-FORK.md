# Stripped version

## Objective

- Reduce CVEs by
    - Removing unused plugin (delete server/plugin/{plugin_name})
    - Removing unncessary dependencies (go mod tidy)
    - Rebuild image using ubi-minimal 
- Add support for s3 bucket being mounted by env var

## Overview of the codebase

- This software works by compiling Javascript with Node.js into static files.
- The Go backend serves the compiled frontend via the usage of embedded files using the `embed` library.
- Static files are loaded from `public` folder
- Plugins are loaded via `server/plugin/index.go`

The notable files of interest are as follow,

```md
├─ cmd              # go entry point
├─ dist             # build output
├─ go.mod           # go dependencies
├─ go.sum           # go dependencies checksum
├─ Makefile         # script mechanism to build frontend/backend
└─ server
   └─ plugin        # plugin folders
      ├─ plg_{plugins}
      ├─ ...
      └─ index.go   # plugin loading list
```

## Local Dev & Testing

Straightforward steps via the makefile. The important note is to setup the dev environment in Ubuntu for ease of installing dependencies.

- `make build_init`
- `make build_frontend`
- `make build_backend`
- Run the binary and access the app via `localhost:8334`

## Modification

- `docker/Dockerfile`: Rebuild with ubi base
- `server/plugin/index.go`: Comment out unwanted plugins
- `server/plg_backend_git/index.go`: Delete as it is unwanted and contains CVE
- `server/plg_backend_s3/index.go`: Reduce config from UI form, add logic to read bucket info from env var as priority, inputs are allowed if env var are missing. The env var are the standard AWS env var, supported env var are as follow,
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_ENDPOINT_URL