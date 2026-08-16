# 安全政策

## 支持的版本

| 版本 | 受支持 |
|---|---|
| 0.1.x | ✅ 持续维护 |

## 报告漏洞

请**不要**在公开 Issue 中提交安全漏洞。请通过 GitHub 原生 Private 通道报告：

- GitHub：仓库页 → **Security → Report a vulnerability**（推荐）。

我们会在收到后尽快回复并协调修复。

## 安全设计说明

- **不持有密钥**：dsh-quickstart 只启动 `dsh web` 并读写本机配置文件
  `~/.dsh-quickstart.json`（仅存放 watch / maxRestarts 等开关，**不存放任何密钥**）。
  DeepSeek 的 API Key 由 DSH 凭据服务（`~/.dsh/.credentials.yaml`）管理，本工具不接触。
- **配置文件有界**：`~/.dsh-quickstart.json` 只接受已知字段（`watch`、`maxRestarts`、
  `restartDelayMs`），配套插件的 Host 路由只写入这些字段，任意内容不会落盘。
- **重启是显式动作**：守护模式的开启/关闭都要求用户在 UI 里明确确认（弹窗提示会重启
  dsh），不存在静默的自毁或进程控制。
- **无网络回传**：本工具与配套插件都不发起任何遥测或外部网络请求。

## 报告时应包含

- 影响版本、运行环境（OS / Node / DSH 版本）；
- 复现步骤与最小示例；
- 影响评估（是否涉及配置文件、进程控制或权限边界）。
