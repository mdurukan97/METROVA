@echo off
setlocal
cd /d "%~dp0\.."

if not exist "tools\bob.jar" (
  echo [METROVA] tools\bob.jar bulunamadi.
  echo Defold 1.13.1 bob.jar dosyasini tools klasorune koyun.
  exit /b 2
)

where java >nul 2>nul
if errorlevel 1 (
  echo [METROVA] Java bulunamadi. OpenJDK 25 gereklidir.
  exit /b 3
)

if not exist "dist\android" mkdir "dist\android"

echo [METROVA] Android debug APK olusturuluyor...
java -jar "tools\bob.jar" --platform armv7-android --architectures arm64-android --variant debug --archive --bundle-format apk --bundle-output "dist\android" resolve distclean build bundle
if errorlevel 1 exit /b %errorlevel%

echo.
echo [METROVA] Tamamlandi. dist\android altini kontrol edin.
endlocal
