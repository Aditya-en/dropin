import { SettingsForm } from "@/components/settings-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Files
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            DropIN Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure your AWS S3 credentials to connect to your storage bucket.
          </p>
        </div>
        <SettingsForm />
      </div>
    </div>
  )
}
