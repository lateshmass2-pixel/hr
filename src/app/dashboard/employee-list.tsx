'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { deleteEmployee } from "@/app/actions/employee"
import { useState } from "react"
import { format } from "date-fns"

interface Employee {
    id: string
    full_name: string
    email: string
    position: string | null
    created_at: string
}

export function EmployeeList({ employees }: { employees: Employee[] }) {
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return

        setLoadingId(id)
        const result = await deleteEmployee(id)
        setLoadingId(null)

        if (!result.success) {
            alert(result.message)
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Joined Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {employees.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                No employees found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        employees.map((employee) => (
                            <TableRow key={employee.id}>
                                <TableCell className="font-medium">{employee.full_name}</TableCell>
                                <TableCell>{employee.email}</TableCell>
                                <TableCell>{employee.position || '-'}</TableCell>
                                <TableCell>{format(new Date(employee.created_at), 'MMM d, yyyy')}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        disabled={loadingId === employee.id}
                                        onClick={() => handleDelete(employee.id, employee.full_name)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
