"use client"

import { motion } from 'framer-motion'
import { Clock, CheckCircle2 } from 'lucide-react'

interface SentQuestionsProps {
  questions: any[]
}

export default function SentQuestions({ questions }: SentQuestionsProps) {
  if (questions.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-dark-cocoa mb-4">أسئلتي المرسلة</h3>
      
      <div className="grid gap-3">
        {questions.map((q, index) => {
          const isAnswered = q.answers && q.answers.length > 0
          
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl border flex justify-between items-center ${
                isAnswered 
                  ? 'bg-green-50/50 border-green-100' 
                  : 'bg-white/60 border-gray-100'
              }`}
            >
              <p className="text-gray-700 truncate max-w-[70%] text-sm">
                {q.question_text}
              </p>
              
              <div className="flex items-center gap-2 text-xs">
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
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
