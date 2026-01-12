"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'

interface QuestionFormProps {
  roomId: string
  nickname: string
}

export default function QuestionForm({ roomId, nickname }: QuestionFormProps) {
  const [questionText, setQuestionText] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Frontend Validation
    if (!roomId) {
      alert('خطأ: رقم الغرفة غير موجود. يرجى إعادة تحميل الصفحة.')
      return
    }

    if (!questionText.trim()) {
      alert('يرجى كتابة سؤال قبل الإرسال')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('qa_rounds')
        .insert({
          room_id: roomId,
          question_text: questionText,
          question_sender: nickname || 'guest',
          status: 'question_sent'
        })

      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }

      setQuestionText('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      // Error is already logged above if it came from Supabase
      // If it's another error, we might want to log it too, but the requirement specifically asked for logging the Supabase error.
      // The catch block catches the thrown error.
      alert('حدث خطأ أثناء إرسال السؤال')
    } finally {
      setLoading(false)
    }
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
            disabled={loading}
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
