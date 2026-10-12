#!/usr/bin/env bash
# Deploys the LavaTex remote compiler to *your own* Google Cloud project as a
# private Cloud Run service, and creates the one identity allowed to call it.
# See ../README.md for the full walkthrough.
#
#   PROJECT_ID=my-project ./deploy.sh
#
# Optional:
#   REGION=europe-west1          Cloud Run region (pick one close to you)
#   SERVICE=lavatex-compiler     Cloud Run service name
#   IMAGE=docker.io/...:tag      deploy a prebuilt image instead of building
#                                this folder with Cloud Build
#   KEY_FILE=~/lavatex-key.json  where to write the client key
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID to your Google Cloud project id}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-lavatex-compiler}"
IMAGE="${IMAGE:-}"
KEY_FILE="${KEY_FILE:-$HOME/lavatex-client-key.json}"

RUNTIME_SA="lavatex-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
CLIENT_SA="lavatex-client@${PROJECT_ID}.iam.gserviceaccount.com"

cd "$(dirname "$0")"
gcloud config set project "$PROJECT_ID" >/dev/null

echo "==> Enabling APIs"
apis=(run.googleapis.com iam.googleapis.com)
[[ -z "$IMAGE" ]] && apis+=(cloudbuild.googleapis.com artifactregistry.googleapis.com)
gcloud services enable "${apis[@]}"

ensure_sa() {
	local name="$1" display="$2"
	if ! gcloud iam service-accounts describe "${name}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1; then
		gcloud iam service-accounts create "$name" --display-name "$display"
	fi
}

echo "==> Service accounts"
# The container runs as an identity with *no* roles at all, so even a
# compromised compile can't touch anything else in the project.
ensure_sa lavatex-runtime "LavaTex compiler (runtime, no permissions)"
# The plugin authenticates as this one. Its only permission is invoking
# this single service (granted below) — nothing project-wide.
ensure_sa lavatex-client "LavaTex Obsidian plugin (invoker only)"

echo "==> Deploying Cloud Run service ${SERVICE} (${REGION})"
source_args=(--source .)
[[ -n "$IMAGE" ]] && source_args=(--image "$IMAGE")
gcloud run deploy "$SERVICE" \
	"${source_args[@]}" \
	--region "$REGION" \
	--no-allow-unauthenticated \
	--service-account "$RUNTIME_SA" \
	--cpu 2 --memory 2Gi \
	--concurrency 1 --min-instances 0 --max-instances 2 \
	--timeout 300 \
	--quiet

echo "==> Granting run.invoker on ${SERVICE} to ${CLIENT_SA} only"
gcloud run services add-iam-policy-binding "$SERVICE" \
	--region "$REGION" \
	--member "serviceAccount:${CLIENT_SA}" \
	--role roles/run.invoker >/dev/null

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format 'value(status.url)')"

if [[ -e "$KEY_FILE" ]]; then
	echo "==> $KEY_FILE already exists, not creating another key"
else
	echo "==> Creating client key at $KEY_FILE"
	(umask 077 && gcloud iam service-accounts keys create "$KEY_FILE" --iam-account "$CLIENT_SA")
fi

cat <<EOF

Done.
  Service URL:  $URL
  Client key:   $KEY_FILE

In Obsidian: Settings -> LaTeX Exporter
  - Remote backend: Google Cloud Run
  - paste the Service URL
  - create a secret and paste the *entire* contents of the key file into it
Then delete the key file from this computer: rm "$KEY_FILE"
EOF
