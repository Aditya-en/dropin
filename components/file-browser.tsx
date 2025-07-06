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
import { FileOperations } from "@/lib/file-operations"
import { ToastUtils } from "@/lib/toast-utils"

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
  const { toast } = useToast()
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareFile, setShareFile] = useState<{ key: string; name: string } | null>(null)
  const [uploadLinkDialogOpen, setUploadLinkDialogOpen] = useState(false)
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set())
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set())

  const loadObjects = async () => {
    const credentials = getStoredCredentials()
    if (!credentials) {
      ToastUtils.showConfigurationRequired()
      return
    }

    setLoading(true)
    try {
      const result = await s3Operations.listObjects(currentPath)
      setObjects(result)
      setFilteredObjects(result)
    } catch (error) {
      ToastUtils.showLoadError()
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
    const filename = key.split("/").pop() || key

    setDownloadingFiles((prev) => new Set(prev).add(key))

    try {
      const result = await FileOperations.downloadSingleFile(key)

      if (result.success) {
        ToastUtils.showDownloadSuccess(filename)
      } else {
        ToastUtils.showDownloadError(filename)
      }
    } catch (error) {
      console.error("Download error:", error)
      ToastUtils.showDownloadError(filename)
    } finally {
      setDownloadingFiles((prev) => {
        const newSet = new Set(prev)
        newSet.delete(key)
        return newSet
      })
    }
  }

  const handleDelete = async (key: string, type: "file" | "folder") => {
    const itemName = key.split("/").pop() || key

    setDeletingItems((prev) => new Set(prev).add(key))

    try {
      const result = await FileOperations.deleteSingleItem(key, type === "folder")

      if (result.success) {
        ToastUtils.showDeleteSuccess(itemName)
        loadObjects() // Refresh the list
      } else {
        ToastUtils.showDeleteError(itemName)
      }
    } catch (error) {
      console.error("Delete error:", error)
      ToastUtils.showDeleteError(itemName)
    } finally {
      setDeletingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(key)
        return newSet
      })
    }
  }

  const handleBulkDownload = async () => {
    const filesToDownload = Array.from(selectedItems)

    ToastUtils.showBulkDownloadStart(filesToDownload.length)

    try {
      const { successCount, failCount } = await FileOperations.downloadMultipleFiles(filesToDownload)
      ToastUtils.showBulkDownloadComplete(successCount, failCount)
    } catch (error) {
      console.error("Bulk download error:", error)
      ToastUtils.showBulkDownloadComplete(0, filesToDownload.length)
    }

    setSelectedItems(new Set())
  }

  const handleBulkDelete = async () => {
    const itemsToDelete = Array.from(selectedItems).map((key) => {
      const obj = objects.find((o) => o.key === key)
      return {
        key,
        type: obj?.type || ("file" as "file" | "folder"),
      }
    })

    ToastUtils.showBulkDeleteStart(itemsToDelete.length)

    try {
      const { successCount, failCount } = await FileOperations.deleteMultipleItems(itemsToDelete)
      ToastUtils.showBulkDeleteComplete(successCount, failCount)

      if (successCount > 0) {
        loadObjects() // Refresh the list
      }
    } catch (error) {
      console.error("Bulk delete error:", error)
      ToastUtils.showBulkDeleteComplete(0, itemsToDelete.length)
    }

    setSelectedItems(new Set())
  }

  const pathSegments = currentPath ? currentPath.split("/") : []

  const handleUploadClick = () => {
    const credentials = getStoredCredentials()
    if (!credentials) {
      ToastUtils.showConfigurationRequired()
      return
    }
    setUploadDialogOpen(true)
  }

  const handleCreateFolderClick = () => {
    const credentials = getStoredCredentials()
    if (!credentials) {
      ToastUtils.showConfigurationRequired()
      return
    }
    setFolderDialogOpen(true)
  }

  const handleShare = (key: string, name: string) => {
    setShareFile({ key, name })
    setShareDialogOpen(true)
  }

  return (
    <div className="container mx-auto py-4 px-4 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            DropIN
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage your files and folders</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ThemeToggle />
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Breadcrumb */}
      <BreadcrumbNav segments={pathSegments} onNavigate={setCurrentPath} className="mb-6" />

      {/* Search Bar - Mobile First */}
      <div className="mb-4 sm:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        {/* Primary Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleUploadClick} size="sm" className="flex-shrink-0">
            <Upload className="w-4 h-4 mr-2" />
            <span className="hidden xs:inline">Upload</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleCreateFolderClick}
            size="sm"
            className="flex-shrink-0 bg-transparent"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            <span className="hidden xs:inline">Folder</span>
          </Button>
          <Button variant="outline" onClick={() => setUploadLinkDialogOpen(true)} size="sm" className="flex-shrink-0">
            <Share className="w-4 h-4 mr-2" />
            <span className="hidden xs:inline">Upload Link</span>
          </Button>
        </div>

        {/* Bulk Actions & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={handleBulkDownload} size="sm" className="flex-shrink-0 bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                Download ({selectedItems.size})
              </Button>
              <Button
                variant="outline"
                onClick={handleBulkDelete}
                size="sm"
                className="text-destructive hover:text-destructive bg-transparent flex-shrink-0"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedItems.size})
              </Button>
            </div>
          )}

          {/* Search - Desktop */}
          <div className="hidden sm:block">
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
      </div>

      {/* File List */}
      <Card className="p-3 sm:p-6 overflow-hidden">
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
            {/* Header - Desktop Only */}
            <div className="hidden sm:flex items-center gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
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
              <div
                key={obj.key}
                className="flex items-center gap-2 sm:gap-4 py-3 hover:bg-muted/50 rounded-lg px-2 group"
              >
                {/* Mobile Layout */}
                <div className="flex items-center gap-3 flex-1 min-w-0 sm:hidden">
                  <Checkbox
                    checked={selectedItems.has(obj.key)}
                    onCheckedChange={(checked) => handleItemSelect(obj.key, checked as boolean)}
                  />
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {obj.type === "folder" ? (
                      <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    ) : (
                      <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span
                        className={`truncate text-sm ${obj.type === "folder" ? "cursor-pointer hover:underline" : ""}`}
                        onClick={() => obj.type === "folder" && handleFolderClick(obj.name)}
                      >
                        {obj.name}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {obj.size && <span>{(obj.size / 1024).toFixed(1)} KB</span>}
                        {obj.lastModified && <span>{obj.lastModified.toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {obj.type === "file" && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleDownload(obj.key)}
                            disabled={downloadingFiles.has(obj.key)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {downloadingFiles.has(obj.key) ? "Downloading..." : "Download"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShare(obj.key, obj.name)}>
                            <Share className="w-4 h-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(obj.key, obj.type)}
                        className="text-destructive"
                        disabled={deletingItems.has(obj.key)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deletingItems.has(obj.key) ? "Deleting..." : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:flex items-center gap-3 flex-1 min-w-0">
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

                <div className="hidden sm:flex items-center gap-8 text-sm text-muted-foreground">
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
                          <DropdownMenuItem
                            onClick={() => handleDownload(obj.key)}
                            disabled={downloadingFiles.has(obj.key)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {downloadingFiles.has(obj.key) ? "Downloading..." : "Download"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShare(obj.key, obj.name)}>
                            <Share className="w-4 h-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(obj.key, obj.type)}
                        className="text-destructive"
                        disabled={deletingItems.has(obj.key)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deletingItems.has(obj.key) ? "Deleting..." : "Delete"}
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
