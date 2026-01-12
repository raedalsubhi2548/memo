"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Plus, Users } from 'lucide-react'

interface RoomSetupProps {
  userId: string
  onRoomJoined: (data: { roomId: string; nickname: string; roomName: string }) => void
}

export default function RoomSetup({ userId, onRoomJoined }: RoomSetupProps) {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [roomName, setRoomName] = useState('غرفة العشاق')
  const [roomId, setRoomId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!displayName.trim()) {
      setError('يرجى إدخال اسمك المستعار')
      setLoading(false)
      return
    }

    try {
      // 1. Create Room (Insert name and created_by)
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ 
          name: roomName,
          created_by: displayName
        })
        .select()
        .single()

      if (roomError) throw roomError

      // 2. Success - No members table insertion
      onRoomJoined({ 
        roomId: room.id, 
        nickname: displayName,
        roomName: room.name
      })

    } catch (err: any) {
      console.error(err)
      setError('حدث خطأ أثناء إنشاء الغرفة. حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!displayName.trim()) {
      setError('يرجى إدخال اسمك المستعار')
      setLoading(false)
      return
    }

    try {
      // 1. Check if room exists
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('id', roomId)
        .single()

      if (roomError || !room) throw new Error('الغرفة غير موجودة')

      // 2. Success - No members table insertion
      onRoomJoined({ 
        roomId: room.id, 
        nickname: displayName,
        roomName: room.name
      })

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الانضمام')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl w-full max-w-md border border-white/50"
      >
        <h2 className="text-2xl font-bold text-dark-cocoa mb-6 text-center">إعداد الغرفة</h2>

        <div className="flex justify-center mb-6 bg-rose-50 p-1 rounded-xl">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === 'create'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            إنشاء غرفة جديدة
          </button>
          <button
            onClick={() => setMode('join')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === 'join'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            الانضمام لغرفة
          </button>
        </div>

        {error && (
          <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {mode === 'create' ? (
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم الغرفة</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none bg-white/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسمك المستعار</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="مثلاً: رائد"
                className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none bg-white/50"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
            >
              {loading ? 'جاري الإنشاء...' : (
                <>
                  <Plus className="w-5 h-5" /> إنشاء الغرفة
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">معرف الغرفة (Room ID)</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="أدخل المعرف الذي أرسله شريكك"
                className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none bg-white/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسمك المستعار</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="مثلاً: مريم"
                className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none bg-white/50"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
            >
              {loading ? 'جاري الانضمام...' : (
                <>
                  <Users className="w-5 h-5" /> انضمام
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
