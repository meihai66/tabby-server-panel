import {
    Component,
    Input,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    ChangeDetectionStrategy,
    HostListener,
    ElementRef,
    ViewChild,
} from '@angular/core'
import { Subscription } from 'rxjs'
import { FileItem, UploadTask, SyncWatcher } from '../models/file-item.model'
import { FileManagerService, SftpSession } from '../services/file-manager.service'
import { PanelConfigService } from '../services/config.service'

@Component({
    selector: 'file-manager',
    template: `
        <!-- Toolbar -->
        <div class="fm-toolbar">
            <button class="toolbar-btn" (click)="goUp()" title="上级目录" [disabled]="currentPath === '/'">↑ 上级</button>
            <button class="toolbar-btn" (click)="refresh()">🔄</button>
            <input
                class="path-input"
                [(ngModel)]="pathInputValue"
                (keydown.enter)="navigateTo(pathInputValue)"
                title="输入路径后按 Enter 跳转"
            />
            <button class="toolbar-btn" (click)="navigateTo(pathInputValue)">跳转</button>
            <button class="toolbar-btn" (click)="triggerUpload()" title="上传文件">⬆ 上传</button>
            <input #fileInput type="file" style="display:none" multiple (change)="onFileInputChange($event)" />
        </div>

        <!-- Breadcrumb -->
        <div class="breadcrumb">
            <span
                *ngFor="let crumb of breadcrumbs; let last = last"
                class="crumb"
                [class.active]="last"
                (click)="!last && navigateTo(crumb.path)"
            >{{ crumb.name }}</span>
            <span *ngIf="breadcrumbs.length > 1" class="sep">/</span>
        </div>

        <!-- File list with drag & drop -->
        <div
            class="fm-body"
            [class.drag-over]="isDragOver"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            (contextmenu)="onBodyContextMenu($event)"
        >
            <div class="loading-msg" *ngIf="loading">加载中…</div>
            <div class="error-msg" *ngIf="error">⚠ {{ error }}</div>
            <div class="empty-msg" *ngIf="!loading && !error && files.length === 0">目录为空</div>

            <table class="file-list" *ngIf="!loading && files.length > 0">
                <thead>
                    <tr>
                        <th (click)="sortBy('name')">名称 {{ sortField === 'name' ? (sortAsc ? '▲' : '▼') : '' }}</th>
                        <th (click)="sortBy('size')">大小 {{ sortField === 'size' ? (sortAsc ? '▲' : '▼') : '' }}</th>
                        <th (click)="sortBy('permissions')">权限</th>
                        <th (click)="sortBy('modifiedTime')">修改时间 {{ sortField === 'modifiedTime' ? (sortAsc ? '▲' : '▼') : '' }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        *ngFor="let file of sortedFiles"
                        [class.selected]="selectedFile?.path === file.path"
                        (click)="selectFile(file)"
                        (dblclick)="openItem(file)"
                        (contextmenu)="onRowContextMenu($event, file)"
                    >
                        <td class="col-name">
                            <span class="file-icon">{{ file.isDirectory ? '📁' : getFileIcon(file.name) }}</span>
                            <span *ngIf="renamingFile?.path !== file.path">{{ file.name }}</span>
                            <input
                                *ngIf="renamingFile?.path === file.path"
                                class="rename-input"
                                [(ngModel)]="renameValue"
                                (blur)="finishRename()"
                                (keydown.enter)="finishRename()"
                                (keydown.escape)="cancelRename()"
                                (click)="$event.stopPropagation()"
                                autofocus
                            />
                            <span
                                *ngFor="let w of getSyncWatchers(file.path)"
                                class="sync-badge"
                                [class]="'sync-badge ' + w.status"
                            >{{ w.status === 'watching' ? '✓ 监控中' : w.status === 'syncing' ? '↑ 同步中' : '✕ 错误' }}</span>
                        </td>
                        <td class="col-size">{{ file.isDirectory ? '-' : svc.formatFileSize(file.size) }}</td>
                        <td class="col-perms">{{ file.permissions }}</td>
                        <td class="col-mtime">{{ file.modifiedTime | date:'MM-dd HH:mm' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Upload progress -->
        <div class="upload-progress" *ngIf="activeTasks.length > 0">
            <div class="progress-item" *ngFor="let task of activeTasks" [class]="task.status">
                <span class="progress-name">{{ task.status === 'uploading' ? '⬆' : task.status === 'done' ? '✓' : '✕' }} {{ task.fileName }}</span>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" [style.width.%]="getProgress(task)"></div>
                </div>
                <span class="progress-pct">{{ getProgress(task) }}%</span>
            </div>
        </div>

        <!-- Context Menu -->
        <div
            class="context-menu"
            *ngIf="contextMenuVisible"
            [style.left.px]="contextMenuX"
            [style.top.px]="contextMenuY"
        >
            <div class="ctx-item" (click)="ctxNewFolder()">📁 新建文件夹</div>
            <div class="ctx-item" (click)="ctxNewFile()">📄 新建文件</div>
            <ng-container *ngIf="contextMenuFile">
                <div class="ctx-sep"></div>
                <div class="ctx-item" (click)="ctxRename()">✎ 重命名</div>
                <div class="ctx-item" (click)="ctxDownload()">⬇ 下载</div>
                <div class="ctx-item" *ngIf="!contextMenuFile.isDirectory" (click)="ctxOpenEdit()">🖊 编辑（本地）</div>
                <div class="ctx-item" (click)="ctxCopyPath()">📋 复制路径</div>
                <div class="ctx-sep"></div>
                <div class="ctx-item ctx-danger" (click)="ctxDelete()">🗑 删除</div>
            </ng-container>
        </div>
    `,
    styleUrls: ['./file-manager.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileManagerComponent implements OnInit, OnDestroy {
    @Input() sftpSession: SftpSession | null = null
    @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>

    currentPath = '/'
    pathInputValue = '/'
    files: FileItem[] = []
    loading = false
    error: string | null = null
    isDragOver = false
    selectedFile: FileItem | null = null

    sortField: keyof FileItem = 'name'
    sortAsc = true

    breadcrumbs: Array<{ name: string; path: string }> = []

    contextMenuVisible = false
    contextMenuX = 0
    contextMenuY = 0
    contextMenuFile: FileItem | null = null

    renamingFile: FileItem | null = null
    renameValue = ''

    activeTasks: UploadTask[] = []
    syncWatcherMap: Map<string, SyncWatcher> = new Map()

    private subs: Subscription[] = []

    get sortedFiles (): FileItem[] {
        const dirs = this.files.filter(f => f.isDirectory)
        const regular = this.files.filter(f => !f.isDirectory)
        const sortFn = (a: FileItem, b: FileItem): number => {
            const av = a[this.sortField]
            const bv = b[this.sortField]
            if (av instanceof Date && bv instanceof Date) {
                return this.sortAsc ? av.getTime() - bv.getTime() : bv.getTime() - av.getTime()
            }
            if (typeof av === 'number' && typeof bv === 'number') {
                return this.sortAsc ? av - bv : bv - av
            }
            const as = String(av).toLowerCase()
            const bs = String(bv).toLowerCase()
            return this.sortAsc ? as.localeCompare(bs) : bs.localeCompare(as)
        }
        return [...dirs.sort(sortFn), ...regular.sort(sortFn)]
    }

    constructor (
        public svc: FileManagerService,
        private configSvc: PanelConfigService,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit (): void {
        if (this.sftpSession) {
            this.svc.setSftpSession(this.sftpSession)
            this.navigateTo('/')
        }

        this.subs.push(
            this.svc.uploadProgress$.subscribe(task => {
                const idx = this.activeTasks.findIndex(t => t.id === task.id)
                if (idx >= 0) {
                    this.activeTasks[idx] = task
                } else {
                    this.activeTasks.push(task)
                }
                // Clean completed tasks after 3s
                if (task.status === 'done' || task.status === 'error') {
                    setTimeout(() => {
                        this.activeTasks = this.activeTasks.filter(t => t.id !== task.id)
                        this.cdr.markForCheck()
                    }, 3000)
                }
                this.cdr.markForCheck()
            }),
            this.svc.syncStatus$.subscribe(watcher => {
                this.syncWatcherMap.set(watcher.localPath, watcher)
                this.cdr.markForCheck()
            }),
        )
    }

    ngOnDestroy (): void {
        this.subs.forEach(s => s.unsubscribe())
        this.svc.clearSftpSession()
    }

    async navigateTo (path: string): Promise<void> {
        this.loading = true
        this.error = null
        this.contextMenuVisible = false
        this.cdr.markForCheck()
        try {
            this.files = await this.svc.listDirectory(path)
            this.currentPath = path
            this.pathInputValue = path
            this.updateBreadcrumbs(path)
        } catch (err) {
            this.error = String(err)
        } finally {
            this.loading = false
            this.cdr.markForCheck()
        }
    }

    refresh (): void {
        this.navigateTo(this.currentPath)
    }

    goUp (): void {
        if (this.currentPath === '/') {
            return
        }
        const parent = this.currentPath.substring(0, this.currentPath.lastIndexOf('/')) || '/'
        this.navigateTo(parent)
    }

    private updateBreadcrumbs (path: string): void {
        const parts = path.split('/').filter(Boolean)
        this.breadcrumbs = [{ name: '/', path: '/' }]
        let built = ''
        for (const part of parts) {
            built += '/' + part
            this.breadcrumbs.push({ name: part, path: built })
        }
    }

    selectFile (file: FileItem): void {
        this.selectedFile = file
        this.contextMenuVisible = false
    }

    openItem (file: FileItem): void {
        if (file.isDirectory) {
            this.navigateTo(file.path)
        }
    }

    sortBy (field: keyof FileItem): void {
        if (this.sortField === field) {
            this.sortAsc = !this.sortAsc
        } else {
            this.sortField = field
            this.sortAsc = true
        }
    }

    getFileIcon (name: string): string {
        const ext = name.split('.').pop()?.toLowerCase() ?? ''
        const iconMap: Record<string, string> = {
            js: '📜', ts: '📜', py: '🐍', sh: '⚙',
            json: '📋', yaml: '📋', yml: '📋',
            txt: '📄', md: '📄', log: '📄',
            zip: '📦', tar: '📦', gz: '📦',
            png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', svg: '🖼',
            mp4: '🎬', mp3: '🎵',
            pdf: '📕',
        }
        return iconMap[ext] ?? '📄'
    }

    getSyncWatchers (remotePath: string): SyncWatcher[] {
        const result: SyncWatcher[] = []
        for (const w of this.syncWatcherMap.values()) {
            if (w.remotePath === remotePath) {
                result.push(w)
            }
        }
        return result
    }

    getProgress (task: UploadTask): number {
        if (task.totalBytes === 0) {
            return task.status === 'done' ? 100 : 0
        }
        return Math.round((task.transferredBytes / task.totalBytes) * 100)
    }

    // ---- Drag & Drop ----

    onDragOver (event: DragEvent): void {
        event.preventDefault()
        event.stopPropagation()
        this.isDragOver = true
        this.cdr.markForCheck()
    }

    onDragLeave (event: DragEvent): void {
        event.preventDefault()
        this.isDragOver = false
        this.cdr.markForCheck()
    }

    async onDrop (event: DragEvent): Promise<void> {
        event.preventDefault()
        event.stopPropagation()
        this.isDragOver = false
        this.cdr.markForCheck()

        const uploadPath = this.configSvc.get().defaultUploadPath || this.currentPath
        const files = event.dataTransfer?.files
        if (!files) {
            return
        }
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            // In Electron/Node context we can access .path
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const localPath: string = (file as any).path
            if (localPath) {
                try {
                    await this.svc.uploadFile(localPath, uploadPath)
                    this.refresh()
                } catch (err) {
                    this.error = `上传失败: ${String(err)}`
                    this.cdr.markForCheck()
                }
            }
        }
    }

    triggerUpload (): void {
        this.fileInputRef.nativeElement.click()
    }

    async onFileInputChange (event: Event): Promise<void> {
        const input = event.target as HTMLInputElement
        if (!input.files) {
            return
        }
        const uploadPath = this.configSvc.get().defaultUploadPath || this.currentPath
        for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const localPath: string = (file as any).path
            if (localPath) {
                try {
                    await this.svc.uploadFile(localPath, uploadPath)
                    this.refresh()
                } catch (err) {
                    this.error = `上传失败: ${String(err)}`
                    this.cdr.markForCheck()
                }
            }
        }
        input.value = ''
    }

    // ---- Context Menu ----

    onBodyContextMenu (event: MouseEvent): void {
        event.preventDefault()
        this.contextMenuFile = null
        this.contextMenuX = event.clientX
        this.contextMenuY = event.clientY
        this.contextMenuVisible = true
        this.cdr.markForCheck()
    }

    onRowContextMenu (event: MouseEvent, file: FileItem): void {
        event.preventDefault()
        event.stopPropagation()
        this.selectedFile = file
        this.contextMenuFile = file
        this.contextMenuX = event.clientX
        this.contextMenuY = event.clientY
        this.contextMenuVisible = true
        this.cdr.markForCheck()
    }

    @HostListener('document:click')
    closeContextMenu (): void {
        if (this.contextMenuVisible) {
            this.contextMenuVisible = false
            this.cdr.markForCheck()
        }
    }

    async ctxNewFolder (): Promise<void> {
        this.contextMenuVisible = false
        const name = prompt('新文件夹名称')
        if (!name?.trim()) {
            return
        }
        try {
            await this.svc.createDirectory(`${this.currentPath}/${name.trim()}`)
            this.refresh()
        } catch (err) {
            this.error = `创建失败: ${String(err)}`
            this.cdr.markForCheck()
        }
    }

    async ctxNewFile (): Promise<void> {
        this.contextMenuVisible = false
        const name = prompt('新文件名称')
        if (!name?.trim()) {
            return
        }
        try {
            await this.svc.createFile(`${this.currentPath}/${name.trim()}`)
            this.refresh()
        } catch (err) {
            this.error = `创建失败: ${String(err)}`
            this.cdr.markForCheck()
        }
    }

    ctxRename (): void {
        this.contextMenuVisible = false
        if (!this.contextMenuFile) {
            return
        }
        this.renamingFile = this.contextMenuFile
        this.renameValue = this.contextMenuFile.name
        this.cdr.markForCheck()
    }

    async finishRename (): Promise<void> {
        if (!this.renamingFile || !this.renameValue.trim()) {
            this.cancelRename()
            return
        }
        const newPath = this.currentPath.replace(/\/$/, '') + '/' + this.renameValue.trim()
        try {
            await this.svc.renameItem(this.renamingFile.path, newPath)
            this.renamingFile = null
            this.refresh()
        } catch (err) {
            this.error = `重命名失败: ${String(err)}`
            this.renamingFile = null
            this.cdr.markForCheck()
        }
    }

    cancelRename (): void {
        this.renamingFile = null
        this.cdr.markForCheck()
    }

    async ctxDownload (): Promise<void> {
        this.contextMenuVisible = false
        if (!this.contextMenuFile) {
            return
        }
        const electronRemote = await import('@electron/remote')
        const result = await electronRemote.dialog.showOpenDialog({ properties: ['openDirectory'] })
        if (result.canceled || result.filePaths.length === 0) {
            return
        }
        try {
            await this.svc.downloadFile(this.contextMenuFile, result.filePaths[0])
        } catch (err) {
            this.error = `下载失败: ${String(err)}`
            this.cdr.markForCheck()
        }
    }

    async ctxOpenEdit (): Promise<void> {
        this.contextMenuVisible = false
        if (!this.contextMenuFile) {
            return
        }
        try {
            await this.svc.openForEdit(this.contextMenuFile, this.currentPath)
        } catch (err) {
            this.error = `打开失败: ${String(err)}`
            this.cdr.markForCheck()
        }
    }

    ctxCopyPath (): void {
        this.contextMenuVisible = false
        if (this.contextMenuFile) {
            navigator.clipboard.writeText(this.contextMenuFile.path).catch(() => {
                // Clipboard may not be available in all contexts
            })
        }
    }

    async ctxDelete (): Promise<void> {
        this.contextMenuVisible = false
        if (!this.contextMenuFile) {
            return
        }
        const confirmed = confirm(`确定要删除 "${this.contextMenuFile.name}" 吗？`)
        if (!confirmed) {
            return
        }
        try {
            await this.svc.deleteItem(this.contextMenuFile)
            this.selectedFile = null
            this.refresh()
        } catch (err) {
            this.error = `删除失败: ${String(err)}`
            this.cdr.markForCheck()
        }
    }
}
