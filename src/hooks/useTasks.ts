
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export const useTasks = (projectId: string) => {
    const [tasks, setTasks] = useState<any[]>([])
    const supabase = createClient()

    useEffect(() => {
        // 1. Initial Fetch
        const fetchTasks = async () => {
            const { data } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })

            if (data) setTasks(data)
        }

        fetchTasks()

        // 2. Realtime Subscription
        const channel = supabase
            .channel('tasks-update')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tasks',
                filter: `project_id=eq.${projectId}`
            }, (payload) => {
                console.log('Realtime change received!', payload)
                // Simple strategy: Re-fetch or append. 
                // For simplicity, we'll re-fetch to ensure order.
                fetchTasks()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [projectId, supabase])

    return { tasks }
}
