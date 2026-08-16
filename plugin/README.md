# dsh-quickstart-plugin

[English](#english) | 中文

**dsh-quickstart-plugin** 是 [dsh-quickstart](https://www.npmjs.com/package/dsh-quickstart) 启动器的配套 DSH 插件：在 DeepSeek Harness Web GUI 的 **设置 → 插件 → 插件配置** 里注册一张「快速开始」卡片，让你不用打开终端就能切换启动器的**守护模式**。

## 是什么

- 在插件配置列表里注册一张「快速开始」卡片（与 Web search 等插件并列）；
- 卡片展开后是「守护模式」开关；
- 切换开关 = 写 `~/.dsh-quickstart.json` 的 `watch` 字段，并**重启一次 dsh** 让新配置生效；
- 重启前会弹确认框，明确提示「当前会话会中断」。

## 前置条件

- 已安装 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh web` 可正常启动）；
- 已安装 [dsh-quickstart](https://www.npmjs.com/package/dsh-quickstart) 启动器（`npm i -g dsh-quickstart`）。

> 守护模式本身由 dsh-quickstart 启动器执行——它必须待在 DSH 进程之外，才能在被守护对象崩溃时把它拉起来。本插件只负责「遥控」：读写配置 + 触发重启。

## 安装

```sh
dsh plugin --profile web add dsh-quickstart-plugin
```

装完重启 `dsh web`：

```sh
dsh web        # 或 systemctl --user restart dsh-web.service（若已做 systemd 守护）
```

刷新页面后，**设置 → 插件 → 插件配置** 里会出现「快速开始」卡片。

## 使用

1. 打开 设置 → 插件 → 插件配置；
2. 点「快速开始」卡片展开（默认收起）；
3. 点「守护模式」开关；
4. 在确认框里点「确认并重启」。

开启后，dsh 进程崩溃或被要求重启时，由 dsh-quickstart 的 watchdog 自动拉起。关闭则恢复为「退出后需手动重启」。

## 配置

开关写的是启动器读取的同一个配置文件 `~/.dsh-quickstart.json`：

```json
{
  "watch": true,
  "maxRestarts": 10,
  "restartDelayMs": 3000
}
```

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `watch` | `false` | 是否启用守护模式 |
| `maxRestarts` | `10` | watchdog 最多重启次数，超过后放弃 |
| `restartDelayMs` | `3000` | 两次重启之间的间隔（毫秒） |

也可以通过 CLI 直接操作（绕过本插件）：

```sh
dsh-quickstart watch              # 一次性以守护模式启动
dsh-quickstart --watch            # 显式开启
dsh-quickstart --no-watch         # 显式关闭
```

## 工作原理

| 半区 | 文件 | 作用 |
| --- | --- | --- |
| Host | `lib/index.js` | 注册 `GET/POST /api/dsh-quickstart/config`（读写 `~/.dsh-quickstart.json`）与 `POST /api/dsh-quickstart/restart`（触发重启） |
| Client | `lib/client.js` | 注册「快速开始」卡片（`settings.plugin.item`）+ 守护模式配置项（子 slot），视觉对齐官方 PluginCard / field |

**重启逻辑**：Host 端优先检测 systemd user service（`dsh-web.service`）并调用 `systemctl --user restart`；否则延迟 800ms 自退出，依赖外部守护（systemd `Restart=always` 或 dsh-quickstart watchdog）拉起。

**配置写入有界**：Host 路由只接受 `watch` / `maxRestarts` / `restartDelayMs` 三个已知字段，任意内容不会落盘；不接触任何 API Key。

## 安全

- 配置文件只存开关，不存密钥；DeepSeek API Key 由 DSH 凭据服务管理，本插件不接触。
- 守护切换是显式动作（UI 确认弹窗），无静默进程控制。
- 无网络回传、无遥测。

详见 [安全政策](https://github.com/qzhqzh/dsh-quickstart/blob/main/SECURITY.md)。

## 贡献

欢迎贡献！请阅读 [贡献指南](https://github.com/qzhqzh/dsh-quickstart/blob/main/CONTRIBUTING.md)。

## License

MIT

---

<a name="english"></a>

# dsh-quickstart-plugin (English)

A companion DSH plugin for the [dsh-quickstart](https://www.npmjs.com/package/dsh-quickstart) launcher: it registers a **「快速开始」(Quick Start)** card in **Settings → Plugins → Plugin config**, so you can toggle the launcher's **watchdog mode** from the web UI instead of the terminal.

- The card expands to a **守护模式 (watchdog)** switch.
- Toggling writes `~/.dsh-quickstart.json` and **restarts dsh once** after an explicit confirm dialog.
- The watchdog itself runs outside DSH (the launcher); this plugin only reads/writes config and triggers the restart.

## Install

```sh
dsh plugin --profile web add dsh-quickstart-plugin
```

Then restart `dsh web` and open **Settings → Plugins → Plugin config → 快速开始**.

## Config

The switch edits the same `~/.dsh-quickstart.json` the launcher reads:

```json
{ "watch": true, "maxRestarts": 10, "restartDelayMs": 3000 }
```

## License

MIT
