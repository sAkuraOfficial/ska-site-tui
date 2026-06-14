import { useState, useCallback, useRef, useMemo } from "react";
import { useKeyboard } from "@opentui/react";
import { TextAttributes, type SelectOption } from "@opentui/core";
import { useTheme } from "../context/ThemeContext";

export function Sidebar({ width }: { width: number }) {
  const { theme, selected, all, set } = useTheme();
  const themes = Object.keys(all());

  // Build SelectOption list from themes
  const options: SelectOption[] = useMemo(
    () => themes.map((name) => ({ name, description: "", value: name })),
    [themes],
  );

  // Find initial selected index
  const initialIndex = useMemo(() => {
    const idx = themes.indexOf(selected);
    return idx >= 0 ? idx : 0;
  }, [themes, selected]);

  // Handle theme selection from <select>
  const handleSelect = useCallback(
    (_index: number, option: SelectOption | null) => {
      if (option?.value) {
        set(option.value);
      }
    },
    [set],
  );

  return (
    <box
      style={{
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: width,
        minWidth: 15,
        height: "auto",
        flexDirection: "column",
        backgroundColor: theme.backgroundPanel,
        alignItems: "stretch",
        justifyContent: "flex-start",
        margin: 0,
        padding: 0,
      }}
    >
      {/* Header */}
      <box
        style={{
          height: 3,
          backgroundColor: theme.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <text
          style={{
            bg: theme.background,
            fg: theme.text,
            attributes:
              TextAttributes.BOLD |
              TextAttributes.ITALIC |
              TextAttributes.STRIKETHROUGH,
          }}
        >
          🎨 主题效果展示
        </text>
      </box>

      {/* Instructions */}
      <box
        style={{
          height: 2,
          backgroundColor: theme.backgroundElement,
          alignItems: "center",
          justifyContent: "center",
          paddingLeft: 1,
        }}
      >
        <text style={{ fg: theme.textMuted }}>↑↓选择 | Enter确认</text>
      </box>

      {/* Theme List - using native <select> component */}
      <select
        style={{
          flexGrow: 1,
          backgroundColor: theme.backgroundPanel,
          textColor: theme.textMuted,
          focusedBackgroundColor: theme.backgroundElement,
          focusedTextColor: theme.text,
          selectedBackgroundColor: theme.accent,
          selectedTextColor: theme.text,
          descriptionColor: theme.textMuted,
          selectedDescriptionColor: theme.textMuted,
          showDescription: false,
          showScrollIndicator: false,
          wrapSelection: false,
        }}
        options={options}
        selectedIndex={initialIndex}
        focused={true}
        onSelect={handleSelect}
      />

      {/* Footer Info */}
      <box
        style={{
          height: 3,
          border: true,
          borderStyle: "single",
          borderColor: theme.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <text style={{ fg: theme.textMuted }}>
          共{themes.length}
          个主题
        </text>
      </box>
    </box>
  );
}
