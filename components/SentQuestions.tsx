"use client"

import { motion } from 'framer-motion'
import { Clock, CheckCircle2, MessageCircle } from 'lucide-react'

interface SentQuestionsProps {
  questions: any[]
}

export default function SentQuestions({ questions }: SentQuestionsProps) {
  if (questions.length === 0) {
    return (
      <div className="bg-white/60 p-8 rounded-2xl text-center border border-dashed border-rose-200">
        <MessageCircle className="w-10 h-10 text-rose-300 mx-auto mb-3" />
        <p className="text-gray-500">لم ترسل أي أسئلة بعد... ابدأ بسؤال شريكك! 💕</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-dark-cocoa mb-4">أسئلتي المرسلة 💌</h3>
      
      <div className="grid gap-4">
        {questions.map((q, index) => {
          const isAnswered = q.status === 'answered'
          
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-5 rounded-2xl border ${
                isAnswered 
                  ? 'bg-green-50/50 border-green-200' 
                  : 'bg-white/60 border-gray-100'
              }`}
            >
              {/* السؤال */}
              <div className="flex justify-between items-start mb-3">
                <p className="text-gray-700 font-medium">
                  {q.question_text}
                </p>
                <div className="flex items-center gap-2 text-xs mr-2">
                  {isAnswered ? (
                    <span className="flex items-center gap-1 text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      تم الرد
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      بانتظار الرد
                    </span>
                  )}
                </div>
              </div>
              
              {/* الرد إذا موجود */}
              {isAnswered && q.answer_text && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-sm text-gray-500 mb-1">رد {q.answer_sender || 'شريكك'}:</p>
                  <p className="text-gray-800 bg-white/70 p-3 rounded-xl">
                    {q.answer_text}
                  </p>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
