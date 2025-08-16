@echo off
chcp 65001 >nul
title AppieMusic 一键启动

echo.
echo ========================================
echo           AppieMusic 一键启动
echo ========================================
echo.

:: 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js，准备自动安装...
    echo.
    
    :: 创建临时目录用于下载
    mkdir temp_nodejs >nul 2>&1
    cd temp_nodejs
    
    echo 📥 正在下载 Node.js 安装程序...
    :: 下载Node.js安装程序 (LTS版本)
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.18.2/node-v18.18.2-x64.msi' -OutFile 'nodejs_installer.msi'}"
    
    if not exist "nodejs_installer.msi" (
        echo ❌ 下载失败，请检查网络连接或手动安装 Node.js: https://nodejs.org/
        cd ..
        rmdir /s /q temp_nodejs >nul 2>&1
        pause
        exit /b 1
    )
    
    echo 🔧 正在安装 Node.js...
    :: 静默安装Node.js
    start /wait msiexec /i nodejs_installer.msi /qn
    
    :: 清理临时文件
    cd ..
    rmdir /s /q temp_nodejs >nul 2>&1
    
    :: 检查安装是否成功
    node --version >nul 2>&1
    if %errorlevel% neq 0 (
    echo ❌ Node.js 安装失败，请手动安装: https://nodejs.org/
    pause
    exit /b 1
)
    
    echo ✅ Node.js 安装成功！
    echo.
    
    :: 刷新环境变量
    echo 🔄 正在刷新环境变量...
    setx PATH "%PATH%" >nul 2>&1
    
    :: 等待环境变量生效
    timeout /t 2 >nul
    
    :: 验证npm是否可用
    npm --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ⚠️ npm可能不可用，请重启命令提示符后再试
        echo 或者手动安装Node.js: https://nodejs.org/
        pause
        exit /b 1
    )
    
    echo ✅ npm已准备就绪
) else (
    echo ✅ Node.js 已安装
)

echo 📊 Node.js 版本:
node --version

:: 检查依赖是否已安装
if not exist "node_modules" (
    echo.
    echo 📦 正在安装依赖包...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
    echo.
    echo 🚀 依赖安装完成，正在启动服务...
) else (
    echo ✅ 依赖包已存在
)

:: 检查端口是否被占用
echo.
echo 🔍 检查端口 3000 是否可用...
netstat -an | find "3000" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo ⚠️  警告：端口 3000 已被占用
    echo 正在尝试终止占用进程...
    for /f "tokens=5" %%a in ('netstat -ano ^| find "3000" ^| find "LISTENING"') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 2 >nul
)

echo.
echo 🚀 正在启动 AppieMusic 后端服务...
echo.
echo 服务地址: http://localhost:3000
echo 前端页面: AppieMusic - v1.3.html
echo.
echo 💡 使用说明:
echo 1. 服务启动后会自动打开音乐界面
echo 2. 或者访问 http://localhost:3000 查看服务状态
echo 3. 按 Ctrl+C 可以停止服务
echo.
echo ========================================
echo.

:: 在后台启动服务器
echo 📡 启动后端服务...
start "AppieMusic 后端服务" cmd /c "npm start"

:: 等待服务启动
echo ⏳ 等待服务启动...
timeout /t 3 >nul

:: 检查服务是否启动成功
:check_service
echo 🔍 检查服务状态...
curl -s http://localhost:3000/api/music >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 后端服务启动成功！
    goto open_frontend
) else (
    echo ⏳ 服务启动中，请稍候...
    timeout /t 2 >nul
    goto check_service
)

:open_frontend
:: 自动打开音乐界面
echo 🎵 正在打开音乐播放器...
if exist "AppieMusic - v1.3.html" (
    start "" "AppieMusic - v1.3.html"
    echo ✅ 音乐播放器已打开！
) else (
    echo ❌ 未找到 AppieMusic - v1.3.html 文件
    echo 请手动打开该文件
)

echo.
echo 🎉 AppieMusic 启动完成！
echo.
echo 📋 服务信息:
echo - 后端服务: http://localhost:3000
echo - 前端页面: 已自动打开
echo - 服务状态: 运行中
echo.
echo 💡 提示:
echo - 关闭此窗口不会停止后端服务
echo - 要停止服务请运行 "停止服务.bat"
echo - 或在后端服务窗口按 Ctrl+C
echo.

:: 保持窗口打开一段时间显示信息
timeout /t 10
echo 窗口将在5秒后自动关闭...
timeout /t 5
exit

:: 如果服务器意外停止
echo.
echo ⚠️  服务器已停止
pause