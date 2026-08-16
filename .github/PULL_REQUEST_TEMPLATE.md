## 变更描述

<!-- 简述本次改动解决了什么问题、改了什么 -->

- [ ] 我的改动是必要且自包含的

## 关联 Issue

<!-- 如有，填写关联的 issue 编号，如 #12 -->

Closes #

## 改动范围

<!-- 勾选实际改动的模块 -->

- [ ] lib/index.js（启动 / 就绪轮询 / 看门狗 / 快捷方式）
- [ ] bin/dsh-quickstart.js（CLI 子命令与参数）
- [ ] plugin/lib/index.js（配套插件 Host 半：配置读写 / 重启路由）
- [ ] plugin/lib/client.js（配套插件 Client 半：快速开始卡片 / 守护开关）
- [ ] package.json / cordis.patch.yml（元数据与补丁）
- [ ] assets / docs / README / 模板

## 测试

- [ ] `node --check` 语法检查通过（lib / bin / plugin/lib）
- [ ] `node test/smoke.js` 冒烟测试通过
- [ ] 已手工验证关键路径（启动 / watch 守护 / 快捷方式 / 设置页开关）

## 安全检查

- [ ] 未在代码 / 文档 / 提交中引入明文密钥、会话 ID 或绝对路径
- [ ] 未绕过 DSH 沙箱 / 权限边界
- [ ] 未引入新的运行时依赖（如确需，已在 package.json 声明）

## 备注

<!-- 其它需要 reviewers 关注的点 -->
