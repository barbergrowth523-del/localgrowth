import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
