import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Notes() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/')
  }

  const { data: notes } = await supabase.from("notes").select()

  return (
    <main>
      <h1>Notes</h1>
      <pre>{JSON.stringify(notes, null, 2)}</pre>
    </main>
  )
}