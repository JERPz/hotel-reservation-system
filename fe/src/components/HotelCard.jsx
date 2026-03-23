import { Link } from 'react-router-dom'
import { Users, Info, ChevronRight, Star } from 'lucide-react'
import Button from './Button'

export default function HotelCard({ roomType, image }) {
  const id = roomType.ID

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col border-b-4 border-b-transparent hover:border-b-sky-500">
      <div className="relative aspect-[16/10] overflow-hidden">
        {image ? (
          <img 
            src={image} 
            alt={roomType.Name} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        ) : (
          <div className="h-full w-full bg-slate-100 flex items-center justify-center">
            <Info className="text-slate-300" size={48} />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-2 py-1 text-[10px] font-bold text-slate-900 shadow-sm">
            <Star size={12} className="text-amber-400 fill-amber-400" />
            4.8
          </div>
        </div>
        <div className="absolute bottom-3 left-3">
          <div className="flex items-center gap-1 rounded-full bg-sky-600/90 backdrop-blur-sm px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            {roomType.Name}
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">{roomType.Name}</h3>
            <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
              {roomType.Description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-auto pt-4 border-t border-slate-50">
          <div className="flex items-center gap-1 text-slate-500">
            <Users size={14} />
            <span className="text-xs font-medium">2-4 ท่าน</span>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">ราคาเริ่มต้น</div>
            <div className="text-lg font-bold text-slate-900">
              ฿{Number(roomType.Price).toLocaleString()}
              <span className="text-xs font-normal text-slate-400 ml-1">/คืน</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Link to={`/room-types/${id}`}>
            <Button className="w-full flex items-center justify-center gap-2 group/btn">
              จองห้องนี้
              <ChevronRight size={16} className="transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
