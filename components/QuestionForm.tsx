"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Send, Heart } from 'lucide-react'

interface QuestionFormProps {
  roomId: string
  userId: string
  members: any[]
}

export default function QuestionForm({ roomId, userId, members }: QuestionFormProps) {
  const [questionText, setQuestionText] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [recipientId, setRecipientId] = useState<string>('')

  // Default recipient to the other member if exists
  useEffect(() => {
    const otherMember = members.find(m => m.user_id !== userId)
    if (otherMember) {
      setRecipientId(otherMember.id)
    }
  }, [members, userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!questionText.trim() || !recipientId) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('questions')
        .insert({
          room_id: roomId,
          from_member_id: members.find(m => m.user_id === userId)?.id,
          to_member_id: recipientId,
          question_text: questionText,
        })

      if (error) throw error

      setQuestionText('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error sending question:', error)
      alert('حدث خطأ أثناء إرسال السؤال')
    } finally {
      setLoading(false)
    }
  }

  const otherMembers = members.filter(m => m.user_id !== userId)

  if (otherMembers.length === 0) {
    return (
      <div className="bg-white/60 p-6 rounded-2xl text-center">
        <p className="text-gray-500">بانتظار انضمام شريكك إلى الغرفة...</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-rose-100"
    >
      <h3 className="text-xl font-bold text-dark-cocoa mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-rose-500" />
        اسأل شريكك
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">إلى من؟</label>
          <div className="flex gap-2">
            {otherMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setRecipientId(member.id)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  recipientId === member.id
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-rose-300'
                }`}
              >
                {member.display_name || 'شريكك'}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="اكتب سؤالك هنا... (لا تخجل)"
          className="w-full h-32 p-4 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none resize-none bg-white/50"
          required
        />

        <div className="flex justify-end items-center gap-3">
          {success && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-green-600 text-sm font-medium"
            >
              وصل سؤالك 💕
            </motion.span>
          )}
          
          <button
            type="submit"
            disabled={loading || !recipientId}
            className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-full font-medium shadow-lg shadow-rose-200 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? 'جاري الإرسال...' : (
              <>
                إرسال <Heart className="w-4 h-4 fill-white animate-pulse" />
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  )
}
