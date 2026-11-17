import { useSyncExternalStore } from 'react'
import { store } from '../services/store'

export function useAppState() {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState)
}

export function useSession() {
  const state = useAppState()
  return state.session
}
