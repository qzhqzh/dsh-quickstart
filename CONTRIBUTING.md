# 贡献指南

感谢你愿意为 **dsh-quickstart** 贡献！无论是修 Bug、加功能、补文档还是报 Issue，都欢迎。

## 行为准则

- 尊重他人，建设性沟通；
- 不提交密钥、Token、密码或 `.env` 等敏感文件；
- 不引入绕过 DeepSeek 官方计费、爬取官方数据，或绕过 DSH 沙箱/权限边界的逻辑；
- 不在提交里夹带本地机器信息（写死的会话 ID、绝对路径等）。

## 项目结构

```
bin/dsh-quickstart.js   CLI 入口（launch / watch / shortcut 子命令）
lib/index.js            核心库（启动、就绪轮询、看门狗、快捷方式）
plugin/                 配套 DSH 插件（设置 → 插件 → 插件配置 → 「快速开始」）
  lib/index.js          Host 半：配置读写 + 重启路由
  lib/client.js         Client 半：快速开始卡片 + 守护模式配置
assets/                 图标资源
test/smoke.js           冒烟测试
```

## 开发流程

```bash
git clone https://github.com/qzhqzh/dsh-quickstart.git
cd dsh-quickstart

# 语法检查
node --check lib/index.js
node --check bin/dsh-quickstart.js
node --check plugin/lib/index.js
node --check plugin/lib/client.js

# 冒烟测试
node test/smoke.js
```

## 提交规范

- 提交信息使用 Conventional Commits 风格：

  ```
  feat: 新增 …
  fix: 修复 …
  docs: 更新文档 …
  refactor: 重构 …
  test: 补充测试 …
  ```

- 一次提交只做一件事，保持可读；
- 不要在一次提交里混入无关改动。

## 提 PR 前检查

- [ ] 代码通过 `node --check` 与冒烟测试；
- [ ] 未引入明文密钥 / 密码 / 会话 ID / 绝对路径；
- [ ] 未绕过 DSH 沙箱 / 权限边界；
- [ ] 新功能 / 行为变化已更新 README；
- [ ] 使用 PR 模板（`.github/PULL_REQUEST_TEMPLATE.md`）描述改动。

## 如何报告 Bug

使用 [Bug 反馈模板](.github/ISSUE_TEMPLATE/bug_report.yml)，提供：版本、运行环境、
复现步骤、预期/实际行为、日志（隐去任何敏感信息）。
