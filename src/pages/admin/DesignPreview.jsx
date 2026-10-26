import { useEffect } from 'react'
import { useApp } from '@/state.jsx'
import Layout from '@/components/Layout.jsx'

/** The store's home page inside the designer's preview frame: shows the unsaved draft it receives from the designer. */
export default function DesignPreview() {
  const { setPreview } = useApp()
  useEffect(() => {
    const on = (e) => {
      if (e.origin !== location.origin) return
      if (e.data?.type === 'mimi:design') setPreview(e.data.settings || null)
      // the designer opened a block: bring it into view
      if (e.data?.type === 'mimi:focus') document.querySelector(`[data-block="${CSS.escape(String(e.data.id))}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (e.data?.type === 'mimi:scroll') scrollTo({ top: e.data.top === 'end' ? document.body.scrollHeight : 0, behavior: 'smooth' })
    }
    addEventListener('message', on)
    parent.postMessage({ type: 'mimi:preview-ready' }, location.origin)
    return () => { removeEventListener('message', on); setPreview(null) }
  }, [setPreview])
  // a picture of the store, not a way out of the dashboard: links and buttons do nothing here
  const stop = (e) => { if (e.target.closest('a,button')) { e.preventDefault(); e.stopPropagation() } }
  return <div onClickCapture={stop}><style>{'html{scrollbar-width:none}html::-webkit-scrollbar{display:none}html,body{overflow-x:hidden;overflow-x:clip;max-width:100%;overscroll-behavior-x:none;touch-action:pan-y}'}</style><Layout /></div>
}
