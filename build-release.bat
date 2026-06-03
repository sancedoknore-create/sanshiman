@echo off
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
REM 默认只构建安装包，不发布到 GitHub。
REM 如需发布，必须明确手动运行: npm run build:win -- -p always
npm run build:win -- -p never
