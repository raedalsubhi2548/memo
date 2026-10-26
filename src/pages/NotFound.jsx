import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
export default function NotFound() {
  return (
    <div className="container-w grid justify-items-center gap-4 py-24 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-sunken text-primary"><Compass className="size-7" /></span>
      <h1 className="font-display text-display-sm font-semibold text-primary">الصفحة غير موجودة</h1>
      <p className="max-w-md text-muted-foreground">الرابط قديم أو فيه خطأ. ارجعي للمنتجات وكمّلي من هناك.</p>
      <Button asChild><Link to="/shop">تصفّحي المنتجات</Link></Button>
    </div>
  )
}
