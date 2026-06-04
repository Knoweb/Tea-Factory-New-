#!/bin/bash
set -e

# Update and install Docker and Nginx
echo "Updating packages..."
apt-get update -y
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release nginx

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Configure Nginx
echo "Configuring Nginx..."
mkdir -p /etc/nginx/conf.d

# Create initial upstream file pointing to blue port (3000)
cat << 'EOF' > /etc/nginx/conf.d/upstream.conf
upstream web_app {
    server 127.0.0.1:3000;
}
EOF

# Create site configuration
cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://web_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Restart Nginx
systemctl restart nginx

echo "VPS setup completed successfully!"
