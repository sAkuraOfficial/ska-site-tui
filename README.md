<div align="center">

# SKA-SITE-TUI

**基于 OpenTUI/Solid.JS 的终端 UI 博客服务端，内置 AI 聊天助手，通过 SSH 协议对外提供服务。**

**本服务端为[https://blog.sakura-io.com/](https://blog.sakura-io.com/)提供服务**

![Stars](https://www.shieldcn.dev/github/stars/sakuraofficial/ska-site-tui.svg?variant=secondary&size=sm) ![Commit](https://www.shieldcn.dev/github/last-commit/sakuraofficial/ska-site-tui.svg?variant=secondary&size=sm) ![CI](https://www.shieldcn.dev/github/ci/sakuraofficial/ska-site-tui.svg?variant=secondary&size=sm) ![License](https://www.shieldcn.dev/github/license/sakuraofficial/ska-site-tui.svg?variant=ghost&size=sm) ![Bun](https://www.shieldcn.dev/badge/Package_mgr-Bun-000000.svg?logo=bun&variant=branded&size=sm) ![Docker](https://www.shieldcn.dev/badge/Container-Docker-2496ED.svg?logo=docker&variant=branded&size=sm) ![TypeScript](https://www.shieldcn.dev/badge/Language-TypeScript-3178C6.svg?logo=typescript&variant=branded&size=sm) ![AI SDK](https://www.shieldcn.dev/badge/Stack-AI_SDK-000000.svg?logo=vercel&variant=branded&size=sm) ![Solid](https://www.shieldcn.dev/badge/Stack-Solid-2C4F7C.svg?logo=solid&variant=branded&size=sm)

</div>

<p align="center">
  <video src="docs/demo.mp4" controls loop muted playsinline width="640"></video>
</p>

## 快速开始

### Docker 部署

```bash
docker-compose up -d
```

### 手动构建

```bash
bun install
bun run build
```

### 连接

```bash
ssh -p 2222 user@your-server
```

> 任意用户名即可，无需密码。

## 环境变量

参考 `.env.example` 文件，创建 `.env` 文件。

## 技术栈

| 类别       | 技术              |
| ---------- | ----------------- |
| 运行时     | Bun               |
| UI 框架    | SolidJS + OpenTUI |
| SSH 服务端 | @opentui/ssh      |
| AI         | Vercel AI SDK     |
| 记忆系统   | Hindsight（可选） |

## License

[MIT](LICENSE)
