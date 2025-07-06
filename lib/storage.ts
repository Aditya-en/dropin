"use client"

interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucketName: string
}

const STORAGE_KEY = "aws-s3-credentials"

export function storeCredentials(credentials: AWSCredentials): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials))
  }
}

export function getStoredCredentials(): AWSCredentials | null {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.error("Failed to parse stored credentials:", error)
        return null
      }
    }
  }
  return null
}

export function clearCredentials(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY)
  }
}
