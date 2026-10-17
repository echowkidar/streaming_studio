FROM alpine:3.20

RUN apk add --no-cache ca-certificates curl bash

# Automatically detect architecture (amd64 vs arm64) and download official MinIO server + mc client
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then MINIO_ARCH="linux-amd64"; \
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then MINIO_ARCH="linux-arm64"; \
    else MINIO_ARCH="linux-amd64"; fi && \
    curl -sSL "https://dl.min.io/server/minio/release/${MINIO_ARCH}/minio" -o /usr/local/bin/minio && \
    chmod +x /usr/local/bin/minio && \
    curl -sSL "https://dl.min.io/client/mc/release/${MINIO_ARCH}/mc" -o /usr/local/bin/mc && \
    chmod +x /usr/local/bin/mc

RUN mkdir -p /data

EXPOSE 9000 9001

ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
