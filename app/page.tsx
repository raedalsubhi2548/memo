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
      if (session) checkRoomStatus(session.user.id)
      else setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkRoomStatus(session.user.id)
      else {
        setIsInRoom(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkRoomStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      
      setIsInRoom(!!data)
    } catch (error) {
      console.error('Error checking room status:', error)
      setIsInRoom(false)
    } finally {
      setLoading(false)
    }
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
    return <RoomSetup userId={session.user.id} onRoomJoined={() => setIsInRoom(true)} />
  }

  return <Dashboard session={session} />
}
