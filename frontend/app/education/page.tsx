'use client'

import { useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { GraduationCap, BookOpen, Lightbulb, HelpCircle, Map } from 'lucide-react'

type Level = 'beginner' | 'intermediate' | 'expert'

const LEVELS: { key: Level; label: string; desc: string }[] = [
  { key: 'beginner', label: 'Beginner', desc: 'Simple language, analogies' },
  { key: 'intermediate', label: 'Intermediate', desc: 'Standard finance terms' },
  { key: 'expert', label: 'Expert', desc: 'Technical depth, quant' },
]

const QUICK_CONCEPTS = [
  'Inflation', 'Fed Funds Rate', 'P/E Ratio', 'Yield Curve', 'Quantitative Easing',
  'Short Selling', 'Options Delta', 'Beta', 'Alpha', 'Sharpe Ratio',
  'Duration', 'Credit Default Swap', 'Carry Trade', 'VIX', 'LIBOR',
]

function LoadingDots({ color = 'purple' }: { color?: string }) {
  return (
    <span className="flex gap-1">
      {[0, 100, 200].map((d) => (
        <span
          key={d}
          className={`h-1.5 w-1.5 bg-${color}-400 rounded-full animate-bounce`}
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  )
}

function ResultCard({ data, type }: { data: any; type: string }) {
  if (!data) return null
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      {data.definition && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Definition</p>
          <p className="text-gray-200 text-sm font-medium">{data.definition}</p>
        </div>
      )}
      {data.explanation && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Explanation</p>
          <p className="text-gray-300 text-sm leading-relaxed">{data.explanation}</p>
        </div>
      )}
      {data.answer && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Answer</p>
          <p className="text-gray-300 text-sm leading-relaxed">{data.answer}</p>
        </div>
      )}
      {data.real_world_example && (
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-3">
          <p className="text-xs text-blue-400 font-semibold uppercase mb-1">Real World Example</p>
          <p className="text-gray-300 text-sm">{data.real_world_example}</p>
        </div>
      )}
      {data.market_impact && (
        <div className="bg-purple-950/30 border border-purple-800/40 rounded-lg p-3">
          <p className="text-xs text-purple-400 font-semibold uppercase mb-1">Market Impact</p>
          <p className="text-gray-300 text-sm">{data.market_impact}</p>
        </div>
      )}
      {data.quiz_question && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-2">
          <p className="text-xs text-yellow-400 font-semibold uppercase">Quiz</p>
          <p className="text-gray-200 text-sm font-medium">{data.quiz_question}</p>
          {data.quiz_answer && (
            <details className="text-sm">
              <summary className="text-gray-500 cursor-pointer hover:text-gray-300 transition-colors text-xs">
                Show answer
              </summary>
              <p className="text-green-400 mt-2 text-xs">{data.quiz_answer}</p>
            </details>
          )}
        </div>
      )}
      {data.key_takeaway && (
        <div className="bg-green-950/30 border border-green-800/40 rounded-lg p-3">
          <p className="text-xs text-green-400 font-semibold uppercase mb-1">Key Takeaway</p>
          <p className="text-gray-300 text-sm">{data.key_takeaway}</p>
        </div>
      )}
    </div>
  )
}

export default function EducationPage() {
  const [level, setLevel] = useState<Level>('intermediate')

  const [concept, setConcept] = useState('')
  const [conceptResult, setConceptResult] = useState<any>(null)
  const [conceptLoading, setConceptLoading] = useState(false)
  const [conceptError, setConceptError] = useState('')

  const [eventInput, setEventInput] = useState('')
  const [eventResult, setEventResult] = useState<any>(null)
  const [eventLoading, setEventLoading] = useState(false)
  const [eventError, setEventError] = useState('')

  const [question, setQuestion] = useState('')
  const [questionResult, setQuestionResult] = useState<any>(null)
  const [questionLoading, setQuestionLoading] = useState(false)
  const [questionError, setQuestionError] = useState('')

  const [goal, setGoal] = useState('')
  const [pathResult, setPathResult] = useState<any>(null)
  const [pathLoading, setPathLoading] = useState(false)
  const [pathError, setPathError] = useState('')

  async function explainConcept(c?: string) {
    const term = c ?? concept.trim()
    if (!term) return
    if (!c) setConcept(term)
    setConceptLoading(true)
    setConceptResult(null)
    setConceptError('')
    const res = await api.educationExplain(term, level)
    if (res?.data) {
      setConceptResult(res.data)
    } else {
      setConceptError(res?.error ?? 'Failed to explain concept')
    }
    setConceptLoading(false)
  }

  async function explainEvent() {
    if (!eventInput.trim()) return
    setEventLoading(true)
    setEventResult(null)
    setEventError('')
    const res = await api.educationEvent(eventInput.trim(), level)
    if (res?.data) {
      setEventResult(res.data)
    } else {
      setEventError(res?.error ?? 'Failed to explain event')
    }
    setEventLoading(false)
  }

  async function askQuestion() {
    if (!question.trim()) return
    setQuestionLoading(true)
    setQuestionResult(null)
    setQuestionError('')
    const res = await api.educationQuestion(question.trim(), level)
    if (res?.data) {
      setQuestionResult(res.data)
    } else {
      setQuestionError(res?.error ?? 'Failed to answer question')
    }
    setQuestionLoading(false)
  }

  async function buildPath() {
    if (!goal.trim()) return
    setPathLoading(true)
    setPathResult(null)
    setPathError('')
    const res = await api.learningPath(goal.trim(), level)
    if (res?.data) {
      setPathResult(res.data)
    } else {
      setPathError(res?.error ?? 'Failed to build learning path')
    }
    setPathLoading(false)
  }

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-900/40 border border-green-700/40 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Adaptive Education Layer</h1>
            <p className="text-gray-400 text-sm">Learn finance at your level — beginner to expert</p>
          </div>
        </div>

        {/* Level Selector */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Your Level</p>
          <div className="grid grid-cols-3 gap-3">
            {LEVELS.map((l) => (
              <button
                key={l.key}
                onClick={() => setLevel(l.key)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  level === l.key
                    ? 'bg-purple-900/40 border-purple-700 text-purple-200'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                }`}
              >
                <p className="font-semibold text-sm">{l.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{l.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Concepts */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-yellow-400" /> Quick Concepts
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_CONCEPTS.map((c) => (
              <button
                key={c}
                onClick={() => explainConcept(c)}
                className="text-xs px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300 hover:bg-purple-900/40 hover:border-purple-700 hover:text-purple-200 transition-all"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Explain a Concept */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Explain a Concept</h2>
          </div>
          <div className="flex gap-3">
            <input
              className="input-field flex-1"
              placeholder="e.g. Yield Curve Inversion"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && explainConcept()}
            />
            <button onClick={() => explainConcept()} disabled={conceptLoading || !concept.trim()} className="btn-primary">
              {conceptLoading ? <LoadingDots /> : 'Explain'}
            </button>
          </div>
          {conceptLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <LoadingDots color="blue" />
              <span>Crafting explanation for {level} level…</span>
            </div>
          )}
          {conceptError && <div className="text-red-400 text-sm">{conceptError}</div>}
          {conceptResult && <ResultCard data={conceptResult} type="concept" />}
        </div>

        {/* Explain a Market Event */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Explain a Market Event</h2>
          </div>
          <div className="flex gap-3">
            <input
              className="input-field flex-1"
              placeholder="e.g. The 2008 Financial Crisis"
              value={eventInput}
              onChange={(e) => setEventInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && explainEvent()}
            />
            <button onClick={explainEvent} disabled={eventLoading || !eventInput.trim()} className="btn-primary">
              {eventLoading ? <LoadingDots /> : 'Explain'}
            </button>
          </div>
          {eventLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <LoadingDots color="yellow" />
              <span>Analyzing event context…</span>
            </div>
          )}
          {eventError && <div className="text-red-400 text-sm">{eventError}</div>}
          {eventResult && <ResultCard data={eventResult} type="event" />}
        </div>

        {/* Ask Any Financial Question */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-green-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Ask Any Financial Question</h2>
          </div>
          <div className="flex gap-3">
            <input
              className="input-field flex-1"
              placeholder="e.g. Why does a strong dollar hurt emerging markets?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
            />
            <button onClick={askQuestion} disabled={questionLoading || !question.trim()} className="btn-primary">
              {questionLoading ? <LoadingDots /> : 'Ask'}
            </button>
          </div>
          {questionLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <LoadingDots color="green" />
              <span>Formulating answer…</span>
            </div>
          )}
          {questionError && <div className="text-red-400 text-sm">{questionError}</div>}
          {questionResult && <ResultCard data={questionResult} type="question" />}
        </div>

        {/* Build My Learning Path */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Map className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Build My Learning Path</h2>
          </div>
          <div className="flex gap-3">
            <input
              className="input-field flex-1"
              placeholder="e.g. Understand options trading in 30 days"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buildPath()}
            />
            <button onClick={buildPath} disabled={pathLoading || !goal.trim()} className="btn-primary">
              {pathLoading ? <LoadingDots /> : 'Build Path'}
            </button>
          </div>
          {pathLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <LoadingDots color="purple" />
              <span>Building personalized curriculum…</span>
            </div>
          )}
          {pathError && <div className="text-red-400 text-sm">{pathError}</div>}
          {pathResult && (
            <div className="space-y-3">
              {pathResult.overview && (
                <p className="text-gray-300 text-sm">{pathResult.overview}</p>
              )}
              {(pathResult.weeks ?? pathResult.modules ?? []).map((week: any, i: number) => (
                <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-full bg-purple-900/60 border border-purple-700 flex items-center justify-center text-purple-300 text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-white font-semibold text-sm">
                      {week.week_label ?? week.title ?? `Week ${i + 1}`}
                    </span>
                  </div>
                  {week.topics && (
                    <div className="flex flex-wrap gap-1.5 ml-10">
                      {(Array.isArray(week.topics) ? week.topics : [week.topics]).map((t: string, j: number) => (
                        <span key={j} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  )}
                  {week.description && (
                    <p className="text-gray-400 text-xs ml-10">{week.description}</p>
                  )}
                  {week.goal && (
                    <p className="text-green-400 text-xs ml-10 font-medium">Goal: {week.goal}</p>
                  )}
                </div>
              ))}
              {pathResult.estimated_time && (
                <p className="text-gray-500 text-xs text-right">Estimated time: {pathResult.estimated_time}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
