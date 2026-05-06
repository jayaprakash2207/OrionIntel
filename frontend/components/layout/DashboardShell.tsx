// @ts-nocheck
import Sidebar from './Sidebar'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: 240 }}>
        {children}
      </main>
    </div>
  )
}
