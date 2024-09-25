import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import AuthForm from '~/app/_components/AuthForm'
import Dashboard from '~/app/dashboard/page'
import CompleteProfile from '~/app/complete-profile/page'

export default async function Home() {
  const supabase = createServerComponentClient({ cookies })
 
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main>
        <h1>Bienvenue</h1>
        <AuthForm />
      </main>
    )
  }

  try {
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()
    
    if (error && error.code === 'PGRST116') {
      // L'utilisateur n'existe pas dans la table users, on le crée
      await supabase.from('users').insert({ id: user.id })
      return <CompleteProfile />
    }

    if (dbUser?.first_name && dbUser?.last_name) {
      return <Dashboard />
    } else {
      return <CompleteProfile />
    }
  } catch (error) {
    console.error('Error:', error)
    // En cas d'erreur, on affiche le formulaire d'authentification
    return (
      <main>
        <h1>Une erreur est survenue</h1>
        <AuthForm />
      </main>
    )
  }
}