/** @jsxImportSource @opentui/solid */
import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/ThemeContext"
import { useSession } from "../context/SessionContext"
import { useDialog, type DialogContext } from "./dialog"

export function UserInfoDialog() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const session = useSession()

  const methodLabel: Record<string, string> = {
    none: "无认证",
    password: "密码认证",
    "keyboard-interactive": "键盘交互认证",
    publickey: "公钥认证",
  }

  return (
    <box flexDirection="column" paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      {/* Title */}
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          连接用户信息
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>

      <box flexDirection="column" gap={0}>
        {/* Username */}
        <box flexDirection="row" gap={1}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            用户名:
          </text>
          <text fg={theme.text}>{session.username}</text>
        </box>

        {/* Auth method */}
        <box flexDirection="row" gap={1}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            认证方式:
          </text>
          <text fg={theme.text}>{methodLabel[session.method] ?? session.method}</text>
        </box>

        {/* Fingerprint (publickey only) */}
        {session.fingerprint && (
          <box flexDirection="row" gap={1}>
            <text fg={theme.accent} attributes={TextAttributes.BOLD}>
              公钥指纹:
            </text>
            <text fg={theme.text}>{session.fingerprint}</text>
          </box>
        )}

        {/* Public key algorithm (publickey only) */}
        {session.publicKey && (
          <box flexDirection="row" gap={1}>
            <text fg={theme.accent} attributes={TextAttributes.BOLD}>
              密钥算法:
            </text>
            <text fg={theme.text}>{session.publicKey.algorithm}</text>
          </box>
        )}

        {/* Remote address */}
        <box flexDirection="row" gap={1}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            远程地址:
          </text>
          <text fg={theme.text}>
            {session.remoteAddress.address}
            {session.remoteAddress.port != null ? `:${session.remoteAddress.port}` : ""}
          </text>
        </box>

        {/* Terminal type */}
        <box flexDirection="row" gap={1}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            终端类型:
          </text>
          <text fg={theme.text}>{session.term || "(未知)"}</text>
        </box>

        {/* Terminal size */}
        <box flexDirection="row" gap={1}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            终端尺寸:
          </text>
          <text fg={theme.text}>
            {session.cols} × {session.rows}
          </text>
        </box>

        {/* PTY */}
        <box flexDirection="row" gap={1}>
          <text fg={theme.accent} attributes={TextAttributes.BOLD}>
            PTY:
          </text>
          <text fg={theme.text}>{session.hasPty ? "已请求" : "未请求"}</text>
        </box>
      </box>

      {/* Hint */}
      <text fg={theme.textMuted}>Esc 关闭</text>
    </box>
  )
}

UserInfoDialog.show = (dialog: DialogContext) => {
  return new Promise<void>((resolve) => {
    dialog.setSize("large")
    dialog.replace(
      () => <UserInfoDialog />,
      () => resolve(),
    )
  })
}
