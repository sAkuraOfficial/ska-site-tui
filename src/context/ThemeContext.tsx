import { createContext, useContext, useState, useMemo, useEffect, useCallback, type ReactNode } from "react"
import { useRenderer } from "@opentui/react"
import { type SyntaxStyle } from "@opentui/core"
import {
  allThemes,
  hasTheme,
  resolveTheme,
  generateSyntax,
  generateSubtleSyntax,
  subscribeThemes,
  type Theme,
  type ThemeJson,
} from "../theme"

type ThemeContextValue = {
  /** Current resolved theme with RGBA colors */
  theme: Theme
  /** Name of the currently active theme */
  selected: string
  /** Get all available themes */
  all: () => Record<string, ThemeJson>
  /** Check if a theme exists */
  has: (name: string) => boolean
  /** Set the active theme by name */
  set: (name: string) => boolean
  /** Current color mode */
  mode: () => "dark" | "light"
  /** Set the color mode */
  setMode: (mode: "dark" | "light") => void
  /** Whether the theme system is ready */
  ready: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export type ThemeProviderProps = {
  children: ReactNode
  /** Initial theme name (default: "opencode") */
  defaultTheme?: string
  /** Initial color mode (default: "dark") */
  defaultMode?: "dark" | "light"
}

/**
 * ThemeProvider - Provides theme state management for the application
 * 
 * Based on OpenCode's theme system, adapted for React.
 * 
 * Usage:
 * ```tsx
 * <ThemeProvider defaultTheme="tokyonight" defaultMode="dark">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  children,
  defaultTheme = "opencode",
  defaultMode = "dark",
}: ThemeProviderProps) {
  const renderer = useRenderer()
  const [activeTheme, setActiveTheme] = useState<string>(defaultTheme)
  const [mode, setModeState] = useState<"dark" | "light">(defaultMode)
  const [themes, setThemes] = useState<Record<string, ThemeJson>>(allThemes())
  const [ready, setReady] = useState(false)

  // Subscribe to theme changes
  useEffect(() => {
    const unsubscribe = subscribeThemes(setThemes)
    return unsubscribe
  }, [])

  // Resolve the current theme
  const theme = useMemo(() => {
    const themeJson = themes[activeTheme]
    if (themeJson) {
      return resolveTheme(themeJson, mode)
    }
    // Fallback to opencode theme
    return resolveTheme(themes.opencode, mode)
  }, [activeTheme, mode, themes])

  // Set background color when theme changes
  useEffect(() => {
    if (renderer && theme.background) {
      renderer.setBackgroundColor(theme.background)
    }
  }, [renderer, theme.background])

  // Generate syntax styles
  const syntax = useMemo(() => generateSyntax(theme), [theme])
  const subtleSyntax = useMemo(() => generateSubtleSyntax(theme), [theme])

  // Mark as ready on mount
  useEffect(() => {
    setReady(true)
  }, [])

  // Set theme by name
  const set = useCallback((name: string): boolean => {
    if (!hasTheme(name)) return false
    setActiveTheme(name)
    return true
  }, [])

  // Set color mode
  const setMode = useCallback((newMode: "dark" | "light") => {
    setModeState(newMode)
  }, [])

  const value: ThemeContextValue = useMemo(() => ({
    theme,
    selected: activeTheme,
    all: allThemes,
    has: hasTheme,
    set,
    mode: () => mode,
    setMode,
    ready,
  }), [theme, activeTheme, mode, set, setMode, ready])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * useTheme - Hook to access theme context
 * 
 * Usage:
 * ```tsx
 * const { theme, set, mode } = useTheme()
 * 
 * // Change theme
 * set("tokyonight")
 * 
 * // Use theme colors
 * <box style={{ backgroundColor: theme.background }}>
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

/**
 * useSyntax - Hook to access syntax highlighting styles
 * 
 * Usage:
 * ```tsx
 * const syntax = useSyntax()
 * // syntax is a SyntaxStyle instance
 * ```
 */
export function useSyntax(): SyntaxStyle {
  const { theme } = useTheme()
  return useMemo(() => generateSyntax(theme), [theme])
}

/**
 * useSubtleSyntax - Hook to access subtle syntax highlighting styles
 * 
 * Usage:
 * ```tsx
 * const subtleSyntax = useSubtleSyntax()
 * // subtleSyntax is a SyntaxStyle instance with reduced opacity
 * ```
 */
export function useSubtleSyntax(): SyntaxStyle {
  const { theme } = useTheme()
  return useMemo(() => generateSubtleSyntax(theme), [theme])
}
