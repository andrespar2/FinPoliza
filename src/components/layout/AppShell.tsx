import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'

export function AppShell() {
  return (
    <div className="app">
      <Outlet />
      <TabBar />
    </div>
  )
}
