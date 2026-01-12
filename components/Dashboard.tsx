"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { LogOut, Copy, Check } from 'lucide-react'
import EntranceModal from './EntranceModal'
import QuestionForm from './QuestionForm'
import Inbox from './Inbox'
import SentQuestions from './SentQuestions'
import History from './History'

interface DashboardProps {
  session: any
}

export default function Dashboard({ session }: DashboardProps) {
  const [acceptedEntrance, setAcceptedEntrance] = useState(false)
  const [activeTab, setActiveTab] = useState<'ask' | 'inbox' | 'sent' | 'history'>('ask')
  const [loading, setLoading] = useState(true)
  const [roomData, setRoomData] = useState<{ roomId: string; nickname: string; roomName: string } | null>(null)
  
  // Data states
  const [inboxQuestions, setInboxQuestions] = useState<any[]>([])
  const [sentQuestions, setSentQuestions] = useState<any[]>([])
  const [historyItems, setHistoryItems] = useState<any[]>([])
  const [copied, setCopied] = useState(false)

  // Fetch initial data
  useEffect(() => {
    const saved = localStorage.getItem('roomData')
    if (saved) {
      setRoomData(JSON.parse(saved))
    }
    setLoading(false)
  }, [])

  // Realtime subscriptions
  useEffect(() => {
    if (!roomData?.roomId) return

    fetchQuestions()

    const channel = supabase
      .channel('room_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions', filter: `room_id=eq.${roomData.roomId}` }, () => {
        fetchQuestions()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => {
        fetchQuestions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomData?.roomId])

  const fetchQuestions = async () => {
    if (!roomData?.roomId) return

    // Get all questions for the room
    const { data: allQuestions } = await supabase
      .from('questions')
      .select(`
        *,
        answers(*)
      `)
      .eq('room_id', roomData.roomId)
      .order('created_at', { ascending: false })

    if (!allQuestions) return

    const inbox = []
    const sent = []
    const history = []

    for (const q of allQuestions) {
      // Parse question metadata
      try {
        const parsed = JSON.parse(q.question_text)
        q.parsedText = parsed.text
        q.senderName = parsed.senderName
        q.senderId = parsed.senderId
      } catch (e) {
        // Fallback
        q.parsedText = q.question_text
        q.senderName = 'شريكك'
        q.senderId = 'unknown'
      }

      const hasAnswer = q.answers && q.answers.length > 0
      
      if (hasAnswer) {
        // Parse answer metadata
        if (q.answers[0]) {
          try {
            const parsedAns = JSON.parse(q.answers[0].answer_text)
            q.answers[0].parsedText = parsedAns.text
            q.answers[0].senderName = parsedAns.senderName
            q.answers[0].senderId = parsedAns.senderId
          } catch (e) {
            q.answers[0].parsedText = q.answers[0].answer_text
            q.answers[0].senderName = 'شريكك'
          }
        }
        history.push(q)
      } else {
        if (q.senderId === session.user.id) {
          sent.push(q)
        } else {
          // If not sent by me, it's for me
          inbox.push(q)
        }
      }
    }

    setInboxQuestions(inbox)
    setSentQuestions(sent)
    setHistoryItems(history)
  }

  const copyRoomId = () => {
    if (roomData?.roomId) {
      navigator.clipboard.writeText(roomData.roomId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!acceptedEntrance) {
    return <EntranceModal onEnter={() => setAcceptedEntrance(true)} />
  }

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto relative">
      {/* Header */}
      <header className="p-6 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-40">
        <div>
          <h1 className="text-xl font-bold text-dark-cocoa">{roomData?.roomName || 'غرفة العشاق'}</h1>
          <div className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" onClick={copyRoomId}>
            <span>ID: {roomData?.roomId?.slice(0, 8)}...</span>
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </div>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem('roomData')
            window.location.reload()
          }}
          className="text-rose-400 hover:text-rose-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-6">
        {activeTab === 'ask' && roomData && (
          <QuestionForm 
            roomId={roomData.roomId} 
            userId={session.user.id} 
            nickname={roomData.nickname}
          />
        )}
        
        {activeTab === 'inbox' && roomData && (
          <Inbox 
            questions={inboxQuestions} 
            currentUserId={session.user.id}
            nickname={roomData.nickname}
          />
        )}

        {activeTab === 'sent' && (
          <SentQuestions questions={sentQuestions} />
        )}

        {activeTab === 'history' && (
          <History 
            history={historyItems} 
            currentUserId={session.user.id} 
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-rose-100 p-4 flex justify-around items-center z-50 max-w-md mx-auto">
        <NavButton 
          active={activeTab === 'ask'} 
          onClick={() => setActiveTab('ask')} 
          label="اسأل" 
        />
        <NavButton 
          active={activeTab === 'inbox'} 
          onClick={() => setActiveTab('inbox')} 
          label="الوارد" 
          count={inboxQuestions.length}
        />
        <NavButton 
          active={activeTab === 'sent'} 
          onClick={() => setActiveTab('sent')} 
          label="المرسل" 
        />
        <NavButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')} 
          label="الذكريات" 
        />
      </nav>
    </div>
  )
}

function NavButton({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`relative px-4 py-2 rounded-xl transition-all ${
        active 
          ? 'text-rose-600 font-bold bg-rose-50' 
          : 'text-gray-400 font-medium hover:text-rose-400'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
          {count}
        </span>
      )}
    </button>
  )
}
