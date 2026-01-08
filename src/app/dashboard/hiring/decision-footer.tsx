'use client'

import { ConfirmHireDialog } from "./confirm-hire-dialog"
import { RejectDialog } from "./reject-dialog"
import { Button } from "@/components/ui/button"
import { UserCheck, XCircle } from "lucide-react"

type Application = {
    id: string
    candidate_name: string
    candidate_email: string
    offer_role?: string
}

export function DecisionFooter({ application }: { application: Application }) {
    return (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
            <RejectDialog
                application={application}
                trigger={
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 hover:text-red-700"
                    >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        Reject
                    </Button>
                }
            />
            <ConfirmHireDialog
                application={application}
                trigger={
                    <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                        <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                        Hire
                    </Button>
                }
            />
        </div>
    )
}
