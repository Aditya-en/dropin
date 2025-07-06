"use client"

export class PWAUtils {
  static registerServiceWorker() {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("SW registered: ", registration)
          })
          .catch((registrationError) => {
            console.log("SW registration failed: ", registrationError)
          })
      })
    }
  }

  static isStandalone(): boolean {
    if (typeof window === "undefined") return false

    return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
  }

  static isInstallable(): boolean {
    if (typeof window === "undefined") return false

    // Check if beforeinstallprompt event is supported
    return "BeforeInstallPromptEvent" in window || /iPad|iPhone|iPod/.test(navigator.userAgent)
  }
}
