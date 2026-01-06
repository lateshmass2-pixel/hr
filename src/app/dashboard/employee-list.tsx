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
        <div className="rounded-xl overflow-hidden bg-white border border-gray-200">
            <Table>
                <TableHeader>
                    <TableRow className="border-b border-gray-200 hover:bg-gray-50">
                        <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Email</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Position</TableHead>
                        <TableHead className="text-gray-700 font-semibold">Joined Date</TableHead>
                        <TableHead className="text-right text-gray-700 font-semibold">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {employees.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-gray-500">
                                No employees found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        employees.map((employee) => (
                            <TableRow
                                key={employee.id}
                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                                <TableCell className="font-medium text-gray-900">{employee.full_name}</TableCell>
                                <TableCell className="text-gray-700">{employee.email}</TableCell>
                                <TableCell className="text-gray-700">{employee.position || '-'}</TableCell>
                                <TableCell className="text-gray-700">{format(new Date(employee.created_at), 'MMM d, yyyy')}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
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
