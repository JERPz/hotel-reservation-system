import { Link } from 'react-router-dom'
import Button from './Button'

export default function HotelCard({ roomType }) {
  const id = roomType.ID

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{roomType.Name}</h3>
          <p className="text-sm text-slate-600 mt-1 line-clamp-3">{roomType.Description}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">ต่อคืน</div>
          <div className="text-xl font-semibold">{Number(roomType.Price).toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-auto">
        <Link to={`/room-types/${id}`}>
          <Button className="w-full">ดูรายละเอียด</Button>
        </Link>
      </div>
    </div>
  )
}
