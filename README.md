# Xintinglei Website

English | [简体中文](README.zh-CN.md)

新亭泪（Xintinglei）Minecraft 社区官网与自托管服务器状态服务。

- Public project name: `Xintinglei Website`
- Code author: `BaizhouziYou`
- Source repository: <https://github.com/BaizhouziYou/xintinglei-website>
- License: `AGPL-3.0-only` with [additional terms](docs/ADDITIONAL_TERMS.md)

## Documentation

Simplified Chinese documents are provided for convenience only. The English documents are the authoritative versions and control if there is any difference. See [README.zh-CN.md](README.zh-CN.md) for the Chinese documentation index.

- [Additional terms](docs/ADDITIONAL_TERMS.md)
- [Media asset register](docs/ASSET-LICENSES.md)
- [Contributing guide](docs/CONTRIBUTING.md)
- [Notices and rights statement](docs/NOTICE.md)
- [Security policy](docs/SECURITY.md)
- [Brand and trademark policy](docs/TRADEMARKS.md)
- [Simplified Chinese license guide](docs/LICENSE.zh-CN.md)

## What is included

- Static HTML, CSS, and JavaScript website;
- Node.js status API and WebSocket ping endpoint;
- SQLite status-history storage created locally at runtime;
- media assets documented in [ASSET-LICENSES.md](docs/ASSET-LICENSES.md), with all rights reserved.

## Local setup

Requires Node.js 20.6 or newer.

```powershell
Copy-Item .env.example .env
cd server
npm ci
npm start
```

Serve the repository root with any static-file server, then open `status.html`. The checked-in `assets/js/config.js` points to `http://localhost:3000`; copy and customize `assets/js/config.example.js` when deploying your own instance.

Run one status sample manually:

```powershell
cd server
npm run monitor
```

## Deployment notes

- Set `CORS_ORIGINS` to your actual website origin.

## Verification

```powershell
cd server
npm run check
npm test
npm audit --omit=dev --audit-level=high
```
