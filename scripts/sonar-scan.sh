#!/bin/sh
# Run the SonarQube scanner for one commit, via the official scanner container
# (no local Java/scanner install needed). Safe to skip if the server is down.
SHA="$1"
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_ROOT" || exit 1

# curl runs on the host -> localhost. The scanner runs in a container and must
# reach the host via host.docker.internal (Docker Desktop on Windows/macOS).
CHECK_HOST="${SONAR_HOST_URL:-http://localhost:9000}"
SCAN_HOST="${SONAR_SCANNER_HOST:-http://host.docker.internal:9000}"
SONAR_TOKEN="${SONAR_TOKEN:-}"

if ! curl -sf "$CHECK_HOST/api/system/status" >/dev/null 2>&1; then
  echo "[skip] SonarQube not reachable at $CHECK_HOST."
  echo "       Start it:  docker compose -f docker-compose.sonar.yml up -d"
  exit 0
fi

if [ -z "$SONAR_TOKEN" ]; then
  echo "[skip] SONAR_TOKEN not set."
  echo "       SonarQube > My Account > Security > generate token, then:"
  echo "       export SONAR_TOKEN=xxxx   (add to your shell profile)"
  exit 0
fi

echo "[scan] project=sust-hackathon-superagent revision=$SHA host=$SCAN_HOST"
docker run --rm \
  -e SONAR_HOST_URL="$SCAN_HOST" \
  -e SONAR_TOKEN="$SONAR_TOKEN" \
  -v "$REPO_ROOT:/usr/src" \
  sonarsource/sonar-scanner-cli \
  -Dsonar.projectVersion="$SHA" \
  -Dsonar.scm.revision="$SHA"

echo "[done] scan submitted for $SHA"
