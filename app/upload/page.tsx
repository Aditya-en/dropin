import { PublicUpload } from "@/components/public-upload"
import { Suspense } from "react"

export default function PublicUploadPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Suspense fallback={<div className="py-8 text-center">Loading…</div>}>
          <PublicUpload />
        </Suspense>
      </div>
    </div>
  )
}
