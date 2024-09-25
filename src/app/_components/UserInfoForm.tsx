'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { redirect, useRouter } from 'next/navigation'

export default function UserInfoForm() {

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClientComponentClient()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not found')

            const { error } = await supabase.from('users').upsert({
                id: user.id,
                first_name: firstName,
                last_name: lastName,
            })

            if (error) throw error

            router.push('/dashboard')
        } catch (error) {
            setError(error as string)
        } finally {
        setLoading(false)
        }
    }


    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
                required
            />
            <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom"
                required
            />
            <button type="submit" disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            {error && <p>{error}</p>}
        </form>
    )
}