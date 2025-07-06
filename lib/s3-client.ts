"use client"

import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"
import { getStoredCredentials } from "./storage"

interface S3Object {
  key: string
  name: string
  type: "file" | "folder"
  size?: number
  lastModified?: Date
}

interface CreateUploadLinkOptions {
  path: string
  expiresIn: number
  fileType?: string
  maxFileSize: number
  description?: string
}

class S3Operations {
  private getClient() {
    const credentials = getStoredCredentials();
    if (!credentials) throw new Error("…");

    return new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      requestChecksumCalculation: "WHEN_REQUIRED"
    });
  }

  private getBucketName() {
    const credentials = getStoredCredentials()
    if (!credentials) {
      throw new Error("AWS credentials not configured")
    }
    return credentials.bucketName
  }

  async testConnection(): Promise<void> {
    const client = this.getClient()
    const bucketName = this.getBucketName()

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1,
    })

    await client.send(command)
  }

  async listObjects(prefix = ""): Promise<S3Object[]> {
    const client = this.getClient()
    const bucketName = this.getBucketName()

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix ? `${prefix}/` : "",
      Delimiter: "/",
    })

    const response = await client.send(command)
    const objects: S3Object[] = []

    // Add folders (common prefixes)
    if (response.CommonPrefixes) {
      for (const commonPrefix of response.CommonPrefixes) {
        if (commonPrefix.Prefix) {
          const folderName = commonPrefix.Prefix.replace(prefix ? `${prefix}/` : "", "").replace("/", "")
          if (folderName) {
            objects.push({
              key: commonPrefix.Prefix,
              name: folderName,
              type: "folder",
            })
          }
        }
      }
    }

    // Add files
    if (response.Contents) {
      for (const content of response.Contents) {
        if (content.Key && content.Key !== `${prefix}/`) {
          const fileName = content.Key.replace(prefix ? `${prefix}/` : "", "")
          if (fileName && !fileName.includes("/")) {
            objects.push({
              key: content.Key,
              name: fileName,
              type: "file",
              size: content.Size,
              lastModified: content.LastModified,
            })
          }
        }
      }
    }

    return objects.sort((a, b) => {
      // Folders first, then files
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  }

  async uploadFile(key: string, file: File): Promise<void> {
    if (!file) {
      console.error("Upload function called with invalid file object.");
      throw new Error("Invalid file object provided for upload.");
    }
    if (!key) {
        console.error("Upload function called with invalid key.");
        throw new Error("Invalid key provided for upload.");
    }

    const client = this.getClient()
    const bucketName = this.getBucketName()

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: file.type || 'application/octet-stream',
      ContentLength: file.size,
    })

    try {
        await client.send(command);
        console.log("Upload successful for key:", key);
    } catch (error) {
        console.error("Direct upload failed. AWS SDK Error:", error);
        throw error;
    }
  }

  async createFolder(key: string): Promise<void> {
    const client = this.getClient()
    const bucketName = this.getBucketName()

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: "",
    })

    await client.send(command)
  }

  async deleteObject(key: string): Promise<void> {
    const client = this.getClient()
    const bucketName = this.getBucketName()

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    await client.send(command)
  }

  async getDownloadUrl(key: string): Promise<string> {
    const client = this.getClient()
    const bucketName = this.getBucketName()

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    return await getSignedUrl(client, command, { expiresIn: 3600 })
  }

  async getShareUrl(key: string, expiresIn = 3600): Promise<string> {
    const client = this.getClient()
    const bucketName = this.getBucketName()

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    return await getSignedUrl(client, command, { expiresIn })
  }

  async createUploadLink(options: CreateUploadLinkOptions) {
    const client = this.getClient()
    const bucketName = this.getBucketName()

    // Destination key: path/filename OR just filename if root
    // The ${filename} placeholder will be replaced client-side by the actual file name
    const keyPrefix = options.path ? `${options.path}/` : ""
    const key = `${keyPrefix}\${filename}`

    const conditions: any[] = [
      ["starts-with", "$key", keyPrefix], // ensure uploads stay in the desired prefix
      ["content-length-range", 1, options.maxFileSize], // size limit
    ]

    if (options.fileType && options.fileType !== "any") {
      // Restrict MIME type (only prefix match is allowed in S3 POST policy)
      const [typeRoot] = options.fileType.split("/") // e.g. "video" from "video/*"
      conditions.push(["starts-with", "$Content-Type", typeRoot])
    }

    const presignedPost = await createPresignedPost(client, {
      Bucket: bucketName,
      Key: key,
      Conditions: conditions,
      Fields: {
        // Default Content-Type so browsers will still send the real one
        "Content-Type": options.fileType && options.fileType !== "any" ? options.fileType : "",
      },
      Expires: options.expiresIn, // seconds
    })

    return {
      url: presignedPost.url,
      fields: presignedPost.fields,
      path: options.path,
      fileType: options.fileType,
      maxFileSize: options.maxFileSize,
      description: options.description,
      expiresAt: new Date(Date.now() + options.expiresIn * 1000).toISOString(),
    }
  }
}

export const s3Operations = new S3Operations()
