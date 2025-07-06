"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, X, Smartphone } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if already installed (standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // Check if user has already dismissed the prompt
    const hasBeenDismissed = localStorage.getItem("pwa-install-dismissed")

    if (!standalone && !hasBeenDismissed) {
      if (iOS) {
        // Show iOS install instructions after a delay
        const timer = setTimeout(() => {
          setShowPrompt(true)
        }, 3000)
        return () => clearTimeout(timer)
      } else {
        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
          e.preventDefault()
          setDeferredPrompt(e as BeforeInstallPromptEvent)
          setShowPrompt(true)
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

        return () => {
          window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
        }
      }
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        setDeferredPrompt(null)
        setShowPrompt(false)
      }
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("pwa-install-dismissed", "true")

    // Auto-show again after 7 days
    setTimeout(
      () => {
        localStorage.removeItem("pwa-install-dismissed")
      },
      7 * 24 * 60 * 60 * 1000,
    )
  }

  if (!showPrompt || isStandalone) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Install DropIN</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="w-6 h-6 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            {isIOS
              ? "Add DropIN to your home screen for quick access"
              : "Install DropIN for a better experience with offline access"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isIOS ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tap the share button{" "}
                <span className="inline-block w-4 h-4 bg-blue-500 rounded text-white text-xs text-center leading-4">
                  ↗
                </span>{" "}
                in Safari, then select "Add to Home Screen"
              </p>
              <Button onClick={handleDismiss} className="w-full" size="sm">
                Got it
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleInstall} className="flex-1" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Install
              </Button>
              <Button variant="outline" onClick={handleDismiss} size="sm">
                Later
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
