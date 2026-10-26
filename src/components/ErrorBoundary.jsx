import { Component } from 'react'

const isChunk = (e) => /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch/i.test(String(e?.message || e))

/** Keeps one broken page from blanking the whole site: shows a calm message with a refresh button instead. */
export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error(error, info?.componentStack) }
  componentDidUpdate(prev) { if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null }) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="container-w grid place-items-center gap-4 py-24 text-center">
        <p className="text-lg font-semibold text-primary">{isChunk(this.state.error) ? 'صار تحديث جديد للموقع' : 'صار خطأ غير متوقع'}</p>
        <button type="button" className="rounded-full bg-primary px-6 py-3 font-bold text-on-inverse" onClick={() => location.reload()}>تحديث الصفحة</button>
      </div>
    )
  }
}
