import { ChevronRight, Info, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatBaht } from '../lib/money'
import { imageFor } from '../lib/roomImages'

/**
 * Room type summary card for the catalogue grid.
 *
 * Replaces HotelCard. The differences that matter: it reads the snake_case API
 * fields, resolves its own image from the room type's slug rather than taking one
 * as a prop, shows the real `capacity` and `room_count` from the server instead of
 * the hardcoded "2-4 ท่าน" and invented rating, and wraps the whole card in one
 * link so the entire surface is clickable.
 */
export function RoomTypeCard({ roomType, index = 0 }) {
  const image = imageFor(roomType, index)
  const soldOut = roomType.room_count === 0

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link to={`/room-types/${roomType.id}`} className="flex flex-1 flex-col focus-visible:outline-none">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
          {image ? (
            <img
              src={image}
              alt={`ห้องพักประเภท ${roomType.name}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Info className="text-slate-300" size={48} aria-hidden="true" />
            </div>
          )}

          <span className="absolute bottom-3 left-3 rounded-full bg-sky-600/95 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
            {roomType.name}
          </span>

          {soldOut ? (
            <span className="absolute right-3 top-3 rounded-full bg-slate-900/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
              ยังไม่เปิดให้จอง
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="line-clamp-1 text-lg font-bold text-slate-900 transition-colors group-hover:text-sky-600">
            {roomType.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{roomType.description}</p>

          <div className="mt-auto flex items-center gap-4 border-t border-slate-100 pt-4">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Users size={14} aria-hidden="true" />
              <span className="text-xs font-medium">
                {roomType.capacity} ท่าน
                {roomType.room_count > 0 ? ` · ${roomType.room_count} ห้อง` : ''}
              </span>
            </span>

            <span className="ml-auto text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                ราคาเริ่มต้น
              </span>
              <span className="text-lg font-bold text-slate-900">
                {formatBaht(roomType.price)}
                <span className="ml-1 text-xs font-normal text-slate-400">/คืน</span>
              </span>
            </span>
          </div>

          <span className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition-colors group-hover:bg-sky-700">
            ดูรายละเอียดและจอง
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </article>
  )
}
