# 🧩 插件安装指南

DeepSeek Harness 的插件系统与程序本体完全分离，**安装插件不需要重新打包 EXE，也不需要重新安装**，只需要重启即可。

## 📂 插件存在哪里？

所有插件、配置和用户数据都存放在：

```text
%USERPROFILE%\.dsh\profiles\web
```
##  📥 如何安装一个插件？
```text
1. 打开终端（PowerShell）
按 Win + X 打开 PowerShell / Windows Terminal。

2. 进入插件目录
直接复制以下命令并执行：

powershell
cd "$env:USERPROFILE\.dsh\profiles\web"
3. 使用 pnpm 安装 npm 包插件
DeepSeek Harness 的插件通常以 npm 包形式发布。由于我们不需要全局安装 Node，使用内置的 corepack pnpm 即可：

powershell
corepack pnpm add <插件包名>
（将 <插件包名> 替换为你实际想安装的插件名称，例如：corepack pnpm add dsh-demo-plugin）

4. 挂载插件（最关键的一步）
插件下载完后，还需要告诉 Harness 启动时加载它。
在刚才的目录下，用记事本打开 cordis.patch.yml 文件。

根据插件官方说明，在文件中添加挂载配置。
示例（仅供参考，具体以插件说明为准）：

yaml
- insert:
    - id: demo-plugin
      name: 'dsh-demo-plugin'
5. 重启 DeepSeek Harness
关闭当前运行的 DeepSeek Harness.exe，然后重新双击启动。

✨ 插件就会自动生效，全程不需要重新打包 EXE。
```
