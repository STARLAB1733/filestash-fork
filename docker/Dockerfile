# STEP1: CLONE THE CODE
FROM alpine/git AS builder_prepare 
WORKDIR /home/
ARG GIT_REPO=https://github.com/STARLAB1733/filestash-fork
ARG GIT_BRANCH=master_fork
RUN git clone --depth 1 --single-branch --branch ${GIT_BRANCH} ${GIT_REPO} /home/filestash

# STEP2: BUILD BACKEND
FROM golang:1.24-trixie AS builder_backend
WORKDIR /home/filestash/
COPY --from=builder_prepare /home/filestash/ .
RUN apt-get update > /dev/null && \
    apt-get install -y curl make > /dev/null 2>&1 && \
    apt-get install -y libjpeg-dev libtiff-dev libpng-dev libwebp-dev libraw-dev libheif-dev libgif-dev libvips-dev > /dev/null 2>&1

# Update vulnerable Go modules before building
RUN set -eux; \
    # Google’s public Go module mirror
    go env -w GOPROXY=https://proxy.golang.org,direct; \
    # to ensure downloaded dependencies haven’t been tampered with
    go env -w GOSUMDB=sum.golang.org; \
    # update
    go get -u github.com/golang-jwt/jwt/v5@latest; \
    go get -u golang.org/x/crypto@latest; \
    go get -u golang.org/x/net@latest; \
    go get -u golang.org/x/oauth2@latest; \
    go mod tidy

RUN make build_init && \
    make build_backend && \
    mkdir -p ./dist/data/state/config/ && \
    cp config/config.json ./dist/data/state/config/config.json

# STEP3: BUILD PROD IMAGE
FROM registry.access.redhat.com/ubi9-minimal:latest

WORKDIR /app

# Install runtime deps + enable EPEL.
RUN set -eux; \
    microdnf -y update; \
    microdnf -y install ca-certificates shadow-utils rpm ; \
    # add EPEL, libheif come from EPEL.
    rpm -Uvh --nodigest --nofiledigest \
      https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm; \
    crb enable || true; \
    microdnf -y install --enablerepo=epel \
      libjpeg-turbo \
      libpng \
      libtiff \
      giflib \
      libwebp \
      libheif \
      libwebp-devel \
      brotli; \
    microdnf -y install curl-minimal || true; \
    microdnf -y clean all


COPY --from=builder_backend /home/filestash/dist/ .

# libsharpyuv is not packaged for UBI distributions
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