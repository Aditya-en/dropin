"use client"

import { Button } from "@/components/ui/button"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbNavProps {
  segments: string[]
  onNavigate: (path: string) => void
  className?: string
}

export function BreadcrumbNav({ segments, onNavigate, className }: BreadcrumbNavProps) {
  const handleNavigate = (index: number) => {
    if (index === -1) {
      onNavigate("")
    } else {
      const path = segments.slice(0, index + 1).join("/")
      onNavigate(path)
    }
  }

  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)}>
      <Button variant="ghost" size="sm" onClick={() => handleNavigate(-1)} className="h-8 px-2">
        <Home className="w-4 h-4" />
      </Button>

      {segments.map((segment, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
          <Button variant="ghost" size="sm" onClick={() => handleNavigate(index)} className="h-8 px-2 font-medium">
            {segment}
          </Button>
        </div>
      ))}
    </nav>
  )
}
