import { createContext, useContext, type ParentProps } from "solid-js"

export interface SessionInfo {
  username: string
  method: string
  fingerprint?: string
  publicKey?: { algorithm: string; blob: Buffer }
  remoteAddress: { address: string; port?: number }
  term: string
  cols: number
  rows: number
  hasPty: boolean
}

const SessionContext = createContext<SessionInfo>()

export function SessionProvider(props: ParentProps & { session: SessionInfo }) {
  return (
    <SessionContext.Provider value={props.session}>
      {props.children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionInfo {
  const value = useContext(SessionContext)
  if (!value) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return value
}
