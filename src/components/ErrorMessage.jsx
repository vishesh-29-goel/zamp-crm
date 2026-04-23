import { AlertCircle } from 'lucide-react'
export default function ErrorMessage({ error }) {
  return (
    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg text-sm">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {typeof error === 'string' ? error : 'Something went wrong'}
    </div>
  )
}
