@echo off
chcp 65001 >nul
title 停止 AppieMusic 服务

echo.
echo ========================================
echo         停止 AppieMusic 服务
echo ========================================
echo.

echo 🔍 正在查找 AppieMusic 相关进程...

:: 停止所有 node.js 进程（AppieMusic 后端）
tasklist | find "node.exe" >nul
if %errorlevel% equ 0 (
    echo 📋 发现以下 Node.js 进程：
    tasklist | find "node.exe"
    echo.
    echo ⏹️  正在停止 Node.js 进程...
    taskkill /f /im node.exe >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Node.js 进程已停止
    ) else (
        echo ❌ 停止 Node.js 进程失败
    )
) else (
    echo ℹ️  未发现运行中的 Node.js 进程
)

:: 检查端口 3000 是否还被占用
echo.
echo 🔍 检查端口 3000 状态...
netstat -an | find "3000" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo ⚠️  端口 3000 仍被占用，尝试强制释放...
    for /f "tokens=5" %%a in ('netstat -ano ^| find "3000" ^| find "LISTENING"') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    echo ✅ 端口已释放
) else (
    echo ✅ 端口 3000 已释放
)

echo.
echo 🎵 AppieMusic 服务已完全停止
echo.
pause