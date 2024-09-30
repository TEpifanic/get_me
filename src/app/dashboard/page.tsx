import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LogoutButton from '~/app/_components/LogoutButton'
import AvailabilityGrid from '~/app/_components/AvailabilityGrid'

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
        <h1 className="text-2xl font-bold text-center">Tableau de Bord</h1>
        <p className="text-center">Bienvenue, {dbUser.first_name} {dbUser.last_name}</p>
        <LogoutButton />
        <h2 className="text-2xl font-bold text-center">Vos disponibilités</h2>
        <AvailabilityGrid userId={user.id} />
      </main>
    )
  } catch (error) {
    console.error('Error:', error)
    redirect('/')
  }
}