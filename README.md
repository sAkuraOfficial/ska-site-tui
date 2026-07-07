<div align="center">

# SKA-SITE-TUI

**基于 OpenTUI/Solid.JS 的终端 UI 博客服务端，内置 AI 聊天助手，通过 SSH 协议对外提供服务。**

**本服务端为[https://blog.sakura-io.com/](https://blog.sakura-io.com/)提供服务**

```bash
ssh -p 2222 blog.sakuraofficial.site
```

```bash
ssh -p 2222 13.229.180.39
```

![License](https://www.shieldcn.dev/github/license/sakuraofficial/ska-site-tui.svg?variant=ghost&size=sm) 

![Stars](https://www.shieldcn.dev/github/stars/sakuraofficial/ska-site-tui.svg?variant=secondary&size=sm) ![Commit](https://www.shieldcn.dev/github/last-commit/sakuraofficial/ska-site-tui.svg?variant=secondary&size=sm) ![CI](https://www.shieldcn.dev/github/ci/sakuraofficial/ska-site-tui.svg?variant=secondary&size=sm)

</div>



https://github.com/user-attachments/assets/2b6283c4-a1fd-42d4-b4c7-f276a1d8579b



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

 ![TypeScript](https://www.shieldcn.dev/badge/Language-TypeScript-3178C6.svg?logo=typescript&variant=branded&size=sm) ![AI SDK](https://www.shieldcn.dev/badge/Stack-AI_SDK-000000.svg?logo=vercel&variant=branded&size=sm) ![Solid](https://www.shieldcn.dev/badge/Stack-Solid-2C4F7C.svg?logo=solid&variant=branded&size=sm)

| 类别       | 技术              |
| ---------- | ----------------- |
| 运行时     | Bun               |
| UI 框架    | SolidJS + OpenTUI |
| SSH 服务端 | @opentui/ssh      |
| AI         | Vercel AI SDK     |
| 记忆系统   | Hindsight（可选） |

## 支持二次开发

本博客服务端由于使用了统一类型封装，因此不局限于HALO博客，可轻易剖离HALO博客的API，对接**各种博客后端**

你可以使用AI工具进行后端接口替换。


## License

[MIT](LICENSE)


## 附录

### docker-compose：1panel+halo部署方法
```yml
services:
  ska-site-tui:
    build: .
    image: ghcr.io/sakuraofficial/ska-site-tui:latest
    container_name: ska-site-tui
    restart: unless-stopped
    ports:
      - "${PORT:-2222}:2222" #这里是端口
    volumes:
      - ./data/keys:/app/.keys
      - ./.data:/app/.data
    environment:
      - PORT=2222 #这里是端口
      - HALO_BASE_URL=http://halo:8090 #这里是halo的地址，无需改动，是1panel部署halo的默认地址
      - AI_BASE_URL=https://xxxx/v1   # 或任何 OpenAI 兼容 API
      - AI_API_KEY=xxxxx
      - AI_MODEL=xxx                   # 模型名
      - OTUI_USE_CONSOLE=false
      - SHOW_CONSOLE=false
    networks:
      - 1panel-network

networks:
  1panel-network:
    external: true
```
