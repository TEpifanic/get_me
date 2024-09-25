import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const supabase = createServerComponentClient({ cookies })
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) throw error

    if (!user) {
      redirect('/')
    }

    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    if (dbError) throw dbError

    if (!dbUser?.first_name || !dbUser?.last_name) {
      redirect('/complete-profile')
    }

    return (
      <main>
        <h1>Tableau de Bord</h1>
        <p>Bienvenue, {dbUser.first_name} {dbUser.last_name}</p>
        {/* Ajoutez ici le contenu de votre tableau de bord */}
      </main>
    )
  } catch (error) {
    console.error('Error:', error)
    redirect('/')
  }
}