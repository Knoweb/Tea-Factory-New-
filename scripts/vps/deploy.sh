#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

IMAGE_NAME="ghcr.io/knoweb/tea-factory-new:latest"

echo "Pulling latest image: $IMAGE_NAME..."
docker pull "$IMAGE_NAME" || echo "Warning: Pull failed, using local image instead."

# Determine which container is currently running
if docker ps --format '{{.Names}}' | grep -Eq "^sanota-app-blue$"; then
    ACTIVE="blue"
    NEXT="green"
    NEXT_PORT=3001
    ACTIVE_PORT=3000
else
    ACTIVE="green"
    NEXT="blue"
    NEXT_PORT=3000
    ACTIVE_PORT=3001
fi

echo "Active container: sanota-app-$ACTIVE on port $ACTIVE_PORT"
echo "Deploying next container: sanota-app-$NEXT on port $NEXT_PORT"

# Stop next container if it exists (e.g. from a failed run)
docker rm -f "sanota-app-$NEXT" || true

# Construct docker run command
ENV_FILE="/root/app.env"
RUN_CMD="docker run -d \
  --name sanota-app-$NEXT \
  --restart always \
  -p 127.0.0.1:$NEXT_PORT:3000 \
  -e PORT=3000"

# Attach env file if it exists
if [ -f "$ENV_FILE" ]; then
    echo "Attaching env file: $ENV_FILE"
    RUN_CMD="$RUN_CMD --env-file $ENV_FILE"
else
    echo "Warning: $ENV_FILE not found. Running container without custom env variables."
fi

# Append image name and execute
RUN_CMD="$RUN_CMD $IMAGE_NAME"
eval "$RUN_CMD"

echo "Waiting for sanota-app-$NEXT to be healthy..."
# Healthcheck: retry curl up to 15 times with 2-second delay
HEALTHY=false
for i in {1..15}; do
    if curl -s -f "http://127.0.0.1:$NEXT_PORT/login" > /dev/null; then
        HEALTHY=true
        break
    fi
    echo "Container not ready yet, retrying in 2 seconds... ($i/15)"
    sleep 2
done

if [ "$HEALTHY" = false ]; then
    echo "Error: new container failed to start or is unhealthy. Rolling back!"
    docker logs "sanota-app-$NEXT"
    docker rm -f "sanota-app-$NEXT"
    exit 1
fi

echo "New container is healthy! Swapping Nginx upstream..."

# Rewrite upstream config to the new port
cat << EOF > /etc/nginx/conf.d/upstream.conf
upstream web_app {
    server 127.0.0.1:$NEXT_PORT;
}
EOF

# Reload Nginx without dropping connections
systemctl reload nginx

echo "Nginx reloaded. Stopping and removing the old container (sanota-app-$ACTIVE)..."
docker stop "sanota-app-$ACTIVE" || true
docker rm "sanota-app-$ACTIVE" || true

echo "Deployment of sanota-app-$NEXT completed successfully with zero downtime!"
