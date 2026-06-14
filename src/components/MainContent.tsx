import { useTheme } from "../context/ThemeContext"

export function MainContent() {
  const { theme, selected } = useTheme()

  return (
    <box
      style={{
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: "auto",
        minWidth: 20,
        height: "auto",
        flexDirection: "column",
        backgroundColor: theme.background,
        alignItems: "stretch",
        justifyContent: "flex-start",
        margin: 0,
        padding: 0,
      }}
    >
      {/* Title Section */}
      <box
        style={{
          height: 5,
          borderBottom: true,
          borderBottomStyle: "single",
          borderBottomColor: theme.border,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 1,
        }}
      >
        <text style={{ color: theme.primary, bold: true }}>
          🎨 主题效果展示
        </text>
        <text style={{ color: theme.textMuted }}>
          当前主题: {selected}
        </text>
      </box>

      {/* Color Palette Section */}
      <box
        style={{
          height: 10,
          borderBottom: true,
          borderBottomStyle: "single",
          borderBottomColor: theme.border,
          flexDirection: "column",
          padding: 1,
        }}
      >
        <text style={{ color: theme.accent, bold: true, marginBottom: 1 }}>
          调色板
        </text>
        <box style={{ flexDirection: "row", height: 3 }}>
          <box style={{ flexGrow: 1, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
            <text style={{ color: theme.text }}>Primary</text>
          </box>
          <box style={{ flexGrow: 1, backgroundColor: theme.secondary, alignItems: "center", justifyContent: "center" }}>
            <text style={{ color: theme.text }}>Secondary</text>
          </box>
          <box style={{ flexGrow: 1, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" }}>
            <text style={{ color: theme.text }}>Accent</text>
          </box>
        </box>
        <box style={{ flexDirection: "row", height: 3 }}>
          <box style={{ flexGrow: 1, backgroundColor: theme.error, alignItems: "center", justifyContent: "center" }}>
            <text style={{ color: theme.text }}>Error</text>
          </box>
          <box style={{ flexGrow: 1, backgroundColor: theme.warning, alignItems: "center", justifyContent: "center" }}>
            <text style={{ color: theme.text }}>Warning</text>
          </box>
          <box style={{ flexGrow: 1, backgroundColor: theme.success, alignItems: "center", justifyContent: "center" }}>
            <text style={{ color: theme.text }}>Success</text>
          </box>
          <box style={{ flexGrow: 1, backgroundColor: theme.info, alignItems: "center", justifyContent: "center" }}>
            <text style={{ color: theme.text }}>Info</text>
          </box>
        </box>
      </box>

      {/* Status Indicators Section */}
      <box
        style={{
          height: 8,
          borderBottom: true,
          borderBottomStyle: "single",
          borderBottomColor: theme.border,
          flexDirection: "column",
          padding: 1,
        }}
      >
        <text style={{ color: theme.accent, bold: true, marginBottom: 1 }}>
          状态指示器
        </text>
        <box style={{ flexDirection: "row", height: 1, marginBottom: 1 }}>
          <text style={{ color: theme.error }}>  ✗ 错误状态</text>
          <text style={{ color: theme.warning }}>  ⚠ 警告状态</text>
          <text style={{ color: theme.success }}>  ✓ 成功状态</text>
          <text style={{ color: theme.info }}>  ℹ 信息状态</text>
        </box>
        <box style={{ flexDirection: "row", height: 1 }}>
          <text style={{ color: theme.text }}>  普通文本</text>
          <text style={{ color: theme.textMuted }}>  次要文本</text>
        </box>
      </box>

      {/* Border Examples Section */}
      <box
        style={{
          height: 8,
          borderBottom: true,
          borderBottomStyle: "single",
          borderBottomColor: theme.border,
          flexDirection: "column",
          padding: 1,
        }}
      >
        <text style={{ color: theme.accent, bold: true, marginBottom: 1 }}>
          边框样式
        </text>
        <box style={{ flexDirection: "row", height: 3 }}>
          <box
            style={{
              flexGrow: 1,
              border: true,
              borderStyle: "single",
              borderColor: theme.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <text style={{ color: theme.textMuted }}>默认边框</text>
          </box>
          <box
            style={{
              flexGrow: 1,
              border: true,
              borderStyle: "double",
              borderColor: theme.borderActive,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <text style={{ color: theme.text }}>活跃边框</text>
          </box>
          <box
            style={{
              flexGrow: 1,
              border: true,
              borderStyle: "round",
              borderColor: theme.borderSubtle,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <text style={{ color: theme.textMuted }}>微妙边框</text>
          </box>
        </box>
      </box>

      {/* Panel Examples Section */}
      <box
        style={{
          height: 8,
          flexDirection: "column",
          padding: 1,
        }}
      >
        <text style={{ color: theme.accent, bold: true, marginBottom: 1 }}>
          面板样式
        </text>
        <box style={{ flexDirection: "row", height: 3 }}>
          <box
            style={{
              flexGrow: 1,
              backgroundColor: theme.backgroundPanel,
              border: true,
              borderStyle: "single",
              borderColor: theme.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <text style={{ color: theme.text }}>面板背景</text>
          </box>
          <box
            style={{
              flexGrow: 1,
              backgroundColor: theme.backgroundElement,
              border: true,
              borderStyle: "single",
              borderColor: theme.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <text style={{ color: theme.text }}>元素背景</text>
          </box>
        </box>
      </box>
    </box>
  );
}
