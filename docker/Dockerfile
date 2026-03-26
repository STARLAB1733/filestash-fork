# STEP1: CLONE THE CODE
FROM alpine/git AS builder_prepare
WORKDIR /home/
ARG GIT_REPO=https://github.com/STARLAB1733/filestash-fork
ARG GIT_BRANCH=master_fork
RUN git clone --depth 1 --single-branch --branch ${GIT_BRANCH} ${GIT_REPO} /home/filestash

# STEP2: BUILD BACKEND
FROM golang:1.25-trixie AS builder_backend
WORKDIR /home/filestash/
COPY --from=builder_prepare /home/filestash/ .
RUN apt-get update > /dev/null && \
    apt-get install -y curl make > /dev/null 2>&1 && \
    apt-get install -y libjpeg-dev libtiff-dev libpng-dev libwebp-dev libraw-dev libheif-dev libgif-dev libvips-dev > /dev/null 2>&1

RUN make init && \
    make build && \
    mkdir -p ./dist/data/state/config/ && \
    cp config/config.json ./dist/data/state/config/config.json

# STEP3: BUILD PROD IMAGE
FROM ubuntu:24.04

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      libbrotli1 \
      libjpeg-turbo8 \
      libtiff6 \
      libpng16-16t64 \
      libwebp7 \
      libsharpyuv0 \
      libraw23t64 \
      libheif1 \
      libgif7 && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder_backend /home/filestash/dist/ .

RUN useradd -u 1001 filestash; \
    mkdir -p /app/data; \
    chown -R filestash:filestash /app; \
    chgrp -R 0 /app; chmod -R g+rwX /app; \
    find /app/data -type d -exec chmod 770 {} \; || true; \
    find /app/data -type f -exec chmod 760 {} \; || true; \
    chmod 730 /app/filestash

USER 1001:0
EXPOSE 8334
CMD ["/app/filestash"]
