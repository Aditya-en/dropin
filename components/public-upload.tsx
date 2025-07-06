"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, CheckCircle, AlertCircle, File, X } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface UploadData {
  url: string
  fields: Record<string, string>
  path: string
  fileType?: string
  maxFileSize: number
  description?: string
  expiresAt: string
}

interface UploadFile {
  file: File
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  error?: string
}

export function PublicUpload() {
  const searchParams = useSearchParams()
  const [uploadData, setUploadData] = useState<UploadData | null>(null)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const dataParam = searchParams.get("data")
    if (dataParam) {
      try {
        const parsed = JSON.parse(dataParam) as UploadData
        setUploadData(parsed)

        // Check if link has expired
        if (new Date(parsed.expiresAt) < new Date()) {
          toast({
            title: "Link Expired",
            description: "This upload link has expired.",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Invalid Link",
          description: "The upload link is invalid or corrupted.",
          variant: "destructive",
        })
      }
    }
  }, [searchParams, toast])

  const handleFileSelect = (selectedFiles: FileList) => {
    const newFiles: UploadFile[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]

      // Validate file type
      if (uploadData?.fileType && !file.type.match(uploadData.fileType)) {
        toast({
          title: "Invalid File Type",
          description: `File ${file.name} doesn't match the allowed type.`,
          variant: "destructive",
        })
        continue
      }

      // Validate file size
      if (uploadData && file.size > uploadData.maxFileSize) {
        toast({
          title: "File Too Large",
          description: `File ${file.name} exceeds the maximum size limit.`,
          variant: "destructive",
        })
        continue
      }

      newFiles.push({
        file,
        progress: 0,
        status: "pending",
      })
    }

    setFiles((prev) => [...prev, ...newFiles])
  }

  const uploadFile = async (uploadFile: UploadFile, index: number) => {
    if (!uploadData) return

    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status: "uploading" } : f)))

    try {
      const formData = new FormData()

      // Add all the required fields from the presigned POST
      Object.entries(uploadData.fields).forEach(([key, value]) => {
        formData.append(key, value)
      })

      // Add the file
      formData.append("file", uploadFile.file)

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, progress } : f)))
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status === 204) {
          setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, status: "success", progress: 100 } : f)))
          toast({
            title: "Upload Successful",
            description: `${uploadFile.file.name} uploaded successfully.`,
          })
        } else {
          throw new Error("Upload failed")
        }
      })

      xhr.addEventListener("error", () => {
        throw new Error("Upload failed")
      })

      xhr.open("POST", uploadData.url)
      xhr.send(formData)
    } catch (error) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: "error",
                error: "Upload failed",
              }
            : f,
        ),
      )

      toast({
        title: "Upload Failed",
        description: `Failed to upload ${uploadFile.file.name}.`,
        variant: "destructive",
      })
    }
  }

  const handleUploadAll = () => {
    files.forEach((file, index) => {
      if (file.status === "pending") {
        uploadFile(file, index)
      }
    })
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  if (!uploadData) {
    return (
      <div className="container mx-auto py-16 px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Invalid Upload Link</CardTitle>
            <CardDescription className="text-center">The upload link is missing or invalid.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const isExpired = new Date(uploadData.expiresAt) < new Date()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            DropIN Upload
          </h1>
          <p className="text-muted-foreground">Upload files to: {uploadData.path || "Root folder"}</p>
        </div>

        {isExpired ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>This upload link has expired and can no longer be used.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {uploadData.description && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">{uploadData.description}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Upload Files</CardTitle>
                <CardDescription>
                  {uploadData.fileType && uploadData.fileType !== "any" && (
                    <span>Allowed types: {uploadData.fileType} • </span>
                  )}
                  Max size: {Math.round(uploadData.maxFileSize / (1024 * 1024))} MB per file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground mb-4">You can upload multiple files at once</p>
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    className="max-w-xs mx-auto"
                    accept={uploadData.fileType !== "any" ? uploadData.fileType : undefined}
                  />
                </div>

                {files.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Files to upload ({files.length})</h3>
                      <Button onClick={handleUploadAll} disabled={files.every((f) => f.status !== "pending")} size="sm">
                        Upload All
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {files.map((uploadFile, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <File className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(uploadFile.file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                            {uploadFile.status === "uploading" && (
                              <Progress value={uploadFile.progress} className="mt-1" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {uploadFile.status === "success" && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {uploadFile.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                            {uploadFile.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="w-6 h-6 p-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
