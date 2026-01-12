"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Auth from '@/components/Auth'
import Dashboard from '@/components/Dashboard'
import RoomSetup from '@/components/RoomSetup'

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isInRoom, setIsInRoom] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkRoomStatus()
      else setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkRoomStatus()
      else {
        setIsInRoom(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkRoomStatus = () => {
    try {
      const savedRoom = localStorage.getItem('roomData')
      if (savedRoom) {
        setIsInRoom(true)
      } else {
        setIsInRoom(false)
      }
    } catch (error) {
      console.error('Error checking room status:', error)
      setIsInRoom(false)
    } finally {
      setLoading(false)
    }
  }

  const handleRoomJoined = (data: { roomId: string; nickname: string; roomName: string }) => {
    localStorage.setItem('roomData', JSON.stringify(data))
    setIsInRoom(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFF4EC]">
        <div className="w-16 h-16 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  if (isInRoom === false) {
    return <RoomSetup userId={session.user.id} onRoomJoined={handleRoomJoined} />
  }

  return <Dashboard session={session} />
}
