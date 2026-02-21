#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <release_archive.tar.gz> <release_id>" >&2
  exit 1
fi

RELEASE_ARCHIVE="$1"
RELEASE_ID="$2"

: "${DEPLOY_PATH:?DEPLOY_PATH is required}"
: "${SERVICE_API:?SERVICE_API is required}"
: "${SERVICE_WORKER:?SERVICE_WORKER is required}"
: "${SERVICE_SCHEDULER:?SERVICE_SCHEDULER is required}"

DEPLOY_PATH="${DEPLOY_PATH%/}"
RELEASES_DIR="${DEPLOY_PATH}/releases"
CURRENT_LINK="${DEPLOY_PATH}/current"
RELEASES_TO_KEEP="${RELEASES_TO_KEEP:-5}"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"

if [[ ! -f "${RELEASE_ARCHIVE}" ]]; then
  echo "Release archive not found: ${RELEASE_ARCHIVE}" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required on the server." >&2
  exit 1
fi

if ! command -v corepack >/dev/null 2>&1; then
  echo "Corepack is required on the server." >&2
  exit 1
fi

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemctl is required on the server." >&2
  exit 1
fi

mkdir -p "${RELEASES_DIR}"
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"

tar -xzf "${RELEASE_ARCHIVE}" -C "${RELEASE_DIR}"
rm -f "${RELEASE_ARCHIVE}"

if [[ -n "${DEPLOY_ENV_FILE_PATH:-}" ]]; then
  if [[ ! -f "${DEPLOY_ENV_FILE_PATH}" ]]; then
    echo "DEPLOY_ENV_FILE_PATH does not exist: ${DEPLOY_ENV_FILE_PATH}" >&2
    exit 1
  fi
  ln -sfn "${DEPLOY_ENV_FILE_PATH}" "${RELEASE_DIR}/.env"
fi

cd "${RELEASE_DIR}"
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @nms/db exec prisma generate
pnpm build
pnpm --filter @nms/db exec prisma migrate deploy

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"
cd "${CURRENT_LINK}"

restart_service() {
  local service_name="$1"
  if [[ -z "${service_name}" ]]; then
    return 0
  fi

  local systemctl_cmd=("systemctl")
  if command -v sudo >/dev/null 2>&1; then
    systemctl_cmd=("sudo" "systemctl")
  fi

  "${systemctl_cmd[@]}" restart "${service_name}"
  "${systemctl_cmd[@]}" is-active --quiet "${service_name}"
}

restart_service "${SERVICE_API}"
restart_service "${SERVICE_WORKER}"
restart_service "${SERVICE_SCHEDULER}"
restart_service "${SERVICE_WEB:-}"

if [[ -n "${HEALTHCHECK_URL:-}" ]]; then
  curl --fail --silent --show-error --max-time 10 --retry 12 --retry-delay 5 "${HEALTHCHECK_URL}" >/dev/null
fi

if [[ "${RELEASES_TO_KEEP}" =~ ^[0-9]+$ ]] && [[ "${RELEASES_TO_KEEP}" -ge 1 ]]; then
  mapfile -t old_releases < <(ls -1dt "${RELEASES_DIR}"/* 2>/dev/null | tail -n +"$((RELEASES_TO_KEEP + 1))" || true)
  if [[ "${#old_releases[@]}" -gt 0 ]]; then
    rm -rf -- "${old_releases[@]}"
  fi
fi

echo "Deployment finished: ${RELEASE_DIR}"
