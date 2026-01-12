"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart } from 'lucide-react'

interface EntranceModalProps {
  onEnter: () => void
}

export default function EntranceModal({ onEnter }: EntranceModalProps) {
  const [isOpen, setIsOpen] = useState(true)

  const handleEnter = () => {
    setIsOpen(false)
    setTimeout(() => {
      onEnter()
    }, 500) // Wait for exit animation
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-lg w-full text-center border border-white"
          >
            <h2 className="text-2xl font-bold text-dark-cocoa mb-6 flex items-center justify-center gap-2">
              غرفة العشاق مريم ورائد <span className="text-rose-500">💕</span>
            </h2>

            <div className="bg-rose-50 p-6 rounded-2xl mb-8 border border-rose-100">
              <p className="text-lg font-medium text-dark-cocoa mb-4">هلا فيك بالغرفة السرية للعشاق مريم ورائد</p>
              <p className="text-gray-700 leading-relaxed">
                هذه الغرفة صادقة…ممنوع الخجل،مسموح الكلام من القلب وبدون حدود 🤍
              </p>
            </div>

            <button
              onClick={handleEnter}
              className="w-full bg-gradient-to-r from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold py-4 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Heart className="w-5 h-5 fill-white" />
              أفهم وأدخل
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
