#!/bin/bash
# ==============================================================================
# NITI - Autonomous Portfolio Risk & Tactical Rebalancing Engine
# Automated AWS EC2 (Ubuntu 22.04 / 24.04 LTS) Deployment Script
# ==============================================================================

set -e

echo "=========================================================="
echo " Starting NITI Production Deployment on AWS EC2..."
echo "=========================================================="

APP_DIR="/home/ubuntu/NITI"
REPO_URL="https://github.com/kartikeydhale18/NITI.git"

# 1. Update OS packages
echo "[1/7] Updating system packages..."
sudo apt-get update -y
sudo apt-get install -y python3 python3-pip python3-venv git nginx curl ufw

# 2. Install Node.js 20 LTS (NodeSource)
if ! command -v node &> /dev/null; then
    echo "[2/7] Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 3. Clone or pull repository
if [ -d "$APP_DIR" ]; then
    echo "[3/7] Pulling latest updates from GitHub..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
else
    echo "[3/7] Cloning NITI repository..."
    cd /home/ubuntu
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# 4. Setup Python Virtual Environment
echo "[4/7] Setting up Python virtual environment and dependencies..."
python3 -m venv "$APP_DIR/.venv"
source "$APP_DIR/.venv/bin/activate"
pip install --upgrade pip
pip install -r "$APP_DIR/requirements.txt"

# 5. Build React Frontend Bundle
echo "[5/7] Building high-performance React production bundle..."
cd "$APP_DIR/frontend"
npm install
npm run build
cd "$APP_DIR"

# 6. Configure Systemd Service for FastAPI Backend
echo "[6/7] Creating systemd service for NITI Backend..."
sudo tee /etc/systemd/system/niti.service > /dev/null <<EOF
[Unit]
Description=NITI Autonomous Portfolio Risk Engine API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=$APP_DIR/backend
ExecStart=$APP_DIR/.venv/bin/uvicorn api:app --host 127.0.0.1 --port 8000 --workers 1
Restart=always
RestartSec=5
EnvironmentFile=-$APP_DIR/.env
Environment="PATH=$APP_DIR/.venv/bin:/usr/local/bin:/usr/bin:/bin"

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable niti
sudo systemctl restart niti

# 7. Configure Nginx Reverse Proxy
echo "[7/7] Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/niti > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    # Client body size for CSV file uploads
    client_max_body_size 25M;

    # Serve React Frontend Production Build
    root $APP_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API endpoints to FastAPI Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Longer timeouts for LLM evaluations
        proxy_read_timeout 180s;
        proxy_connect_timeout 60s;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/niti /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Verify Backend Service Health
sleep 3
if systemctl is-active --quiet niti; then
    echo "=========================================================="
    echo " SUCCESS! NITI is deployed and running live on AWS EC2."
    echo " Access your application at: http://$(curl -s http://checkip.amazonaws.com || echo '<EC2_PUBLIC_IP>')"
    echo " Check backend logs: sudo journalctl -u niti -f"
    echo "=========================================================="
else
    echo " WARNING: Backend service failed to start. Checking status:"
    sudo systemctl status niti
fi
