export interface FileItem {
    name: string
    path: string
    isDirectory: boolean
    size: number         // bytes, 0 for directories
    permissions: string  // e.g. "drwxr-xr-x"
    owner?: string
    group?: string
    modifiedTime: Date
}

export interface UploadTask {
    id: string
    localPath: string
    remotePath: string
    fileName: string
    totalBytes: number
    transferredBytes: number
    status: 'pending' | 'uploading' | 'done' | 'error'
    error?: string
}

export interface SyncWatcher {
    localPath: string
    remotePath: string
    status: 'watching' | 'syncing' | 'error'
    lastSync?: Date
}
