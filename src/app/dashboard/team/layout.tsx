import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isRoleAtLeast } from "@/lib/rbac/types";

export default async function TeamLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    
    // Allow all employees to access the Team route, as the page itself handles role-based content filtering
    if (!session || !isRoleAtLeast(session.role, 'employee')) {
        redirect("/dashboard");
    }

    return <>{children}</>;
}
