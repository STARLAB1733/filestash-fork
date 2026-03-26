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
FROM registry.access.redhat.com/ubi9-minimal:latest

WORKDIR /app

RUN set -eux; \
    microdnf -y update; \
    rpm -e --nodeps libarchive 2>/dev/null || true; \
    microdnf -y install ca-certificates shadow-utils; \
    printf '[epel]\nname=EPEL 9\nmetalink=https://mirrors.fedoraproject.org/metalink?repo=epel-9&arch=$basearch\nenabled=1\ngpgcheck=0\n' \
      > /etc/yum.repos.d/epel.repo; \
    microdnf -y install \
      libjpeg-turbo \
      libpng \
      libtiff \
      libwebp \
      libheif \
      brotli; \
    microdnf -y clean all

COPY --from=builder_backend /home/filestash/dist/ .

# libsharpyuv is not packaged for UBI/RHEL; copied from Debian builder (amd64 only)
COPY --from=builder_backend /usr/lib/x86_64-linux-gnu/libsharpyuv.so.0 /usr/lib64/

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
