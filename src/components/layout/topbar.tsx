import { LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  avatarUrl: string
}

interface TopbarProps {
  onMobileMenuToggle: () => void
}

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error('Failed to fetch user:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMobileMenuToggle}
        className="md:hidden"
        title="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      <div className="ml-auto flex items-center space-x-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </Button>
        
        <div className="text-right">
          <p className="text-sm font-medium">
            {loading ? 'Loading...' : user ? `${user.firstName} ${user.lastName}` : 'User'}
          </p>
          <p className="text-xs text-muted-foreground">Admin</p>
        </div>
        <Avatar>
          <AvatarImage 
            src={user?.avatarUrl || '/placeholder-avatar.jpg'} 
            alt="User" 
          />
          <AvatarFallback>
            {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
