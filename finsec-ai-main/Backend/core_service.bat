@echo off
REM ==========================================================
REM  FastAPI → Nuitka Build Script (Windows, robust)
REM ==========================================================

REM ----- CONFIGURABLE PARAMETERS -----
set "APP_NAME=FinSentinel_AI_Core"
set "APP_DISPLAY_NAME=FinSentinel AI-Core Service"
set "COMPANY_NAME=FIS"
set "APP_VERSION=1.0.0"
set "OUTPUT_ROOT=Core_service"

REM ----- CREATE VERSIONED OUTPUT FOLDER -----
set "OUTPUT_DIR=%OUTPUT_ROOT%\%APP_NAME%_v%APP_VERSION%"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo.
echo ==========================================================
echo Building %APP_DISPLAY_NAME% v%APP_VERSION% ...
echo Output Folder: %OUTPUT_DIR%
echo ==========================================================

REM ----- CLEAN OLD OUTPUT IN TARGET DIR -----
if exist "%OUTPUT_DIR%\app.dist" rmdir /s /q "%OUTPUT_DIR%\app.dist"
if exist "%OUTPUT_DIR%\app.build" rmdir /s /q "%OUTPUT_DIR%\app.build"
if exist "%OUTPUT_DIR%\app.exe" del /q "%OUTPUT_DIR%\app.exe"

REM ----- CAPTURE CERTIFI CA BUNDLE PATH (for HTTPS) -----
for /f "usebackq delims=" %%i in (`python -c "import certifi,sys;sys.stdout.write(certifi.where())"`) do set "CACERT=%%i"

REM ----- BUILD INCLUDE ARGUMENTS SAFELY (only add if paths exist) -----
set "INCLUDE_ARGS="

REM If you actually have a *directory* named config with non-code files, include it:
if exist "config\" (
  set "INCLUDE_ARGS=%INCLUDE_ARGS% --include-data-dir=config=config"
) else (
  REM If you need specific config files (e.g., .env, .yaml), include them explicitly, e.g.:
  if exist ".env" (
    set "INCLUDE_ARGS=%INCLUDE_ARGS% --include-data-files=.env=.env"
  )
  if exist "config.yaml" (
    set "INCLUDE_ARGS=%INCLUDE_ARGS% --include-data-files=config.yaml=config.yaml"
  )
)

REM ----- RUN NUITKA BUILD -----
@REM python -m nuitka app.py ^
@REM   --standalone ^
@REM   --enable-plugin=pkg-resources ^
@REM   --include-package-data=pydantic ^
@REM   --include-package-data=strawberry ^
@REM   --include-data-files="%CACERT%=certifi/cacert.pem" ^
@REM   --nofollow-import-to=pytest,tests ^
@REM   --windows-company-name="%COMPANY_NAME%" ^
@REM   --windows-product-name="%APP_DISPLAY_NAME%" ^
@REM   --windows-file-version="%APP_VERSION%.0" ^
@REM   --windows-product-version="%APP_VERSION%.0" ^
@REM   --windows-console-mode=disable ^
@REM   --output-dir="%OUTPUT_DIR%" ^
@REM   --remove-output %INCLUDE_ARGS%

python -m nuitka app.py ^
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

if %errorlevel% neq 0 (
    echo.
    echo ❌ Build failed! Check errors above.
    pause
    exit /b 1
)

echo.
echo ✅ Build complete!
echo Output located at: %OUTPUT_DIR%
echo ==========================================================
pause
