@echo off
REM 注册 PawHome 每日日报任务计划
REM 请以管理员身份运行此脚本

schtasks /create /tn "PawHome-DailyReport" /tr "node \"f:\PAWHome\.claude\scripts\daily-report.js\"" /sc daily /st 22:00 /f

if %errorlevel% == 0 (
    echo [OK] 任务计划已创建：每晚 22:00 自动生成日报并发送到飞书群
) else (
    echo [ERROR] 创建失败，请以管理员身份重新运行
)

REM 每周日额外执行周报（已内置在 daily-report.js 中，无需单独配置）
echo [INFO] 周报将在每周日 22:00 自动生成

pause
