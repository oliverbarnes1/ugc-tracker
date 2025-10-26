import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  avatarUrl: string
}

interface WithAuthProps {
  user: User | null
  loading: boolean
}

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P & WithAuthProps>
) {
  return function AuthenticatedComponent(props: P) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
      // Temporary bypass for development - set a mock user
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        avatarUrl: ''
      }
      
      setUser(mockUser)
      setLoading(false)
      
      // Original auth check (commented out for development)
      /*
      const checkAuth = async () => {
        try {
          const response = await fetch('/api/auth/me', {
            credentials: 'include',
          })
          
          if (response.ok) {
            const data = await response.json()
            setUser(data.user)
          } else {
            router.push('/login')
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          router.push('/login')
        } finally {
          setLoading(false)
        }
      }

      checkAuth()
      */
    }, [router])

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      )
    }

    if (!user) {
      return null // Will redirect to login
    }

    return <WrappedComponent {...props} user={user} loading={loading} />
  }
}