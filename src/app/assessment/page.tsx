import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function AssessmentPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-slate-50">
      <div className="max-w-md">
        <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Assessment Not Found</h1>
        <p className="text-muted-foreground mb-6">
          Please access this page using the unique assessment link sent to your email. If you don't have a link, please contact the HR team.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  )
}
