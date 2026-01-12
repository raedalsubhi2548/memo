"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { MessageCircleHeart, Send } from 'lucide-react'

interface InboxProps {
  questions: any[]
  nickname: string
}

export default function Inbox({ questions, nickname }: InboxProps) {
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})

  const handleReply = async (questionId: string) => {
    if (!replyText[questionId]?.trim()) return

    setLoading(prev => ({ ...prev, [questionId]: true }))
    try {
      const { error } = await supabase
        .from('qa_rounds')
        .update({
          answer_text: replyText[questionId],
          answer_sender: nickname,
          status: 'answered',
          answered_at: new Date().toISOString()
        })
        .eq('id', questionId)

      if (error) throw error

      setReplyText(prev => ({ ...prev, [questionId]: '' }))
    } catch (error) {
      console.error('Error sending reply:', error)
      alert('حدث خطأ أثناء إرسال الرد')
    } finally {
      setLoading(prev => ({ ...prev, [questionId]: false }))
    }
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white/60 p-8 rounded-2xl text-center border border-dashed border-rose-200">
        <MessageCircleHeart className="w-10 h-10 text-rose-300 mx-auto mb-3" />
        <p className="text-gray-500">لا توجد أسئلة جديدة... ربما يجب أن تبدأ أنت؟ 😉</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-dark-cocoa mb-4">صندوق الوارد 💌</h3>
      
      {questions.map((q, index) => (
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-rose-100"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-sm font-medium text-rose-500 bg-rose-50 px-3 py-1 rounded-full">
              من {q.question_sender || 'شريكك'}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(q.created_at).toLocaleDateString('ar-EG')}
            </span>
          </div>
          
          <p className="text-lg text-gray-800 mb-6 font-medium leading-relaxed">
            "{q.question_text}"
          </p>

          <div className="relative">
            <textarea
              value={replyText[q.id] || ''}
              onChange={(e) => setReplyText({ ...replyText, [q.id]: e.target.value })}
              placeholder="اكتب ردك هنا..."
              className="w-full p-3 pr-4 rounded-xl bg-rose-50/50 border border-rose-100 focus:border-rose-300 focus:bg-white transition-all outline-none resize-none h-24 text-sm"
            />
            <button
              onClick={() => handleReply(q.id)}
              disabled={loading[q.id] || !replyText[q.id]?.trim()}
              className="absolute bottom-3 left-3 bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg transition-all shadow-md disabled:opacity-50 disabled:shadow-none"
              title="أرسل الرد"
            >
              {loading[q.id] ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
