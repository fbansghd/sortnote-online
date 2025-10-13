"use client"

import dynamic from 'next/dynamic'
import React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const MemosApp = dynamic(() => import('@/memos/App'), { ssr: false })

export default function Page() {
  const { data: session, status } = useSession()
  const router = useRouter()

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  if (status === 'loading') return <div>Loading...</div>
  if (!session) return null

  return (
    <main>
      <MemosApp />
    </main>
  )
}
