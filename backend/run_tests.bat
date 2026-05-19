@echo off
REM Quick start script untuk menjalankan tests Smart Stay Backend (Windows)

echo.
echo 🚀 Smart Stay Backend Testing - Quick Start
echo ==========================================
echo.

REM Check if pytest is installed
pytest --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pytest belum terinstall
    echo 📦 Menginstall dependencies...
    pip install -r requirements.txt
)

echo ✅ Dependencies ready
echo.

REM Run tests
echo 🧪 Menjalankan tests...
echo.

REM Default: run all tests
if "%1"=="" (
    pytest tests\ -v --tb=short
) else (
    REM Run specific test file or pattern
    pytest %1 -v --tb=short
)

echo.
echo ✨ Done!
pause
