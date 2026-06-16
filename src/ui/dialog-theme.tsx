/** @jsxImportSource @opentui/solid */
import { TextAttributes, type SelectOption } from "@opentui/core";
import { createMemo, createSignal, onCleanup } from "solid-js";
import { useKeyboard, useTerminalDimensions } from "@opentui/solid";
import { useTheme } from "../context/ThemeContext";
import { useDialog, type DialogContext } from "./dialog";

type FocusTarget = "mode" | "select";

export function ThemeDialog() {
  const dialog = useDialog();
  const { theme, selected, all, set, mode, setMode } = useTheme();
  const dimensions = useTerminalDimensions();
  const initialTheme = selected();
  const initialMode = mode();
  let confirmed = false;

  // Focus management: Tab cycles between "mode" and "select"
  const [focusTarget, setFocusTarget] = createSignal<FocusTarget>("select");

  useKeyboard((key) => {
    if (key.name === "tab") {
      // Shift+Tab goes backwards, Tab goes forwards
      setFocusTarget((prev) => (prev === "mode" ? "select" : "mode"));
      return;
    }
    // When focus is on mode toggle, handle left/right to switch
    if (focusTarget() === "mode") {
      if (key.name === "left" || key.name === "right") {
        setMode(mode() === "dark" ? "light" : "dark");
      } else if (key.name === "enter" || key.name === "return") {
        confirmed = true;
        dialog.clear();
      }
    }
  });

  // Restore original theme on Esc (component cleanup without confirmation)
  onCleanup(() => {
    if (!confirmed) {
      set(initialTheme);
      setMode(initialMode);
    }
  });

  const themes = Object.keys(all());

  // Calculate select height like opencode: min of rows and half terminal height minus padding
  const selectHeight = createMemo(() => {
    const rowCount = themes.length;
    const maxByTerminal = Math.floor(dimensions().height / 2) - 6;
    return Math.min(rowCount, maxByTerminal);
  });

  const options = createMemo(() =>
    themes.map((name) => ({ name, description: "", value: name })),
  );

  const initialIndex = createMemo(() => {
    const idx = themes.indexOf(selected());
    return idx >= 0 ? idx : 0;
  });

  // Live preview: apply theme on highlight change (up/down navigation)
  const handleChange = (_index: number, option: SelectOption | null) => {
    if (option?.value) {
      set(option.value);
    }
  };

  // Confirm selection on Enter
  const handleConfirm = (_index: number, option: SelectOption | null) => {
    if (option?.value) {
      confirmed = true;
      set(option.value);
      dialog.clear();
    }
  };

  const isDark = () => mode() === "dark";
  const isModeFocused = () => focusTarget() === "mode";

  return (
    <box
      paddingLeft={2}
      paddingRight={2}
      // gap={1}
      flexDirection="column"
      flexGrow={1}
      flexShrink={1}
      paddingBottom={1}
    >
      {/* Title */}
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          选择主题
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>

      {/* Current theme name */}

      {/* Theme select */}
      <box
        border={true}
        borderStyle="rounded"
        borderColor={
          focusTarget() === "select" ? theme.accent : theme.backgroundPanel
        }
        flexGrow={1}
        flexShrink={1}
        onMouseDown={() => setFocusTarget("select")}
      >
        <select
          style={{
            backgroundColor: theme.backgroundPanel,
            textColor: theme.textMuted,
            focusedBackgroundColor: theme.backgroundElement,
            focusedTextColor: theme.text,
            selectedBackgroundColor: theme.accent,
            selectedTextColor: theme.text,
            descriptionColor: theme.textMuted,
            selectedDescriptionColor: theme.textMuted,
            showDescription: false,
            showScrollIndicator: true,
            wrapSelection: true,
            height: selectHeight(),
          }}
          options={options()}
          selectedIndex={initialIndex()}
          focused={focusTarget() === "select"}
          keyBindings={[{ name: "enter", action: "select-current" }]}
          onChange={handleChange}
          onSelect={handleConfirm}
        />
      </box>
      {/* Dark/Light mode toggle */}
      <box
        flexDirection="column"
        border={true}
        borderStyle="rounded"
        borderColor={isModeFocused() ? theme.accent : theme.backgroundPanel}
        onMouseDown={() => setFocusTarget("mode")}
      >
        <box flexDirection="row" gap={2}>
          <text fg={theme.textMuted}>当前: </text>
          <text fg={theme.primary} attributes={TextAttributes.BOLD}>
            {selected()}
          </text>
        </box>
        <box flexDirection="row" gap={3}>
          <text fg={theme.textMuted}>模式:</text>
          <text
            // fg={isDark() ? theme.accent : theme.textMuted}
            fg={theme.secondary}
            attributes={isDark() ? TextAttributes.BOLD : undefined}
            onMouseUp={() => setMode("dark")}
          >
            {isDark() ? "● " : "○ "}深色
          </text>
          <text
            fg={theme.secondary}
            // fg={!isDark() ? theme.accent : theme.textMuted}
            attributes={!isDark() ? TextAttributes.BOLD : undefined}
            onMouseUp={() => setMode("light")}
          >
            {!isDark() ? "● " : "○ "}浅色
          </text>
        </box>
      </box>

      {/* Keyboard hints */}
      <text fg={theme.textMuted}>
        Tab 切换区域 | ←→ 切换模式 | ↑↓ 选择主题 | Enter 确认 | Esc 关闭
      </text>
    </box>
  );
}

ThemeDialog.show = (dialog: DialogContext) => {
  return new Promise<void>((resolve) => {
    dialog.setSize("large");
    dialog.replace(
      () => <ThemeDialog />,
      () => resolve(),
    );
  });
};
