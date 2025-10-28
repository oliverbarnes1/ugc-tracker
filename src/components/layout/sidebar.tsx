import Link from 'next/link'
import { useRouter } from 'next/router'
import { cn } from '@/lib/utils'
import { 
  Users, 
  Settings, 
  Home,
  Image,
  DollarSign,
  TrendingUp
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Gallery', href: '/gallery', icon: Image },
  { name: 'Creators', href: '/creators', icon: Users },
  { name: 'Payments', href: '/payments', icon: DollarSign },
  { name: "CPMs", href: '/cpms', icon: TrendingUp },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  onMobileClose?: () => void
}

export function Sidebar({ onMobileClose }: SidebarProps) {
  const router = useRouter()
  const pathname = router.pathname

  const handleLinkClick = () => {
    if (onMobileClose) {
      onMobileClose()
    }
  }

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex h-16 items-center px-6 border-b">
        <h1 className="text-xl font-bold text-foreground">UGC Tracker</h1>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
            >
              <a
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </a>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
