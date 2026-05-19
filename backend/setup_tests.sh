#!/bin/bash
# Setup script untuk testing Smart Stay Backend di macOS/Linux

echo "🚀 Smart Stay Backend - Test Setup"
echo "==================================="
echo ""

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✅ Python $python_version detected"

# Create virtual environment (optional but recommended)
if [ ! -d "venv" ]; then
    echo ""
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "✅ Virtual environment created and activated"
fi

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
pip install -r requirements.txt > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "🧪 To run tests:"
echo "   pytest tests/ -v"
echo ""
echo "   Or use the helper script:"
echo "   bash run_tests.sh"
echo ""
