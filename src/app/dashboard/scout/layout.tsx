import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isRoleAtLeast } from "@/lib/rbac/types";

export default async function ScoutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    
    // Prevent rendering the /scout route tree if the user is not at least a recruiter
    if (!session || !isRoleAtLeast(session.role, 'recruiter')) {
        redirect("/dashboard");
    }

    return <>{children}</>;
}
