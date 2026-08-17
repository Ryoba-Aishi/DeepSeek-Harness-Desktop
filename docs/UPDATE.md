# 🔄 更新 DeepSeek Harness 引擎

DeepSeek Harness Desktop 分为两个独立部分：**程序壳（Electron 界面）** 和 **Harness 引擎**。
本指南仅介绍如何更新底层的 Harness 引擎

## 🚀 一键更新（推荐）

当你看到 DeepSeek 官方发布了新版 Harness 时（例如从 `0.1.0-rc.6` 升级到 `0.1.0-rc.7`），你只需在项目根目录运行一条命令：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\update-dsh.ps1
这条命令会自动替你完成以下操作：

从 npm 拉取最新的 @deepseek-ai/dsh 引擎。

替换 runtime\dsh 目录下的旧引擎。

自动触发 scripts\build.ps1，重新打包生成新的 EXE
```
## 📦 更新之后会丢失数据吗？
```
绝对不会。

你的插件、API Key、模型配置、聊天记录等所有用户数据，都独立存储在：
更新引擎和重新打包 EXE 只动 runtime 和 dist 目录，从不触碰 %USERPROFILE%\.dsh
```
## 🛠️ 如果想单独重新打包（不更新引擎）
```
如果你只是修改了界面代码（比如改了 launcher/main.js），但不升级引擎，可以单独运行：
powershell -ExecutionPolicy Bypass -File scripts\build.ps1

```