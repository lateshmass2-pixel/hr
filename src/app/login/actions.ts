'use server'

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    // Check Role and Redirect
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role === 'HR_ADMIN') {
            redirect("/admin/dashboard");
        } else if (profile?.role === 'EMPLOYEE') {
            redirect("/employee/dashboard");
        } else {
            redirect("/onboarding");
        }
    }

    redirect("/login"); // Fallback
}

export async function signup(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const supabase = await createClient();

    // Sign up as HR_ADMIN (company creation flow)
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: 'HR_ADMIN', // Explicitly setting this in metadata for trigger to pick up if needed, though our trigger defaults to EMPLOYEE. 
                // We might need to update the trigger or handle this role update manually if the trigger defaults to EMPLOYEE.
            },
        },
    });

    if (error) {
        return { error: error.message };
    }

    // NOTE: Our SQL trigger currently defaults to 'EMPLOYEE'. 
    // We might want to manually update the role here if the user is creating a company.
    // For now, let's assume the user needs to confirm email first, so we redirect to a confirmation message.

    return { success: "Check your email to confirm your account." };
}
