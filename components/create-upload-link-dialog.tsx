"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Check, Link } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { s3Operations } from "@/lib/s3-client"

interface CreateUploadLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPath: string
}

const TIME_OPTIONS = [
  { value: "300", label: "5 minutes" },
  { value: "900", label: "15 minutes" },
  { value: "1800", label: "30 minutes" },
  { value: "3600", label: "1 hour" },
  { value: "7200", label: "2 hours" },
  { value: "21600", label: "6 hours" },
  { value: "43200", label: "12 hours" },
  { value: "86400", label: "24 hours" },
  { value: "259200", label: "3 days" },
  { value: "604800", label: "7 days" },
]

const FILE_TYPE_OPTIONS = [
  { value: "any", label: "Any file type" },
  { value: "video/*", label: "Videos only" },
  { value: "image/*", label: "Images only" },
  { value: "application/pdf", label: "PDF files only" },
  { value: "text/*", label: "Text files only" },
]

export function CreateUploadLinkDialog({ open, onOpenChange, currentPath }: CreateUploadLinkDialogProps) {
  const [expiresIn, setExpiresIn] = useState("3600")
  const [fileType, setFileType] = useState("any")
  const [maxFileSize, setMaxFileSize] = useState("100")
  const [description, setDescription] = useState("")
  const [uploadUrl, setUploadUrl] = useState("")
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const generateUploadLink = async () => {
    setGenerating(true)
    try {
      const uploadData = await s3Operations.createUploadLink({
        path: currentPath,
        expiresIn: Number.parseInt(expiresIn),
        fileType: fileType === "any" ? undefined : fileType,
        maxFileSize: Number.parseInt(maxFileSize) * 1024 * 1024, // Convert MB to bytes
        description,
      })

      // Create the public upload URL with the upload data as query params
      const baseUrl = window.location.origin
      const params = new URLSearchParams({
        data: JSON.stringify(uploadData),
      })
      const publicUrl = `${baseUrl}/upload?${params.toString()}`

      setUploadUrl(publicUrl)

      toast({
        title: "Upload Link Generated",
        description: `Link will expire in ${TIME_OPTIONS.find((opt) => opt.value === expiresIn)?.label}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate upload link.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(uploadUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      toast({
        title: "Copied!",
        description: "Upload link copied to clipboard.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      })
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setUploadUrl("")
      setCopied(false)
      setDescription("")
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Upload Link</DialogTitle>
          <DialogDescription>
            Generate a secure link that allows others to upload files to {currentPath || "root folder"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!uploadUrl ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expires-in">Link expires in</Label>
                  <Select value={expiresIn} onValueChange={setExpiresIn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select expiration time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file-type">Allowed file types</Label>
                  <Select value={fileType} onValueChange={setFileType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select file type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-size">Max file size (MB)</Label>
                <Input
                  id="max-size"
                  type="number"
                  value={maxFileSize}
                  onChange={(e) => setMaxFileSize(e.target.value)}
                  min="1"
                  max="1000"
                  placeholder="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for this upload link..."
                  rows={3}
                />
              </div>

              <Button onClick={generateUploadLink} disabled={generating} className="w-full">
                <Link className="w-4 h-4 mr-2" />
                {generating ? "Generating..." : "Generate Upload Link"}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upload-url">Upload URL</Label>
                <div className="flex gap-2">
                  <Input id="upload-url" value={uploadUrl} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    className="flex-shrink-0 bg-transparent"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                <p className="font-medium mb-2">📤 Upload Link Details:</p>
                <ul className="space-y-1">
                  <li>• Expires in: {TIME_OPTIONS.find((opt) => opt.value === expiresIn)?.label}</li>
                  <li>• File types: {FILE_TYPE_OPTIONS.find((opt) => opt.value === fileType)?.label}</li>
                  <li>• Max size: {maxFileSize} MB per file</li>
                  <li>• Destination: {currentPath || "Root folder"}</li>
                </ul>
                {description && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="font-medium">Description:</p>
                    <p className="text-xs">{description}</p>
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="font-medium mb-1">⚠️ Security Notice:</p>
                <p>Anyone with this link can upload files to your storage until it expires. Share responsibly.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
