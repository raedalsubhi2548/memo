"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}`,
        },
      })

      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/40 backdrop-blur-md p-8 rounded-3xl shadow-xl w-full max-w-md border border-white/50"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-rose-100 p-4 rounded-full">
            <Heart className="w-12 h-12 text-rose-500 fill-rose-500" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-2 text-dark-cocoa">غرفة العشاق</h1>
        <p className="text-gray-600 mb-8">سجّل دخولك لتبدأ رحلة المحبة</p>

        {sent ? (
          <div className="bg-green-100 p-4 rounded-xl text-green-800 border border-green-200">
            <p className="font-medium">تم إرسال رابط الدخول إلى بريدك الإلكتروني 💕</p>
            <p className="text-sm mt-2">يرجى تفقد صندوق الوارد (أو الرسائل غير المرغوب فيها)</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-right">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 mr-1">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white/70"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الإرسال...' : 'دخول'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
