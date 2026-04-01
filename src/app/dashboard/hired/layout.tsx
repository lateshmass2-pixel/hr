import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { isRoleAtLeast } from "@/lib/rbac/types";

export default async function HiredLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    
    // Prevent rendering the /hired route tree if the user is not at least an HR admin
    if (!session || !isRoleAtLeast(session.role, 'hr')) {
        redirect("/dashboard");
    }

    return <>{children}</>;
}
