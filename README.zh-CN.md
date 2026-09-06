# Xintinglei Website（简体中文说明）

[English](README.md) | [简体中文](README.zh-CN.md)

> **仅供参考：本文件为英文版 [README.md](README.md) 的简体中文参考译文；如有任何不一致，以英文版为准。**

新亭泪（Xintinglei）Minecraft 社区官网与自托管服务器状态服务。

- 对外项目名称：`Xintinglei Website`
- 代码作者：`BaizhouziYou`
- 计划中的源码地址：<https://github.com/BaizhouziYou/xintinglei-website>
- 代码许可证：`AGPL-3.0-only`，并适用[附加条款](docs/ADDITIONAL_TERMS.zh-CN.md)

## 中文文档索引

- [附加条款](docs/ADDITIONAL_TERMS.zh-CN.md)
- [媒体资产登记与许可](docs/ASSET-LICENSES.zh-CN.md)
- [更新记录](docs/CHANGELOG.zh-CN.md)
- [贡献指南](docs/CONTRIBUTING.zh-CN.md)
- [公告与权利声明](docs/NOTICE.zh-CN.md)
- [安全策略](docs/SECURITY.zh-CN.md)
- [商标与品牌政策](docs/TRADEMARKS.zh-CN.md)
- [许可证说明](docs/LICENSE.zh-CN.md)

## 包含内容

- 静态 HTML、CSS、JavaScript 官网；
- Node.js 状态 API 与 WebSocket 延迟测试端点；
- 运行时本地创建的 SQLite 状态历史库；
- 受[媒体资产声明](docs/ASSET-LICENSES.zh-CN.md)约束的图片资源（均保留所有权利）。

## 本地启动

需要 Node.js 20.6 或更高版本。

```powershell
Copy-Item .env.example .env
cd server
npm ci
npm start
```

使用任意静态文件服务器托管仓库根目录，再打开 `status.html`。已提交的 `assets/js/config.js` 默认连接 `http://localhost:3000`；部署自己的实例时，请以 `assets/js/config.example.js` 为模板修改配置。

手动采集一次服务器状态：

```powershell
cd server
npm run monitor
```

## 部署提醒

- 将 `CORS_ORIGINS` 设置为实际官网来源。
- 除非已明确告知用户且有隐私政策，否则保持 `SHOW_PLAYER_NAMES=false`。
- 不要上传 `server/data/status.db`、`.env`、日志、证书文件或 Web 服务器控制文件。
- Fork 必须更换新亭泪品牌和受保护图片；仍须保留要求的来源署名。

## 验证

```powershell
cd server
npm run check
npm test
npm audit --omit=dev --audit-level=high
```
