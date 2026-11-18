# Linux container image for checking the Linux build. The node version must match .node-version. See docs/ENVIRONMENTS.md.
FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS node

FROM ubuntu:26.04@sha256:d66b366dac61b575bee2aef07e9c26e8070096fbe84a3d4d3eb0da069b5d76db

ARG DEBIAN_FRONTEND=noninteractive
ARG USER_UID=1000
ARG USER_GID=1000

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git sudo less procps libstdc++6 \
      libgtk-3-0t64 libnss3 libgbm1 libasound2t64 libxss1 libxtst6 libnotify4 \
      libsecret-1-0 xdg-utils fonts-liberation \
      dbus gnome-keyring libsecret-tools \
      x11-utils \
 && rm -rf /var/lib/apt/lists/*

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

RUN if ! id ubuntu >/dev/null 2>&1; then groupadd -g "$USER_GID" ubuntu && useradd -m -u "$USER_UID" -g "$USER_GID" -s /bin/bash ubuntu; fi \
 && if [ "$(id -g ubuntu)" != "$USER_GID" ]; then groupmod -g "$USER_GID" ubuntu; fi \
 && if [ "$(id -u ubuntu)" != "$USER_UID" ]; then usermod -u "$USER_UID" -g "$USER_GID" ubuntu; fi \
 && echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/ubuntu \
 && chmod 0440 /etc/sudoers.d/ubuntu

RUN git config --system --add safe.directory /workspace

RUN mkdir -p /run/session /workspace/app/node_modules /workspace/app/data /workspace/app/out \
 && chown "$USER_UID:$USER_GID" /run/session /workspace/app/node_modules /workspace/app/data /workspace/app/out \
 && chmod 700 /run/session

ENV XDG_RUNTIME_DIR=/run/session \
    DBUS_SESSION_BUS_ADDRESS=unix:path=/run/session/bus \
    XDG_CURRENT_DESKTOP=GNOME \
    npm_config_cache=/home/ubuntu/.cache/npm \
    electron_config_cache=/home/ubuntu/.cache/electron \
    ELECTRON_BUILDER_CACHE=/home/ubuntu/.cache/electron-builder

COPY --chmod=755 start.sh /usr/local/bin/container-start

USER ubuntu
WORKDIR /workspace
CMD ["container-start"]
