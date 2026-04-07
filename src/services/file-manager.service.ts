import { Injectable, NgZone, OnDestroy } from '@angular/core'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { FileItem, UploadTask, SyncWatcher } from '../models/file-item.model'
import { Subject } from 'rxjs'

export interface SftpSession {
    readdir (remotePath: string): Promise<FileItem[]>
    mkdir (remotePath: string): Promise<void>
    rmdir (remotePath: string): Promise<void>
    unlink (remotePath: string): Promise<void>
    rename (oldPath: string, newPath: string): Promise<void>
    get (remotePath: string, localPath: string, progressCallback?: (transferred: number, total: number) => void): Promise<void>
    put (localPath: string, remotePath: string, progressCallback?: (transferred: number, total: number) => void): Promise<void>
    writeFile (remotePath: string, content: string): Promise<void>
    stat (remotePath: string): Promise<{ size: number; mtime: Date; isDirectory: boolean }>
}

@Injectable({ providedIn: 'root' })
export class FileManagerService implements OnDestroy {
    private sftpSession: SftpSession | null = null
    private syncWatchers: Map<string, SyncWatcher & { fsWatcher: fs.FSWatcher }> = new Map()

    uploadProgress$ = new Subject<UploadTask>()
    syncStatus$ = new Subject<SyncWatcher>()

    constructor (private ngZone: NgZone) {}

    setSftpSession (session: SftpSession): void {
        this.sftpSession = session
    }

    clearSftpSession (): void {
        this.sftpSession = null
    }

    async listDirectory (remotePath: string): Promise<FileItem[]> {
        if (!this.sftpSession) {
            throw new Error('SFTP session not available')
        }
        return this.sftpSession.readdir(remotePath)
    }

    async createDirectory (remotePath: string): Promise<void> {
        if (!this.sftpSession) {
            throw new Error('SFTP session not available')
        }
        await this.sftpSession.mkdir(remotePath)
    }

    async createFile (remotePath: string): Promise<void> {
        if (!this.sftpSession) {
            throw new Error('SFTP session not available')
        }
        await this.sftpSession.writeFile(remotePath, '')
    }

    async deleteItem (item: FileItem): Promise<void> {
        if (!this.sftpSession) {
            throw new Error('SFTP session not available')
        }
        if (item.isDirectory) {
            await this.sftpSession.rmdir(item.path)
        } else {
            await this.sftpSession.unlink(item.path)
        }
    }

    async renameItem (oldPath: string, newPath: string): Promise<void> {
        if (!this.sftpSession) {
            throw new Error('SFTP session not available')
        }
        await this.sftpSession.rename(oldPath, newPath)
    }

    async downloadFile (item: FileItem, localDestDir: string): Promise<string> {
        if (!this.sftpSession) {
            throw new Error('SFTP session not available')
        }
        const localPath = path.join(localDestDir, item.name)
        const task: UploadTask = {
            id: `dl-${Date.now()}`,
            localPath,
            remotePath: item.path,
            fileName: item.name,
            totalBytes: item.size,
            transferredBytes: 0,
            status: 'uploading',
        }
        this.uploadProgress$.next(task)

        await this.sftpSession.get(item.path, localPath, (transferred, total) => {
            task.transferredBytes = transferred
            task.totalBytes = total
            this.ngZone.run(() => this.uploadProgress$.next({ ...task }))
        })

        task.status = 'done'
        this.ngZone.run(() => this.uploadProgress$.next({ ...task }))
        return localPath
    }

    async uploadFile (localPath: string, remoteDir: string): Promise<void> {
        if (!this.sftpSession) {
            throw new Error('SFTP session not available')
        }
        const fileName = path.basename(localPath)
        const remotePath = `${remoteDir}/${fileName}`
        const stats = fs.statSync(localPath)

        const task: UploadTask = {
            id: `ul-${Date.now()}`,
            localPath,
            remotePath,
            fileName,
            totalBytes: stats.size,
            transferredBytes: 0,
            status: 'uploading',
        }
        this.uploadProgress$.next(task)

        await this.sftpSession.put(localPath, remotePath, (transferred, total) => {
            task.transferredBytes = transferred
            task.totalBytes = total
            this.ngZone.run(() => this.uploadProgress$.next({ ...task }))
        })

        task.status = 'done'
        this.ngZone.run(() => this.uploadProgress$.next({ ...task }))
    }

    /**
     * Download file for editing locally; watch for changes and auto-upload.
     */
    async openForEdit (item: FileItem, remoteDir: string): Promise<void> {
        if (!this.sftpSession) {
            throw new Error('SFTP session not available')
        }
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tabby-sftp-'))
        // Use path.basename to prevent any path-traversal characters in item.name
        // from escaping the isolated temporary directory.
        const safeName = path.basename(item.name)
        const localPath = path.join(tmpDir, safeName)

        await this.sftpSession.get(item.path, localPath)

        // Open with default editor / OS default action.
        // Use execFile (not exec) to avoid shell interpretation of path characters.
        const { execFile } = await import('child_process')
        if (process.platform === 'win32') {
            // On Windows, 'start' is a shell built-in; we use cmd /c start
            execFile('cmd', ['/c', 'start', '', localPath])
        } else {
            const openCmd = process.platform === 'darwin' ? 'open' : 'xdg-open'
            execFile(openCmd, [localPath])
        }

        this.watchForSync(localPath, item.path)
    }

    private watchForSync (localPath: string, remotePath: string): void {
        if (this.syncWatchers.has(localPath)) {
            return
        }

        let debounceTimer: ReturnType<typeof setTimeout> | null = null
        const watcherInfo: SyncWatcher & { fsWatcher: fs.FSWatcher } = {
            localPath,
            remotePath,
            status: 'watching',
            fsWatcher: null as unknown as fs.FSWatcher,
        }

        const fsWatcher = fs.watch(localPath, async () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer)
            }
            debounceTimer = setTimeout(async () => {
                try {
                    watcherInfo.status = 'syncing'
                    this.ngZone.run(() => this.syncStatus$.next({ ...watcherInfo }))

                    if (this.sftpSession) {
                        await this.sftpSession.put(localPath, remotePath)
                    }

                    watcherInfo.status = 'watching'
                    watcherInfo.lastSync = new Date()
                    this.ngZone.run(() => this.syncStatus$.next({ ...watcherInfo }))
                } catch (err) {
                    watcherInfo.status = 'error'
                    this.ngZone.run(() => this.syncStatus$.next({ ...watcherInfo }))
                    console.error('[FileManagerService] Auto-sync failed:', err)
                }
            }, 1000)
        })

        watcherInfo.fsWatcher = fsWatcher
        this.syncWatchers.set(localPath, watcherInfo)
    }

    stopWatching (localPath: string): void {
        const watcher = this.syncWatchers.get(localPath)
        if (watcher) {
            watcher.fsWatcher.close()
            this.syncWatchers.delete(localPath)
        }
    }

    ngOnDestroy (): void {
        for (const watcher of this.syncWatchers.values()) {
            watcher.fsWatcher.close()
        }
        this.syncWatchers.clear()
    }

    formatFileSize (bytes: number): string {
        if (bytes === 0) {
            return '-'
        }
        const units = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
    }
}
