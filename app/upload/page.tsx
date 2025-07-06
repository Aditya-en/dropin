import { PublicUpload } from "@/components/public-upload"
import { Suspense } from "react"

export default function PublicUploadPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="py-8 text-center">Loading…</div>}>
        <PublicUpload />
      </Suspense>
    </div>
  )
}
