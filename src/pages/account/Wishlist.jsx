import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/kit.jsx'
import ServiceTicket from '@/components/home/ServiceTicket.jsx'

export default function Wishlist() {
  const { wishlist, byId, user } = useApp()
  const items = wishlist.map((id) => byId[id]).filter(Boolean)
  if (!items.length) return (
    <Empty icon={Heart} title="مفضلتك فاضية" action={<Button asChild><Link to="/shop">تصفّحي المنتجات</Link></Button>}>اضغطي القلب على أي منتج تبين ترجعين له.</Empty>
  )
  return (
    <>
      {!user && <p className="mb-6 rounded-md border-2 border-dashed border-accent bg-accent/10 p-4 text-sm"><Link to="/login?next=/account/wishlist" className="font-bold text-primary underline underline-offset-4">سجّلي دخولك</Link> عشان تحفظين مفضلتك في حسابك وتشوفينها من أي جهاز.</p>}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4">{items.map((p) => <li key={p.id}><ServiceTicket p={p} className="h-full" /></li>)}</ul>
    </>
  )
}
