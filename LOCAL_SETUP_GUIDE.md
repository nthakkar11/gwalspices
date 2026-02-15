# GWAL Spices - Local Development Setup Guide

## Prerequisites
- Python 3.9+ installed
- Node.js 16+ and npm/yarn installed
- MongoDB installed and running
- Git installed

## Step 1: Clone Repository

```bash
git clone <your-repo-url>
cd gwal-spices
```

## Step 2: Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=gwal_spices_dev
CORS_ORIGINS=http://localhost:3000
JWT_SECRET_KEY=dev-secret-key-change-in-production
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RESEND_API_KEY=
FROM_EMAIL=orders@gwalspices.in
EOF

# Seed database with sample products
python seed_products.py

# Start backend server
python -m uvicorn server:app --reload --port 8001
# Backend will run on http://localhost:8001
```

## Step 3: Frontend Setup (New Terminal)

```bash
cd frontend

# Install dependencies
npm install
# or
yarn install

# Create .env file
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_RAZORPAY_KEY_ID=
EOF

# Start frontend development server
npm start
# or
yarn start
# Frontend will run on http://localhost:3000
```

## Step 4: Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8001
- **API Docs:** http://localhost:8001/docs

## Default Credentials

**Admin Account:**
- Email: admin@gwalspices.in
- Password: ChangeMe@123

**Test User:**
- Email: test@example.com
- Password: Test123

**Sample Coupon:**
- Code: GWAL10
- Type: 10% discount
- Min Order: ₹500

## Testing Payment Flow

### Option 1: Without Razorpay (Testing Mode)
- Payment button will be visible but non-functional
- Can test all other features except actual payment

### Option 2: With Razorpay Test Keys
1. Sign up at https://razorpay.com
2. Get test API keys from Dashboard
3. Add keys to backend `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   ```
4. Add key to frontend `.env`:
   ```
   REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxxxx
   ```
5. Use Razorpay test cards:
   - Success: 4111 1111 1111 1111
   - CVV: Any 3 digits
   - Expiry: Any future date

## Common Issues & Solutions

### Backend won't start
```bash
# Check if MongoDB is running
sudo systemctl status mongodb
# or
mongod --version

# If port 8001 is busy
# Change port in backend/server.py and frontend .env
```

### Frontend can't connect to backend
```bash
# Verify backend is running
curl http://localhost:8001/api/products

# Check frontend .env has correct backend URL
```

### Database connection error
```bash
# Start MongoDB
sudo systemctl start mongodb

# Check connection
mongosh
```

## Development Workflow

```bash
# Backend changes - auto-reload enabled
# Just save your Python files

# Frontend changes - auto-reload enabled
# Just save your React files

# After adding new Python packages
pip freeze > requirements.txt

# After adding new npm packages
npm install <package>
# package.json will auto-update
```

## Testing Features

### Test User Flow:
1. Register new user or login with test@example.com
2. Browse products
3. Add items to cart
4. Apply coupon: GWAL10
5. Proceed to checkout
6. Add delivery address
7. Test payment (if Razorpay configured)

### Test Admin Flow:
1. Login with admin@gwalspices.in
2. Access admin dashboard
3. View stats, products, orders
4. Manage coupons
5. Update settings

## API Testing with cURL

```bash
# Get products
curl http://localhost:8001/api/products

# Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}'

# Get orders (with token)
curl http://localhost:8001/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Building for Production

```bash
# Frontend
cd frontend
npm run build
# Build files will be in frontend/build/

# Backend
cd backend
# No build needed, just deploy .py files

# Update .env files with production values
```

## Database Backup (Development)

```bash
# Backup
mongodump --db=gwal_spices_dev --out=./backup

# Restore
mongorestore --db=gwal_spices_dev ./backup/gwal_spices_dev
```

## Useful Commands

```bash
# Check all running processes
lsof -i :8001  # Backend port
lsof -i :3000  # Frontend port
lsof -i :27017 # MongoDB port

# Kill process on port
kill -9 $(lsof -t -i:8001)

# View MongoDB data
mongosh
use gwal_spices_dev
db.products.find().pretty()
db.orders.find().pretty()
```
