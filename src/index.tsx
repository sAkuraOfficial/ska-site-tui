import { watch, utimesSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "@opentui/ssh";
import { render, useTerminalDimensions } from "@opentui/solid";
import { Show } from "solid-js";
import { createStore } from "solid-js/store";
import { FocusProvider } from "./context/FocusContext"; // 导入你刚才写的代码
import { getTreeSitterClient, addDefaultParsers } from "@opentui/core";
import parsers from "./theme/parsers-config";

// // Auto-restart helper for Bun watch mode on Windows since Bun does not watch files compiled by custom plugins
if (
  process.execArgv.includes("--watch") ||
  process.execArgv.includes("--hot")
) {
  const entryFile = resolve(import.meta.dir, "index.tsx");
  let restartTimer: NodeJS.Timeout | null = null;

  watch(import.meta.dir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const fullPath = resolve(import.meta.dir, filename);
    if (fullPath === entryFile) return;
    if (
      filename.startsWith(".") ||
      filename.includes(".git") ||
      filename.includes("node_modules")
    )
      return;

    // Debounce: clear existing timer and set a new one
    if (restartTimer) {
      clearTimeout(restartTimer);
    }

    restartTimer = setTimeout(() => {
      try {
        const now = new Date();
        utimesSync(entryFile, now, now);
      } catch {
        // Ignore transient errors
      }
      restartTimer = null;
    }, 1000); // 1 second delay
  });
}
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { MainContent } from "./components/MainContent";
import { ThemeProvider } from "./context/ThemeContext";
import { ChatProvider } from "./context/ChatContext";
import { DialogProvider, useDialog } from "./ui/dialog";
import { ShortcutBar } from "./components/ShortcutBar";
import { ThemeDialog } from "./ui/dialog-theme";
import { UserInfoDialog } from "./ui/dialog-user-info";
import { SessionProvider } from "./context/SessionContext";
import { PostProvider } from "./context/PostContext";
import { useRenderer } from "@opentui/solid";
import { onCleanup } from "solid-js";
import { usePostContext } from "./context/PostContext";
import { useSession } from "./context/SessionContext";

const PORT = Number(process.env.PORT ?? 2222);

function KeyboardHandler() {
  const dialog = useDialog();
  const renderer = useRenderer();
  const { showPost, setShowPost } = usePostContext();
  const session = useSession();

  const keyHandler = (key: { name: string; ctrl?: boolean }) => {
    if (key.ctrl && key.name === "t") {
      ThemeDialog.show(dialog);
    }
    if (key.ctrl && key.name === "u") {
      UserInfoDialog.show(dialog);
    }
    // ESC：弹窗已由 dialog 自行处理；全局范围内返回首页或断开连接
    if (key.name === "escape") {
      if (dialog.stack.length > 0) return;
      if (showPost() != null) {
        setShowPost(null);
      } else {
        session.endSession();
      }
    }
  };

  renderer.keyInput.on("keypress", keyHandler);
  onCleanup(() => {
    renderer.keyInput.removeListener("keypress", keyHandler);
  });

  return null;
}

function AppContent({ name }: { name: string }) {
  const terminalDimensions = useTerminalDimensions();
  // const sidebarWidth = Math.max(
  //   15,
  //   Math.floor(terminalDimensions().width * 0.1),
  // );

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        alignItems: "stretch",
        // border: ["top", "left", "right", "bottom"],
        // borderStyle: "heavy",
      }}
      title=" SKA-SITE://ROOT "
      titleAlignment="left"
      bottomTitle="  Ctrl+T 主题   Ctrl+U 用户信息   ESC 返回/断开   Q/Ctrl+C 退出  "
      bottomTitleAlignment="center"
    >
      {/* <Header name={name} /> */}
      <box
        style={{
          flexGrow: 1,
          flexShrink: 1,
          flexDirection: "row",
          alignItems: "stretch",
          gap: 0,
        }}
      >
        {/* <Sidebar width={sidebarWidth} /> */}

        <MainContent />
        {/* <Sidebar width={sidebarWidth} /> */}
        <Show
          when={
            !!(
              process.env.AI_BASE_URL &&
              process.env.AI_API_KEY &&
              process.env.AI_MODEL
            )
          }
        >
          <Sidebar width="30%" />
        </Show>
      </box>
      {/* <ShortcutBar /> */}
    </box>
  );
}

function App({
  name,
  sessionInfo,
  endSession,
}: {
  name: string;
  sessionInfo: import("./context/SessionContext").SessionInfo;
  endSession: () => void;
}) {
  return (
    <ThemeProvider>
      <SessionProvider session={sessionInfo} endSession={endSession}>
        <ChatProvider>
          <PostProvider>
            <DialogProvider>
              <KeyboardHandler />
              {/* 这里数组会影响初始焦点顺序 */}
              <FocusProvider groups={["main", "sidebar"]}>
                <AppContent name={name} />
              </FocusProvider>
            </DialogProvider>
          </PostProvider>
        </ChatProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

// 遍历 parsers-config 中的所有解析器并注册
const treeSitterClient = getTreeSitterClient();
for (const parser of parsers.parsers) {
  treeSitterClient.addFiletypeParser(parser);
}

const server = createServer({
  hostKey: { path: "./.keys/host_key" },
  // auth: { publicKey: "any" },
  auth: "open",
}).serve((session) => {
  session.renderer.targetFps = 60;
  const [sessionStore, setSessionStore] = createStore({
    username: session.identity.username,
    method: session.identity.method,
    fingerprint:
      // session.identity.method === "publickey"
      //   ? session.identity.fingerprint
      //   : undefined,
      undefined,
    publicKey:
      // session.identity.method === "publickey"
      //   ? session.identity.publicKey
      //   : undefined,
      undefined,
    remoteAddress: session.remoteAddress,
    term: session.term,
    cols: session.cols,
    rows: session.rows,
    hasPty: session.hasPty,
  });
  session.renderer.on("resize", (width, height) => {
    setSessionStore("cols", width);
    setSessionStore("rows", height);
  });
  render(
    () => (
      <App
        name={session.identity.username}
        sessionInfo={sessionStore}
        endSession={() => session.end()}
      />
    ),
    session.renderer,
  );

  session.onClose(() => {});
});

// ── 启动诊断：打印环境变量与功能启用状态 ───────────────────────────
const envStatus = {
  HALO_BASE_URL: process.env.HALO_BASE_URL ?? "(未配置)",
  HINDSIGHT_API_URL: process.env.HINDSIGHT_API_URL ?? "(未配置)",
  AI_BASE_URL: process.env.AI_BASE_URL ?? "(未配置)",
  AI_API_KEY: process.env.AI_API_KEY ? "****" : "(未配置)",
  AI_MODEL: process.env.AI_MODEL ?? "(未配置)",
};
const aiChatEnabled = !!(
  envStatus.AI_BASE_URL !== "(未配置)" &&
  envStatus.AI_API_KEY !== "(未配置)" &&
  envStatus.AI_MODEL !== "(未配置)"
);
const memoryEnabled = envStatus.HINDSIGHT_API_URL !== "(未配置)";

console.log("\n── SKA-SITE 启动诊断 ──────────────────────");
for (const [key, val] of Object.entries(envStatus)) {
  console.log(`  ${key.padEnd(20)} ${val}`);
}
console.log("--------------------------------------------");
console.log(`  AI Chat ........... ${aiChatEnabled ? "已启用" : "未启用"}`);
console.log(`  记忆系统 .......... ${memoryEnabled ? "已启用" : "未启用"}`);
console.log("────────────────────────────────────────────\n");

// ──────────────────────────────────────────────────────────────────────

try {
  await server.listen(PORT, "0.0.0.0");
} catch (err: any) {
  console.error(`\n服务启动失败: ${err.message ?? err}`);
  if (err.code === "EADDRINUSE") {
    console.error(`  端口 ${PORT} 已被占用，请关闭占用该端口的进程后重试。`);
  }
  process.exit(1);
}

process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});
