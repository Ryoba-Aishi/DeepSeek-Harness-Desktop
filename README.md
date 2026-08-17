<div align="center">


🐳 DeepSeek Harness Desktop


<img src="assets/whale.png" width="100" height="100" alt="Logo">

## ✨ 把 `npx @deepseek-ai/dsh web` 变成 Windows 一键启动应用

------------------------------------------------------------------------

> ⚠️ **重要声明**：本项目**不是** DeepSeek 官方产品，仅为 Windows
> 桌面封装启动器。DeepSeek Harness 版权归 DeepSeek 所有。

## 🚀 核心特性

  -----------------------------------------------------------------------------------------
  特性                                说明
  ----------------------------------- -----------------------------------------------------
  🖥️ **零门槛使用**                   双击 `DeepSeek Harness.exe` 即可启动，无需安装
                                      Node.js，无需输入命令。

  🔒 **数据分离**                     程序本体与用户数据完全分离。程序安装在程序目录，API
                                      Key、聊天记录、插件等存储于 `%USERPROFILE%\\.dsh`。

  🧩 **插件支持**                     支持 Cordis 插件和普通 NPM 包，兼容原版 Harness
                                      生态。

  🐳 **专属图标**                     内置灰色鲸鱼图标，方便桌面识别。
  -----------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 📦 安装方式

## ✅ 推荐：安装版

下载：

``` text
DeepSeek-Harness-Setup.exe
```

双击运行后：

-   自动安装到 `C:\Program Files`
-   自动创建桌面快捷方式
-   无需额外配置

------------------------------------------------------------------------

## 📂 便携版

下载：

``` text
DeepSeek-Harness-Portable.exe
```

复制到任意目录即可运行。

无需安装，不修改系统环境。

------------------------------------------------------------------------

# 📚 使用文档

## 🧩 插件安装指南

### 插件位置

所有插件、配置和用户数据默认存放：

``` text
%USERPROFILE%\.dsh\profiles\web
```

------------------------------------------------------------------------

### 安装插件步骤

#### . 打开 PowerShell

按：

``` text
Win + X
```

打开 PowerShell 或 Windows Terminal。

#### . 进入插件目录

执行：

``` powershell
cd "$env:USERPROFILE\.dsh\profiles\web"
```

#### . 使用 pnpm 安装插件

Harness 插件通常以 NPM 包形式发布：

``` powershell
corepack pnpm add <插件包名>
```

例如：

``` powershell
corepack pnpm add dsh-demo-plugin
```

#### . 挂载插件

打开：

``` text
cordis.patch.yml
```

按照插件官方说明添加加载配置。

示例：

``` yaml
- insert:
    - id: demo-plugin
      name: dsh-demo-plugin
```

#### . 重启程序

关闭：

``` text
DeepSeek Harness.exe
```

重新启动即可。

插件无需重新打包 EXE。

------------------------------------------------------------------------

# 🔄 更新 Harness 引擎

DeepSeek Harness Desktop 分为两个部分：

-   Electron 程序壳
-   DeepSeek Harness 引擎

更新引擎不会影响用户数据。

------------------------------------------------------------------------

## 🚀 一键更新

进入源码目录：

``` powershell
powershell -ExecutionPolicy Bypass -File scripts\update-dsh.ps1
```

自动完成：

1.  从 npm 获取最新版 Harness
2.  替换 `runtime\dsh`
3.  自动重新构建 EXE

------------------------------------------------------------------------

## 📦 更新会丢失数据吗？

不会。

用户数据独立保存：

``` text
%USERPROFILE%\.dsh
```

包含：

-   API Key
-   聊天记录
-   模型配置
-   插件
-   用户设置

更新只影响：

``` text
    runtime
    dist
```

------------------------------------------------------------------------

## 🛠️ 只重新打包 EXE

如果只是修改界面：

``` powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

------------------------------------------------------------------------

# ❓ 常见问题 FAQ

## Q1：为什么 dist 文件夹为空？

`dist` 是构建产物目录。

源码仓库默认不会包含 EXE。

进入项目根目录运行：

``` powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

生成后的 EXE 会出现在：

``` text
dist\
```

------------------------------------------------------------------------

## Q2：启动提示 3080 端口被占用怎么办？

通常原因：

-   已经运行了一个 Harness 实例
-   其他程序占用了 3080 端口

解决：

  关闭已有 Harness
  检查占用 3080 的程序
  修改端口配置

------------------------------------------------------------------------

## Q3：卸载或重装 EXE 会丢数据吗？

不会。

程序：

``` text
DeepSeek Harness.exe
```

和用户数据：

``` text
%USERPROFILE%\.dsh
```

完全分离。

重新安装、升级 EXE 不会删除：

-   API Key
-   会话记录
-   插件
-   配置文件

------------------------------------------------------------------------

## Q4：需要安装 Node.js 吗？

不需要。

EXE 已经内置：

-   Windows Node.js Runtime
-   DeepSeek Harness 引擎

用户只需要双击运行即可。

------------------------------------------------------------------------

# 🔧 开发者构建

如果需要重新构建：

``` powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

------------------------------------------------------------------------


