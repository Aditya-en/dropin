import { toast } from "@/hooks/use-toast"

export class ToastUtils {
  static showDownloadSuccess(filename: string) {
    toast({
      title: "Success",
      description: `${filename} downloaded successfully.`,
    })
  }

  static showDownloadError(filename: string) {
    toast({
      title: "Error",
      description: `Failed to download ${filename}.`,
      variant: "destructive",
    })
  }

  static showBulkDownloadStart(count: number) {
    toast({
      title: "Download Started",
      description: `Starting download of ${count} files...`,
    })
  }

  static showBulkDownloadComplete(successCount: number, failCount: number) {
    if (failCount === 0) {
      toast({
        title: "Download Complete",
        description: `Successfully downloaded ${successCount} files.`,
      })
    } else {
      toast({
        title: "Download Completed with Errors",
        description: `Downloaded ${successCount} files successfully, ${failCount} failed.`,
        variant: "destructive",
      })
    }
  }

  static showDeleteSuccess(itemName: string) {
    toast({
      title: "Success",
      description: `${itemName} deleted successfully.`,
    })
  }

  static showDeleteError(itemName: string) {
    toast({
      title: "Error",
      description: `Failed to delete ${itemName}.`,
      variant: "destructive",
    })
  }

  static showBulkDeleteStart(count: number) {
    toast({
      title: "Delete Started",
      description: `Starting deletion of ${count} items...`,
    })
  }

  static showBulkDeleteComplete(successCount: number, failCount: number) {
    if (failCount === 0) {
      toast({
        title: "Delete Complete",
        description: `Successfully deleted ${successCount} items.`,
      })
    } else {
      toast({
        title: "Delete Completed with Errors",
        description: `Deleted ${successCount} items successfully, ${failCount} failed.`,
        variant: "destructive",
      })
    }
  }

  static showConfigurationRequired() {
    toast({
      title: "Configuration Required",
      description: "Please configure your AWS credentials in settings first.",
      variant: "destructive",
    })
  }

  static showLoadError() {
    toast({
      title: "Error",
      description: "Failed to load files and folders.",
      variant: "destructive",
    })
  }
}
