# GWAL Spices - Production Deployment Guide (Hostinger VPS)

## Prerequisites
- Hostinger VPS with Ubuntu 20.04+ or 22.04
- Root or sudo access
- Domain: gwalspices.in (pointing to VPS IP)

## Step 1: Initial Server Setup

```bash
# SSH into your VPS
ssh root@your_vps_ip

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y git curl nginx certbot python3-certbot-nginx docker.io docker-compose nodejs npm mongodb

# Enable services
systemctl enable docker mongodb
systemctl start docker mongodb
```

## Step 2: Setup Project

```bash
# Create project directory
mkdir -p /var/www/gwal-spices
cd /var/www/gwal-spices

# Clone your repository (or upload files via FTP)
git clone <your-repo-url> .

# Or if uploading via FTP, upload to /var/www/gwal-spices
```

## Step 3: Environment Configuration

```bash
# Backend .env
cd /var/www/gwal-spices/backend
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=gwal_spices_prod
CORS_ORIGINS=https://www.gwalspices.in,https://gwalspices.in
JWT_SECRET_KEY=<GENERATE_STRONG_SECRET>
RAZORPAY_KEY_ID=<YOUR_RAZORPAY_KEY_ID>
RAZORPAY_KEY_SECRET=<YOUR_RAZORPAY_KEY_SECRET>
RAZORPAY_WEBHOOK_SECRET=<YOUR_WEBHOOK_SECRET>
RESEND_API_KEY=<YOUR_RESEND_KEY>
FROM_EMAIL=orders@gwalspices.in
EOF

# Frontend .env
cd /var/www/gwal-spices/frontend
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://www.gwalspices.in
REACT_APP_RAZORPAY_KEY_ID=<YOUR_RAZORPAY_KEY_ID>
EOF
```

## Step 4: Install Dependencies & Build

```bash
# Backend
cd /var/www/gwal-spices/backend
pip3 install -r requirements.txt

# Frontend
cd /var/www/gwal-spices/frontend
npm install
npm run build
```

## Step 5: Nginx Configuration

```bash
cat > /etc/nginx/sites-available/gwalspices << 'EOF'
server {
    listen 80;
    server_name www.gwalspices.in gwalspices.in;

    # Frontend
    location / {
        root /var/www/gwal-spices/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/gwalspices /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

## Step 6: SSL Certificate (Let's Encrypt)

```bash
certbot --nginx -d www.gwalspices.in -d gwalspices.in
# Follow prompts, select redirect HTTP to HTTPS
```

## Step 7: Setup Systemd Services

```bash
# Backend service
cat > /etc/systemd/system/gwal-backend.service << 'EOF'
[Unit]
Description=GWAL Spices Backend
After=network.target mongodb.service

[Service]
User=root
WorkingDirectory=/var/www/gwal-spices/backend
ExecStart=/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable gwal-backend
systemctl start gwal-backend
```

## Step 8: Seed Database

```bash
cd /var/www/gwal-spices/backend
python3 seed_products.py
```

## Step 9: Verify Deployment

```bash
# Check services
systemctl status gwal-backend nginx mongodb

# Check backend
curl http://localhost:8001/api/products

# Check frontend (after SSL)
curl https://www.gwalspices.in
```

## Step 10: Razorpay Webhook Setup

1. Login to Razorpay Dashboard
2. Go to Settings → Webhooks
3. Add webhook URL: `https://www.gwalspices.in/api/payment/webhook`
4. Select events: `payment.captured`, `payment.failed`
5. Copy webhook secret and add to backend .env

## Maintenance Commands

```bash
# View backend logs
journalctl -u gwal-backend -f

# Restart services
systemctl restart gwal-backend nginx

# Update code
cd /var/www/gwal-spices
git pull
cd frontend && npm run build
systemctl restart gwal-backend nginx

# Backup database
mongodump --db=gwal_spices_prod --out=/backup/$(date +%Y%m%d)
```

## Security Checklist
- [ ] Change all default passwords
- [ ] Setup firewall (UFW)
- [ ] Enable fail2ban
- [ ] Regular backups automated
- [ ] SSL certificate auto-renewal enabled
- [ ] MongoDB authentication enabled
