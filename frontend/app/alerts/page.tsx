'use client'

import { useState, useEffect } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { Bell, Plus, Trash2, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

type AlertPriority = 'High' | 'Medium' | 'Low'
type AlertCategory = 'Geopolitical' | 'Regulatory' | 'Market' | 'Economic'

interface CustomAlert {
  id: string
  name: string
  description: string
  category: AlertCategory
  priority: AlertPriority
  status: 'Active' | 'Triggered' | 'Paused'
  createdAt: string
}

const CATEGORIES: AlertCategory[] = ['Geopolitical', 'Regulatory', 'Market', 'Economic']
const PRIORITIES: AlertPriority[] = ['High', 'Medium', 'Low']

const ALERT_EXAMPLES = [
  {
    category: 'Geopolitical',
    title: 'Lithium Export Restrictions',
    description: 'Notify if any G7 country discusses lithium export restrictions',
    icon: '🌍',
  },
  {
    category: 'Regulatory',
    title: 'SEC Crypto Enforcement',
    description: 'Alert when SEC files major action against crypto exchange',
    icon: '⚖️',
  },
  {
    category: 'Market',
    title: 'VIX Spike Alert',
    description: 'Notify when VIX index rises above 35 indicating panic',
    icon: '📈',
  },
  {
    category: 'Economic',
    title: 'Fed Rate Decision',
    description: 'Alert on unexpected Fed rate change outside consensus range',
    icon: '🏦',
  },
  {
    category: 'Geopolitical',
    title: 'Middle East Escalation',
    description: 'Notify on major military escalation affecting oil supply routes',
    icon: '⚡',
  },
  {
    category: 'Market',
    title: 'Dollar Collapse Signal',
    description: 'Alert if DXY drops more than 5% in a single week',
    icon: '💵',
  },
]

function priorityColor(p: AlertPriority) {
  return p === 'High'
    ? 'bg-red-900/40 text-red-400 border-red-800/40'
    : p === 'Medium'
    ? 'bg-yellow-900/40 text-yellow-400 border-yellow-800/40'
    : 'bg-green-900/40 text-green-400 border-green-800/40'
}

function categoryColor(c: AlertCategory) {
  const map: Record<AlertCategory, string> = {
    Geopolitical: 'bg-blue-900/40 text-blue-400 border-blue-800/40',
    Regulatory: 'bg-orange-900/40 text-orange-400 border-orange-800/40',
    Market: 'bg-purple-900/40 text-purple-400 border-purple-800/40',
    Economic: 'bg-cyan-900/40 text-cyan-400 border-cyan-800/40',
  }
  return map[c]
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<CustomAlert[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<AlertCategory>('Geopolitical')
  const [priority, setPriority] = useState<AlertPriority>('Medium')
  const [showForm, setShowForm] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('orionintel_alerts')
      if (stored) setAlerts(JSON.parse(stored))
    } catch {}
  }, [])

  function saveAlerts(updated: CustomAlert[]) {
    setAlerts(updated)
    localStorage.setItem('orionintel_alerts', JSON.stringify(updated))
  }

  function createAlert() {
    if (!name.trim() || !description.trim()) return
    const newAlert: CustomAlert = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
      category,
      priority,
      status: 'Active',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }
    saveAlerts([newAlert, ...alerts])
    setName('')
    setDescription('')
    setCategory('Geopolitical')
    setPriority('Medium')
    setShowForm(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function deleteAlert(id: string) {
    saveAlerts(alerts.filter((a) => a.id !== id))
  }

  function toggleStatus(id: string) {
    saveAlerts(
      alerts.map((a) =>
        a.id === id ? { ...a, status: a.status === 'Active' ? 'Paused' : 'Active' } : a
      )
    )
  }

  function applyExample(ex: typeof ALERT_EXAMPLES[0]) {
    setName(ex.title)
    setDescription(ex.description)
    setCategory(ex.category as AlertCategory)
    setShowForm(true)
  }

  const activeCount = alerts.filter((a) => a.status === 'Active').length

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-yellow-900/40 border border-yellow-700/40 flex items-center justify-center">
              <Bell className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Custom Alerts</h1>
              <p className="text-gray-400 text-sm">Event-based alerts — get notified when financial events match your criteria</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <span className="text-xs bg-green-900/40 text-green-400 border border-green-800/40 px-3 py-1 rounded-full">
                {activeCount} active
              </span>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Alert
            </button>
          </div>
        </div>

        {saved && (
          <div className="bg-green-950/40 border border-green-800 rounded-xl p-3 flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="h-4 w-4" /> Alert created successfully
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Create New Alert</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Alert Name *</label>
                <input
                  className="input-field"
                  placeholder="e.g. Lithium Export Restrictions"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Category</label>
                  <select
                    className="input-field"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AlertCategory)}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Priority</label>
                  <select
                    className="input-field"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as AlertPriority)}
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Alert Condition / Description *</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                placeholder="e.g. Notify if any G7 country discusses lithium export restrictions"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={createAlert}
                disabled={!name.trim() || !description.trim()}
                className="btn-primary"
              >
                Create Alert
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Active Alerts */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">
            Active Alerts
            {alerts.length > 0 && <span className="text-gray-500 font-normal ml-2">({alerts.length})</span>}
          </h2>
          {alerts.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <Bell className="h-10 w-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No alerts created yet.</p>
              <p className="text-gray-600 text-xs mt-1">Create your first alert or use an example below.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-white font-semibold text-sm">{alert.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${categoryColor(alert.category)}`}>
                          {alert.category}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(alert.priority)}`}>
                          {alert.priority}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          alert.status === 'Active'
                            ? 'bg-green-900/40 text-green-400 border-green-800/40'
                            : 'bg-gray-800 text-gray-500 border-gray-700'
                        }`}>
                          {alert.status === 'Active'
                            ? <><CheckCircle className="h-3 w-3" /> Active</>
                            : <><Clock className="h-3 w-3" /> Paused</>
                          }
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs">{alert.description}</p>
                      <p className="text-gray-600 text-xs">Created {alert.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleStatus(alert.id)}
                        className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded border border-gray-700 transition-colors"
                      >
                        {alert.status === 'Active' ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => deleteAlert(alert.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alert Examples */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Alert Examples</h2>
            <span className="text-xs text-gray-500">— click to use as template</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ALERT_EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => applyExample(ex)}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-left hover:border-purple-700/60 hover:bg-gray-800/60 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{ex.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white text-sm font-semibold group-hover:text-purple-300 transition-colors">
                        {ex.title}
                      </p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${categoryColor(ex.category as AlertCategory)}`}>
                      {ex.category}
                    </span>
                    <p className="text-gray-400 text-xs mt-2">{ex.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
