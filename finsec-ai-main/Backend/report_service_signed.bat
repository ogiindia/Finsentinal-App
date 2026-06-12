@echo off
setlocal enabledelayedexpansion

REM ==========================================================
REM  FastAPI → Nuitka → SIGNED EXE (Existing Certificate)
REM ==========================================================

REM ---------- APP CONFIG ----------
set "APP_NAME=FinSentinel_AI_report_service"
set "APP_DISPLAY_NAME=FinSentinel AI-report_service"
set "COMPANY_NAME=FIS"
set "APP_VERSION=1.0.0"
set "OUTPUT_ROOT=report_service"

REM ---------- SIGNING CONFIG ----------
set "CERT_PFX=C:\AIML\Codes\Finsentinel_AI\FIS_CodeSigning.pfx"
set "CERT_PASSWORD=F1S3nt1n31C3rt1f1cat3"

REM ---------- WINDOWS SDK ----------
set "SIGNTOOL=C:\Program Files (x86)\Windows Kits\10\bin\x64\signtool.exe"

REM ---------- PATHS ----------
set "OUTPUT_DIR=%OUTPUT_ROOT%\%APP_NAME%_v%APP_VERSION%"
set "DIST_DIR=%OUTPUT_DIR%\app.dist"
set "EXE_NAME=report_service.exe"
set "EXE_PATH=%DIST_DIR%\%EXE_NAME%"

REM ---------- PREP ----------
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"

echo.
echo ==========================================================
echo  BUILDING %APP_DISPLAY_NAME% v%APP_VERSION%
echo ==========================================================

REM ---------- GET CERTIFI CA ----------
for /f "usebackq delims=" %%i in (`
  python -c "import certifi,sys; sys.stdout.write(certifi.where())"
`) do set "CACERT=%%i"

REM ---------- INCLUDE FILES ----------
set "INCLUDE_ARGS="

if exist "config\" (
  set "INCLUDE_ARGS=--include-data-dir=config=config"
)

REM ---------- BUILD WITH NUITKA ----------
python -m nuitka report_service.py ^
  --standalone ^
  --enable-plugin=pkg-resources ^
  --include-package-data=pydantic ^
  --include-package-data=strawberry ^
  --include-data-files="%CACERT%=certifi/cacert.pem" ^
  --nofollow-import-to=pytest,tests ^
  --windows-company-name="%COMPANY_NAME%" ^
  --windows-product-name="%APP_DISPLAY_NAME%" ^
  --windows-file-version="%APP_VERSION%.0" ^
  --windows-product-version="%APP_VERSION%.0" ^
  --output-dir="%OUTPUT_DIR%" ^
  --remove-output %INCLUDE_ARGS%

if errorlevel 1 (
  echo ❌ Nuitka build failed
  pause
  exit /b 1
)

echo ✅ Build successful

REM ==========================================================
REM  SIGN EXECUTABLE (USING EXISTING CERTIFICATE)
REM ==========================================================

echo.
echo ==========================================================
echo  SIGNING EXECUTABLE
echo ==========================================================

if not exist "%CERT_PFX%" (
  echo ❌ Certificate not found: %CERT_PFX%
  pause
  exit /b 1
)

"%SIGNTOOL%" sign ^
  /fd SHA256 ^
  /f "%CERT_PFX%" ^
  /p %CERT_PASSWORD% ^
  "%EXE_PATH%"

if errorlevel 1 (
  echo ❌ Code signing failed
  pause
  exit /b 1
)

echo ✅ Executable signed successfully

REM ---------- VERIFY SIGNATURE ----------
"%SIGNTOOL%" verify /pa /v "%EXE_PATH%"

echo.
echo ==========================================================
echo  BUILD + SIGN COMPLETE
echo  Output: %EXE_PATH%
echo ==========================================================
pause