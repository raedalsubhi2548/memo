"use client"

import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'

interface HistoryProps {
  history: any[]
  currentUserId: string
}

export default function History({ history, currentUserId }: HistoryProps) {
  if (history.length === 0) return null

  return (
    <div className="space-y-8 py-8">
      <div className="flex items-center justify-center gap-4 opacity-50">
        <div className="h-px bg-rose-300 flex-1"></div>
        <Heart className="w-4 h-4 text-rose-300" />
        <div className="h-px bg-rose-300 flex-1"></div>
      </div>

      <h3 className="text-center text-xl font-bold text-dark-cocoa">ذكرياتنا المشتركة</h3>

      <div className="space-y-6">
        {history.map((item, index) => {
          const isMyQuestion = item.from_member?.user_id === currentUserId
          const answer = item.answers?.[0]
          
          if (!answer) return null // Should not happen in history view usually

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden border border-rose-100"
            >
              {/* Question Section */}
              <div className="bg-rose-50/50 p-4 border-b border-rose-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                    {isMyQuestion ? 'سألتُ أنا' : `سأل ${item.from_member?.display_name}`}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(item.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                <p className="text-dark-cocoa font-medium">{item.question_text}</p>
              </div>

              {/* Answer Section */}
              <div className="p-5 bg-white">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {isMyQuestion ? `أجاب ${item.to_member?.display_name}` : 'أجبتُ أنا'}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(answer.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {answer.answer_text}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
