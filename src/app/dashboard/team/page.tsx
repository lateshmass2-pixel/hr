'use client'

import { useHems } from "@/context/HemsContext"
import { PageContainer } from "@/components/layout/PageContainer"
import { DirectoryView } from "@/components/dashboard/team/DirectoryView"
import { SquadView } from "@/components/dashboard/team/SquadView"
import { Loader2 } from "lucide-react"

export default function TeamPage() {
    const { currentUser, isLoading } = useHems()

    if (isLoading) {
        return (
            <PageContainer>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <Loader2 className="w-10 h-10 text-[#0a3b2a] animate-spin opacity-20" />
                    <p className="text-[#0a3b2a] font-bold text-sm animate-pulse tracking-widest uppercase">
                        Syncing Squad Data...
                    </p>
                </div>
            </PageContainer>
        )
    }

    const isHR = currentUser?.globalRole === 'HR_ADMIN'

    return (
        <PageContainer>
            {isHR ? <DirectoryView /> : <SquadView />}
        </PageContainer>
    )
}
