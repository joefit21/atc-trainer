'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TrainerRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/radio-lab') }, [])
  return null
}
