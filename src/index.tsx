import { createServer } from "@opentui/ssh";
import { createRoot, useTerminalDimensions } from "@opentui/react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { MainContent } from "./components/MainContent";
import { ThemeProvider } from "./context/ThemeContext";

const PORT = Number(process.env.PORT ?? 2222);

function App({ name }: { name: string }) {
  const { width: terminalWidth } = useTerminalDimensions();
  const sidebarWidth = Math.max(15, Math.floor(terminalWidth * 0.2));

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        alignItems: "stretch",
        border: true,
        borderStyle: "single",
      }}
      title=" SKA-SITE://ROOT "
      titleAlignment="left"
    >
      <Header name={name} />
      <box
        style={{
          flexGrow: 1,
          flexShrink: 1,
          flexDirection: "row",
          alignItems: "stretch",
          gap: 0,
        }}
      >
        <Sidebar width={sidebarWidth} />
        <MainContent />
      </box>
    </box>
  );
}

const server = createServer({
  hostKey: { path: "./.keys/host_key" },
  auth: { publicKey: "any" },
}).serve((session) => {
  session.renderer.targetFps = 60;
  const root = createRoot(session.renderer);
  root.render(<ThemeProvider><App name={session.identity.username} /></ThemeProvider>);
  session.renderer.keyInput.on("keypress", (key) => {
    if (key.name === "q" || (key.ctrl && key.name === "c")) session.end();
  });
  session.onClose(() => root.unmount());
});

await server.listen(PORT);

process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});
