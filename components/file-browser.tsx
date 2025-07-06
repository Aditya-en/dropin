"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Settings, Upload, FolderPlus, Search, Download, Trash2, File, Folder, MoreVertical, Share } from "lucide-react"
import { BreadcrumbNav } from "./breadcrumb-nav"
import { UploadDialog } from "./upload-dialog"
import { CreateFolderDialog } from "./create-folder-dialog"
import { useToast } from "@/hooks/use-toast"
import { s3Operations } from "@/lib/s3-client"
import { getStoredCredentials } from "@/lib/storage"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "./theme-toggle"
import { ShareDialog } from "./share-dialog"
import { CreateUploadLinkDialog } from "./create-upload-link-dialog"

interface S3Object {
  key: string
  name: string
  type: "file" | "folder"
  size?: number
  lastModified?: Date
}

export function FileBrowser() {
  const [currentPath, setCurrentPath] = useState("")
  const [objects, setObjects] = useState<S3Object[]>([])
  const [filteredObjects, setFilteredObjects] = useState<S3Object[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const { toast } = useToast()
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareFile, setShareFile] = useState<{ key: string; name: string } | null>(null)
  const [uploadLinkDialogOpen, setUploadLinkDialogOpen] = useState(false)

  const loadObjects = async () => {
    const credentials = getStoredCredentials()
    if (!credentials) {
      toast({
        title: "Configuration Required",
        description: "Please configure your AWS credentials in settings.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const result = await s3Operations.listObjects(currentPath)
      setObjects(result)
      setFilteredObjects(result)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load files and folders.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadObjects()
  }, [currentPath])

  useEffect(() => {
    const filtered = objects.filter((obj) => obj.name.toLowerCase().includes(searchQuery.toLowerCase()))
    setFilteredObjects(filtered)
  }, [searchQuery, objects])

  const handleFolderClick = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName
    setCurrentPath(newPath)
    setSelectedItems(new Set())
  }

  const handleItemSelect = (key: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(key)
    } else {
      newSelected.delete(key)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredObjects.map((obj) => obj.key)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleDownload = async (key: string) => {
    try {
      const url = await s3Operations.getDownloadUrl(key)
      const link = document.createElement("a")
      link.href = url
      link.download = key.split("/").pop() || key
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Success",
        description: "File download started.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (key: string) => {
    try {
      await s3Operations.deleteObject(key)
      toast({
        title: "Success",
        description: "Item deleted successfully.",
      })
      loadObjects()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item.",
        variant: "destructive",
      })
    }
  }

  const handleBulkDownload = async () => {
    for (const key of selectedItems) {
      await handleDownload(key)
    }
    setSelectedItems(new Set())
  }

  const pathSegments = currentPath ? currentPath.split("/") : []

  const handleUploadClick = () => {
    const credentials = getStoredCredentials()
    if (!credentials) {
      toast({
        title: "Configuration Required",
        description: "Please configure your AWS credentials in settings first.",
        variant: "destructive",
      })
      return
    }
    setUploadDialogOpen(true)
  }

  const handleCreateFolderClick = () => {
    const credentials = getStoredCredentials()
    if (!credentials) {
      toast({
        title: "Configuration Required",
        description: "Please configure your AWS credentials in settings first.",
        variant: "destructive",
      })
      return
    }
    setFolderDialogOpen(true)
  }

  const handleShare = (key: string, name: string) => {
    setShareFile({ key, name })
    setShareDialogOpen(true)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            DropIN
          </h1>
          <p className="text-muted-foreground">Manage your files and folders</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Breadcrumb */}
      <BreadcrumbNav segments={pathSegments} onNavigate={setCurrentPath} className="mb-6" />

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={handleUploadClick}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
          <Button variant="outline" onClick={handleCreateFolderClick}>
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button variant="outline" onClick={() => setUploadLinkDialogOpen(true)}>
            <Share className="w-4 h-4 mr-2" />
            Create Upload Link
          </Button>
          {selectedItems.size > 0 && (
            <Button variant="outline" onClick={handleBulkDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download ({selectedItems.size})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* File List */}
      <Card className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : filteredObjects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchQuery ? "No items match your search." : "This folder is empty."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <Checkbox checked={selectedItems.size === filteredObjects.length} onCheckedChange={handleSelectAll} />
                <span>Name</span>
              </div>
              <div className="ml-auto flex items-center gap-8">
                <span>Size</span>
                <span>Modified</span>
                <span className="w-8"></span>
              </div>
            </div>

            {/* Items */}
            {filteredObjects.map((obj) => (
              <div key={obj.key} className="flex items-center gap-4 py-3 hover:bg-muted/50 rounded-lg px-2 group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Checkbox
                    checked={selectedItems.has(obj.key)}
                    onCheckedChange={(checked) => handleItemSelect(obj.key, checked as boolean)}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    {obj.type === "folder" ? (
                      <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    ) : (
                      <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    )}
                    <span
                      className={`truncate ${obj.type === "folder" ? "cursor-pointer hover:underline" : ""}`}
                      onClick={() => obj.type === "folder" && handleFolderClick(obj.name)}
                    >
                      {obj.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-8 text-sm text-muted-foreground">
                  <span className="w-16 text-right">{obj.size ? `${(obj.size / 1024).toFixed(1)} KB` : "-"}</span>
                  <span className="w-24 text-right">
                    {obj.lastModified ? obj.lastModified.toLocaleDateString() : "-"}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {obj.type === "file" && (
                        <>
                          <DropdownMenuItem onClick={() => handleDownload(obj.key)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShare(obj.key, obj.name)}>
                            <Share className="w-4 h-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handleDelete(obj.key)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        currentPath={currentPath}
        onUploadComplete={loadObjects}
      />

      <CreateFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        currentPath={currentPath}
        onFolderCreated={loadObjects}
      />
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        fileKey={shareFile?.key || ""}
        fileName={shareFile?.name || ""}
      />
      <CreateUploadLinkDialog
        open={uploadLinkDialogOpen}
        onOpenChange={setUploadLinkDialogOpen}
        currentPath={currentPath}
      />
    </div>
  )
}
