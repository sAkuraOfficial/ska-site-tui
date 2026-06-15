/** @jsxImportSource @opentui/solid */
import { TextAttributes, type SelectOption } from "@opentui/core";
import { createMemo, onCleanup } from "solid-js";
import { useTerminalDimensions } from "@opentui/solid";
import { useTheme } from "../context/ThemeContext";
import { useDialog, type DialogContext } from "./dialog";

export function ThemeDialog() {
  const dialog = useDialog();
  const { theme, selected, all, set } = useTheme();
  const dimensions = useTerminalDimensions();
  const initialTheme = selected();
  let confirmed = false;

  // Restore original theme on Esc (component cleanup without confirmation)
  onCleanup(() => {
    if (!confirmed) {
      set(initialTheme);
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

  return (
    <box
      paddingLeft={2}
      paddingRight={2}
      gap={1}
      flexDirection="column"
      flexGrow={1}
      flexShrink={1}
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
      <box paddingBottom={1}>
        <text fg={theme.textMuted}>当前: </text>
        <text fg={theme.primary} attributes={TextAttributes.BOLD}>
          {selected()}
        </text>
      </box>

      {/* Theme select */}
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
        focused={true}
        keyBindings={[{ name: "enter", action: "select-current" }]}
        onChange={handleChange}
        onSelect={handleConfirm}
      />

      {/* Keyboard hints */}
      <text fg={theme.textMuted}>↑↓ 选择 | Enter 确认 | Esc 关闭</text>
    </box>
  );
}

ThemeDialog.show = (dialog: DialogContext) => {
  return new Promise<void>((resolve) => {
    dialog.setSize("xlarge");
    dialog.replace(
      () => <ThemeDialog />,
      () => resolve(),
    );
  });
};
