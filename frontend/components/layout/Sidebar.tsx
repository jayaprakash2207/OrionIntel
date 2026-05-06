'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import {
  LayoutDashboard,
  Newspaper,
  MessageSquare,
  Swords,
  GitBranch,
  Zap,
  Clock,
  TrendingUp,
  Brain,
  Globe2,
  BarChart3,
  Activity,
  Scale,
  Cloud,
  Vote,
  Target,
  PieChart,
  AlertTriangle,
  Mic,
  ShieldCheck,
  FlaskConical,
  DollarSign,
  GraduationCap,
  Bell,
  Network,
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> }

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Intelligence',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/news', label: 'News', icon: Newspaper },
      { href: '/dashboard', label: 'Query', icon: MessageSquare },
    ],
  },
  {
    title: 'AI Agents',
    items: [
      { href: '/debate', label: 'Bull vs Bear', icon: Swords },
      { href: '/butterfly', label: 'Butterfly Effect', icon: GitBranch },
      { href: '/stress-test', label: 'Stress Test', icon: Zap },
      { href: '/timeline', label: 'Timeline', icon: Clock },
      { href: '/opportunities', label: 'Opportunities', icon: TrendingUp },
      { href: '/ai-lab', label: 'AI Lab', icon: Brain },
    ],
  },
  {
    title: 'New Agents',
    items: [
      { href: '/geo-risk', label: 'Geo Risk', icon: Globe2 },
      { href: '/strategy', label: 'Strategy Builder', icon: BarChart3 },
      { href: '/sentiment', label: 'Sentiment', icon: Activity },
      { href: '/law-analysis', label: 'Law to Ledger', icon: Scale },
      { href: '/climate', label: 'Climate Impact', icon: Cloud },
      { href: '/elections', label: 'Elections', icon: Vote },
    ],
  },
  {
    title: 'Advanced Tools',
    items: [
      { href: '/portfolio-exposure', label: 'Portfolio Exposure', icon: PieChart },
      { href: '/black-swan', label: 'Black Swan', icon: AlertTriangle },
      { href: '/ceo-speech', label: 'CEO Speech AI', icon: Mic },
      { href: '/deepfake-check', label: 'Deepfake Check', icon: ShieldCheck },
      { href: '/backtesting', label: 'Backtesting', icon: FlaskConical },
      { href: '/historical-mirror', label: 'Historical Mirror', icon: Clock },
      { href: '/regulatory-time-machine', label: 'Regulatory Time Machine', icon: Scale },
      { href: '/wealth-migration', label: 'Wealth Migration', icon: DollarSign },
    ],
  },
  {
    title: 'Education & Tools',
    items: [
      { href: '/education', label: 'Education', icon: GraduationCap },
      { href: '/alerts', label: 'Custom Alerts', icon: Bell },
      { href: '/world-graph', label: 'World Graph', icon: Network },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/performance', label: 'AI Performance', icon: Target },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="fixed left-0 top-0 h-screen bg-gray-900 border-r border-gray-800 flex flex-col z-50"
      style={{ width: 240 }}
    >
      {/* Logo */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">O</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">OrionIntel</span>
          <span className="h-2 w-2 rounded-full bg-purple-500 ml-auto flex-shrink-0" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {SECTIONS.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-gray-500 px-2">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-purple-900/30 text-purple-300'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-purple-400' : ''}`} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">Python backend: localhost:8000</p>
      </div>
    </aside>
  )
}
