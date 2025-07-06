import { s3Operations } from "./s3-client"

export interface FileOperationResult {
  success: boolean
  key: string
  error?: string
}

export class FileOperations {
  static async downloadFile(url: string, filename: string): Promise<boolean> {
    try {
      // Fetch the file as a blob
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()

      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob)

      // Create a temporary anchor element and trigger download
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = filename
      link.style.display = "none"

      // Add to DOM, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl)

      return true
    } catch (error) {
      console.error("Download failed:", error)
      return false
    }
  }

  static async downloadSingleFile(key: string): Promise<FileOperationResult> {
    const filename = key.split("/").pop() || key

    try {
      const url = await s3Operations.getDownloadUrl(key)
      const success = await this.downloadFile(url, filename)

      return {
        success,
        key,
        error: success ? undefined : "Download failed",
      }
    } catch (error) {
      console.error("Download error:", error)
      return {
        success: false,
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async downloadMultipleFiles(keys: string[]): Promise<{
    results: FileOperationResult[]
    successCount: number
    failCount: number
  }> {
    const results: FileOperationResult[] = []
    let successCount = 0
    let failCount = 0

    // Download files sequentially with a small delay to avoid overwhelming the browser
    for (const key of keys) {
      try {
        const result = await this.downloadSingleFile(key)
        results.push(result)

        if (result.success) {
          successCount++
        } else {
          failCount++
        }

        // Small delay between downloads
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        failCount++
        results.push({
          success: false,
          key,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return { results, successCount, failCount }
  }

  static async deleteSingleItem(key: string, isFolder = false): Promise<FileOperationResult> {
    try {
      if (isFolder) {
        // For folders, we need to delete all contents first
        await this.deleteFolderRecursively(key)
      } else {
        // For files, direct deletion
        await s3Operations.deleteObject(key)
      }

      return {
        success: true,
        key,
      }
    } catch (error) {
      console.error("Delete error:", error)
      return {
        success: false,
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async deleteFolderRecursively(folderKey: string): Promise<void> {
    // Ensure folder key ends with /
    const normalizedKey = folderKey.endsWith("/") ? folderKey : `${folderKey}/`

    // List all objects in the folder
    const objects = await s3Operations.listAllObjectsInFolder(normalizedKey)

    // Delete all objects in the folder
    for (const obj of objects) {
      await s3Operations.deleteObject(obj.key)
    }

    // Delete the folder marker itself if it exists
    try {
      await s3Operations.deleteObject(normalizedKey)
    } catch (error) {
      // Folder marker might not exist, which is fine
      console.log("Folder marker deletion skipped:", error)
    }
  }

  static async deleteMultipleItems(items: Array<{ key: string; type: "file" | "folder" }>): Promise<{
    results: FileOperationResult[]
    successCount: number
    failCount: number
  }> {
    const results: FileOperationResult[] = []
    let successCount = 0
    let failCount = 0

    // Delete items sequentially
    for (const item of items) {
      try {
        const result = await this.deleteSingleItem(item.key, item.type === "folder")
        results.push(result)

        if (result.success) {
          successCount++
        } else {
          failCount++
        }

        // Small delay between deletions
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (error) {
        failCount++
        results.push({
          success: false,
          key: item.key,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return { results, successCount, failCount }
  }
}
