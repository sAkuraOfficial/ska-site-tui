import { watch, utimesSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "@opentui/ssh";
import { render, useTerminalDimensions } from "@opentui/solid";
import { createStore } from "solid-js/store";
import { FocusProvider } from "./context/FocusContext"; // 导入你刚才写的代码

// Auto-restart helper for Bun watch mode on Windows since Bun does not watch files compiled by custom plugins
if (
  process.execArgv.includes("--watch") ||
  process.execArgv.includes("--hot")
) {
  const entryFile = resolve(import.meta.dir, "index.tsx");
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

    try {
      const now = new Date();
      utimesSync(entryFile, now, now);
    } catch {
      // Ignore transient errors
    }
  });
}
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { MainContent } from "./components/MainContent";
import { ThemeProvider } from "./context/ThemeContext";
import { DialogProvider, useDialog } from "./ui/dialog";
import { ShortcutBar } from "./components/ShortcutBar";
import { ThemeDialog } from "./ui/dialog-theme";
import { UserInfoDialog } from "./ui/dialog-user-info";
import { SessionProvider } from "./context/SessionContext";
import { useRenderer } from "@opentui/solid";
import { onCleanup } from "solid-js";

const PORT = Number(process.env.PORT ?? 2222);

function KeyboardHandler() {
  const dialog = useDialog();
  const renderer = useRenderer();

  const keyHandler = (key: { name: string; ctrl?: boolean }) => {
    if (key.ctrl && key.name === "t") {
      ThemeDialog.show(dialog);
    }
    if (key.ctrl && key.name === "u") {
      UserInfoDialog.show(dialog);
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
  const sidebarWidth = Math.max(
    15,
    Math.floor(terminalDimensions().width * 0.1),
  );

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
      bottomTitle="  Ctrl+T 主题   Ctrl+U 用户信息   Q/Ctrl+C 退出  "
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
      </box>
      {/* <ShortcutBar /> */}
    </box>
  );
}

function App({
  name,
  sessionInfo,
}: {
  name: string;
  sessionInfo: import("./context/SessionContext").SessionInfo;
}) {
  return (
    <ThemeProvider>
      <SessionProvider session={sessionInfo}>
        <DialogProvider>
          <KeyboardHandler />
          <FocusProvider groups={["sidebar", "main"]}>
            <AppContent name={name} />
          </FocusProvider>
        </DialogProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

const server = createServer({
  hostKey: { path: "./.keys/host_key" },
  auth: { publicKey: "any" },
}).serve((session) => {
  session.renderer.targetFps = 60;
  const [sessionStore, setSessionStore] = createStore({
    username: session.identity.username,
    method: session.identity.method,
    fingerprint:
      session.identity.method === "publickey"
        ? session.identity.fingerprint
        : undefined,
    publicKey:
      session.identity.method === "publickey"
        ? session.identity.publicKey
        : undefined,
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
    () => <App name={session.identity.username} sessionInfo={sessionStore} />,
    session.renderer,
  );
  session.renderer.keyInput.on("keypress", (key) => {
    if (key.name === "q" || (key.ctrl && key.name === "c")) session.end();
  });
  session.onClose(() => {});
});

// await server.listen(PORT);
await server.listen(PORT, "0.0.0.0");

process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});
