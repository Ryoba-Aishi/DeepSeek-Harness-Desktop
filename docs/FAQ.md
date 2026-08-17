# ❓ 常见问题解答 (FAQ)

### Q1: 为什么我的 `dist` 文件夹是空的，或者没有 EXE 文件？
**A:** `dist` 是构建产物目录。源码仓库里不应该放 EXE。
你需要进入项目根目录，运行以下命令来生成 EXE：
```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
生成后的 EXE 会自动出现在 dist\ 里面
```
### Q2: 程序启动时提示“3080 端口被占用”怎么办？
```
A: 这通常意味着你已经启动了一个 DeepSeek Harness 实例，或者有其他程序占用了 3080 端口
```
### Q3: 如果我卸载或重装 EXE，我的 API Key、聊天记录和插件会丢吗？
```
A: 不会，永远保留。

程序本体：在 C:\Program Files\DeepSeek Harness 或你解压的目录。

用户数据：在 %USERPROFILE%\.dsh。
这两个是完全独立分离的。你可以随便重装、更新 EXE，您的数据（API Key、会话、设置、插件）永远安全。
```
### Q4:我需要自己安装 Node.js 才能运行吗？
```
A: 完全不需要。
EXE 内部已经捆绑了专用于 Windows 的 Node.js 运行时和 DeepSeek Harness 引擎，双击即可运行。所有依赖都是自包含的
```