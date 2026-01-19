import { SettingsForm } from "./settings-form"

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
                <p className="text-zinc-400">
                    Manage your account settings and preferences.
                </p>
            </div>
            <SettingsForm />
        </div>
    )
}
