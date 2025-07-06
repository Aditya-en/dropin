"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Save, TestTube } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getStoredCredentials, storeCredentials, clearCredentials } from "@/lib/storage"
import { s3Operations } from "@/lib/s3-client"

export function SettingsForm() {
  const [credentials, setCredentials] = useState({
    accessKeyId: "",
    secretAccessKey: "",
    region: "",
    bucketName: "",
  })
  const [showSecrets, setShowSecrets] = useState(false)
  const [testing, setTesting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const stored = getStoredCredentials()
    if (stored) {
      setCredentials(stored)
    }
  }, [])

  const handleSave = () => {
    if (!credentials.accessKeyId || !credentials.secretAccessKey || !credentials.region || !credentials.bucketName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    storeCredentials(credentials)
    toast({
      title: "Success",
      description: "AWS credentials saved successfully.",
    })
  }

  const handleTest = async () => {
    if (!credentials.accessKeyId || !credentials.secretAccessKey || !credentials.region || !credentials.bucketName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before testing.",
        variant: "destructive",
      })
      return
    }

    setTesting(true)
    try {
      // Temporarily store credentials for testing
      storeCredentials(credentials)
      await s3Operations.testConnection()

      toast({
        title: "Success",
        description: "Connection to AWS S3 successful!",
      })
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to AWS S3. Please check your credentials.",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const handleClear = () => {
    clearCredentials()
    setCredentials({
      accessKeyId: "",
      secretAccessKey: "",
      region: "",
      bucketName: "",
    })
    toast({
      title: "Success",
      description: "Credentials cleared successfully.",
    })
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>AWS S3 Configuration</CardTitle>
          <CardDescription>
            Configure your AWS credentials to connect to your S3 bucket. These credentials are stored locally in your
            browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accessKeyId">Access Key ID *</Label>
              <Input
                id="accessKeyId"
                type={showSecrets ? "text" : "password"}
                value={credentials.accessKeyId}
                onChange={(e) => setCredentials((prev) => ({ ...prev, accessKeyId: e.target.value }))}
                placeholder="AKIA..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretAccessKey">Secret Access Key *</Label>
              <div className="relative">
                <Input
                  id="secretAccessKey"
                  type={showSecrets ? "text" : "password"}
                  value={credentials.secretAccessKey}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, secretAccessKey: e.target.value }))}
                  placeholder="Enter secret access key"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="region">AWS Region *</Label>
              <Input
                id="region"
                value={credentials.region}
                onChange={(e) => setCredentials((prev) => ({ ...prev, region: e.target.value }))}
                placeholder="us-east-1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bucketName">S3 Bucket Name *</Label>
              <Input
                id="bucketName"
                value={credentials.bucketName}
                onChange={(e) => setCredentials((prev) => ({ ...prev, bucketName: e.target.value }))}
                placeholder="my-storage-bucket"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>

            <Button variant="outline" onClick={handleTest} disabled={testing}>
              <TestTube className="w-4 h-4 mr-2" />
              {testing ? "Testing..." : "Test Connection"}
            </Button>

            <Button variant="destructive" onClick={handleClear}>
              Clear All
            </Button>
          </div>

          <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
            <p className="font-medium mb-2">Security Note:</p>
            <p>
              Your AWS credentials are stored locally in your browser's localStorage and are never sent to any external
              servers. Make sure you're using this application on a trusted device.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
