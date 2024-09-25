'use client'
import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('email') // 'email' or 'otp'
  const [message, setMessage] = useState('')
  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
   
    if (step === 'email') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        }
      })
      if (error) {
        setMessage('Erreur lors de l\'envoi de l\'OTP: ' + error.message)
      } else {
        setMessage('OTP envoyé à votre email')
        setStep('otp')
      }
    } else {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      })
      if (error) {
        setMessage('OTP invalide: ' + error.message)
      } else {
        setMessage('Connexion réussie')
        handleSuccessfulAuth()
      }
    }
  }

  const handleSuccessfulAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      try {
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single()
        
        if (error) {
          if (error.code === 'PGRST116') {
            // L'utilisateur n'existe pas dans la table users, on le crée
            const { error: insertError } = await supabase
              .from('users')
              .insert({ id: user.id })
            
            if (insertError) throw insertError
            
            router.push('/complete-profile')
          } else {
            throw error
          }
        } else if (dbUser?.first_name && dbUser?.last_name) {
          router.push('/dashboard')
        } else {
          router.push('/complete-profile')
        }
      } catch (error) {
        console.error('Error:', error)
        setMessage('Une erreur est survenue. Veuillez réessayer.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {step === 'email' ? (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Votre email"
          required
        />
      ) : (
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Entrez le code OTP"
          required
        />
      )}
      <button type="submit">
        {step === 'email' ? 'Envoyer OTP' : 'Vérifier OTP'}
      </button>
      {message && <p>{message}</p>}
    </form>
  )
}