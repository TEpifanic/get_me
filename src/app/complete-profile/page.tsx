import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import UserInfoForm from '~/app/_components/UserInfoForm'

export default async function CompleteProfile() {
  const supabase = createServerComponentClient({ cookies })
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) throw error

    if (!user) {
      redirect('/')
    }

    // Vérifier si l'utilisateur a déjà rempli ses informations
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    if (dbError) throw dbError

    if (dbUser?.first_name && dbUser?.last_name) {
      redirect('/dashboard')
    }

    return (
      <main>
        <h1>Complétez votre profil</h1>
        <UserInfoForm />
      </main>
    )
  } catch (error) {
    console.error('Error:', error)
    redirect('/')
  }
}