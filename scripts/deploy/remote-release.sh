#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <release_archive.tar.gz> <release_id>" >&2
  exit 1
fi

RELEASE_ARCHIVE="$1"
RELEASE_ID="$2"

: "${DEPLOY_PATH:?DEPLOY_PATH is required}"

DEPLOY_PATH="${DEPLOY_PATH%/}"
RELEASES_DIR="${DEPLOY_PATH}/releases"
CURRENT_LINK="${DEPLOY_PATH}/current"
RELEASES_TO_KEEP="${RELEASES_TO_KEEP:-5}"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-nms}"

if [[ ! -f "${RELEASE_ARCHIVE}" ]]; then
  echo "Release archive not found: ${RELEASE_ARCHIVE}" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required on the server." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is required on the server." >&2
  exit 1
fi

mkdir -p "${RELEASES_DIR}"
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"

tar -xzf "${RELEASE_ARCHIVE}" -C "${RELEASE_DIR}"
rm -f "${RELEASE_ARCHIVE}"

ENV_FILE_PATH="${DEPLOY_ENV_FILE_PATH:-${DEPLOY_PATH}/shared/.env}"
if [[ ! -f "${ENV_FILE_PATH}" ]]; then
  echo "Deployment env file does not exist: ${ENV_FILE_PATH}" >&2
  echo "Set DEPLOY_ENV_FILE_PATH secret or create ${DEPLOY_PATH}/shared/.env on the server." >&2
  exit 1
fi

COMPOSE_FILE_PATH="${RELEASE_DIR}/docker-compose.deploy.yml"
if [[ ! -f "${COMPOSE_FILE_PATH}" ]]; then
  echo "Missing compose file: ${COMPOSE_FILE_PATH}" >&2
  exit 1
fi

ln -sfn "${ENV_FILE_PATH}" "${RELEASE_DIR}/.env"
ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

compose() {
  IMAGE_TAG="${RELEASE_ID}" docker compose \
    --project-name "${COMPOSE_PROJECT_NAME}" \
    --env-file "${RELEASE_DIR}/.env" \
    -f "${COMPOSE_FILE_PATH}" "$@"
}

compose build api web
compose up -d --remove-orphans postgres redis mailhog
compose run --rm migrate
compose up -d --remove-orphans api worker scheduler web
compose ps

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
