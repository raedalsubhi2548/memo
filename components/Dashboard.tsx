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
  const [room, setRoom] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  
  // Data states
  const [inboxQuestions, setInboxQuestions] = useState<any[]>([])
  const [sentQuestions, setSentQuestions] = useState<any[]>([])
  const [historyItems, setHistoryItems] = useState<any[]>([])
  const [copied, setCopied] = useState(false)

  // Fetch initial data
  useEffect(() => {
    fetchRoomData()
  }, [session.user.id])

  // Realtime subscriptions
  useEffect(() => {
    if (!room?.id) return

    const channel = supabase
      .channel('room_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions', filter: `room_id=eq.${room.id}` }, () => {
        fetchQuestions()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => {
        fetchQuestions()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `room_id=eq.${room.id}` }, () => {
        fetchMembers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room?.id])

  const fetchRoomData = async () => {
    try {
      setLoading(true)
      
      // Get member details
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*, rooms(*)')
        .eq('user_id', session.user.id)
        .single()

      if (memberError) throw memberError
      
      setMember(memberData)
      setRoom(memberData.rooms)
      
      await Promise.all([
        fetchMembers(memberData.room_id),
        fetchQuestions(memberData.id, memberData.room_id)
      ])

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async (roomIdToUse?: string) => {
    const rId = roomIdToUse || room?.id
    if (!rId) return

    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('room_id', rId)
    
    if (data) setMembers(data)
  }

  const fetchQuestions = async (memberIdToUse?: string, roomIdToUse?: string) => {
    const mId = memberIdToUse || member?.id
    const rId = roomIdToUse || room?.id
    if (!mId || !rId) return

    // Inbox: Questions sent TO me, that are NOT answered yet (or show answered in history?)
    // Logic: 
    // Inbox = Questions to me where answers count is 0
    // History = Questions (to/from me) where answers count > 0
    // Sent = Questions from me where answers count is 0 (waiting)

    // Let's fetch all questions in room with answers and members
    const { data: allQuestions } = await supabase
      .from('questions')
      .select(`
        *,
        answers(*),
        from_member:members!from_member_id(display_name, user_id),
        to_member:members!to_member_id(display_name, user_id)
      `)
      .eq('room_id', rId)
      .order('created_at', { ascending: false })

    if (!allQuestions) return

    const inbox = []
    const sent = []
    const history = []

    for (const q of allQuestions) {
      const hasAnswer = q.answers && q.answers.length > 0
      
      if (hasAnswer) {
        history.push(q)
      } else {
        if (q.to_member_id === mId) {
          inbox.push(q)
        } else if (q.from_member_id === mId) {
          sent.push(q)
        }
      }
    }

    setInboxQuestions(inbox)
    setSentQuestions(sent)
    setHistoryItems(history)
  }

  const copyRoomId = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id)
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
          <h1 className="text-xl font-bold text-dark-cocoa">{room?.name}</h1>
          <div className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" onClick={copyRoomId}>
            <span>ID: {room?.id?.slice(0, 8)}...</span>
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </div>
        </div>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="text-rose-400 hover:text-rose-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-6">
        {activeTab === 'ask' && (
          <QuestionForm 
            roomId={room.id} 
            userId={session.user.id} 
            members={members} 
          />
        )}
        
        {activeTab === 'inbox' && (
          <Inbox 
            questions={inboxQuestions} 
            currentMemberId={member.id} 
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
