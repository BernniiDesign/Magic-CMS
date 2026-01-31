#!/bin/bash

echo "🚀 Trinity CMS Modern - Setup Script"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Backend setup
echo "📦 Setting up backend..."
cd backend
cp .env.example .env
echo "⚙️  Please edit backend/.env with your database credentials"
echo "📥 Installing backend dependencies..."
npm install
echo "✅ Backend setup complete!"
echo ""

# Frontend setup
echo "📦 Setting up frontend..."
cd ../frontend
cp .env.example .env
echo "📥 Installing frontend dependencies..."
npm install
echo "✅ Frontend setup complete!"
echo ""

echo "✨ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Configure your database settings in backend/.env"
echo "2. Make sure your TrinityCore databases are accessible"
echo "3. Start the backend: cd backend && npm run dev"
echo "4. Start the frontend: cd frontend && npm run dev"
echo "5. Open http://localhost:5173 in your browser"
echo ""
echo "🎮 Happy gaming!"
