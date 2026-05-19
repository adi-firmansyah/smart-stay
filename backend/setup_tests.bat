@echo off
REM Setup script untuk testing Smart Stay Backend di Windows

echo.
echo 🚀 Smart Stay Backend - Test Setup
echo ===================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python tidak ditemukan. Silakan install Python terlebih dahulu.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set python_version=%%i
echo ✅ Python %python_version% detected

REM Create virtual environment (optional but recommended)
if not exist "venv" (
    echo.
    echo 📦 Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo ✅ Virtual environment created and activated
)

REM Install dependencies
echo.
echo 📥 Installing dependencies...
pip install -r requirements.txt >nul 2>&1

if errorlevel 0 (
    echo ✅ Dependencies installed successfully
) else (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ✨ Setup complete!
echo.
echo 🧪 To run tests:
echo    pytest tests/ -v
echo.
echo    Or use the helper script:
echo    run_tests.bat
echo.
pause
