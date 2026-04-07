import {
    Component,
    Input,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    ChangeDetectionStrategy,
    HostListener,
    ElementRef,
} from '@angular/core'
import { SshLikeSession } from '../services/server-stats.service'
import { SftpSession } from '../services/file-manager.service'
import { TerminalLike } from './quick-commands.component'
import { PanelConfigService } from '../services/config.service'

export type PanelTab = 'stats' | 'commands' | 'files'

@Component({
    selector: 'server-panel',
    template: `
        <div class="panel-resize-handle" (mousedown)="onResizeStart($event)"></div>

        <div class="panel-header">
            <button class="tab-btn" [class.active]="activeTab === 'stats'" (click)="activeTab = 'stats'">
                📊 状态
            </button>
            <button class="tab-btn" [class.active]="activeTab === 'commands'" (click)="activeTab = 'commands'">
                ⚡ 命令
            </button>
            <button class="tab-btn" [class.active]="activeTab === 'files'" (click)="activeTab = 'files'">
                📁 文件
            </button>
            <div class="spacer"></div>
            <button class="panel-action-btn" (click)="toggleMinimize()" [title]="minimized ? '展开' : '最小化'">
                {{ minimized ? '▲' : '▼' }}
            </button>
            <button class="panel-action-btn" (click)="toggleMaximize()" [title]="maximized ? '还原' : '最大化'">
                {{ maximized ? '❐' : '□' }}
            </button>
        </div>

        <div class="panel-body" *ngIf="!minimized" [style.height.px]="panelBodyHeight">
            <server-stats
                *ngIf="activeTab === 'stats'"
                [session]="session"
            ></server-stats>

            <quick-commands
                *ngIf="activeTab === 'commands'"
                [terminal]="terminal"
            ></quick-commands>

            <file-manager
                *ngIf="activeTab === 'files'"
                [sftpSession]="sftpSession"
            ></file-manager>
        </div>
    `,
    styleUrls: ['./server-panel.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerPanelComponent implements OnInit, OnDestroy {
    @Input() session: SshLikeSession | null = null
    @Input() sftpSession: SftpSession | null = null
    @Input() terminal: TerminalLike | null = null

    activeTab: PanelTab = 'stats'
    minimized = false
    maximized = false

    panelHeight = 250
    panelBodyHeight = 250

    private resizing = false
    private resizeStartY = 0
    private resizeStartHeight = 0

    constructor (
        private configSvc: PanelConfigService,
        private cdr: ChangeDetectorRef,
        private el: ElementRef,
    ) {}

    ngOnInit (): void {
        this.panelHeight = this.configSvc.get().panelHeight ?? 250
        this.panelBodyHeight = this.panelHeight
    }

    ngOnDestroy (): void {
        // cleanup
    }

    toggleMinimize (): void {
        this.minimized = !this.minimized
        this.cdr.markForCheck()
    }

    toggleMaximize (): void {
        this.maximized = !this.maximized
        if (this.maximized) {
            const hostHeight = (this.el.nativeElement as HTMLElement).parentElement?.clientHeight ?? 600
            this.panelBodyHeight = hostHeight - 64 // subtract header + resize handle
        } else {
            this.panelBodyHeight = this.panelHeight
        }
        this.cdr.markForCheck()
    }

    onResizeStart (event: MouseEvent): void {
        this.resizing = true
        this.resizeStartY = event.clientY
        this.resizeStartHeight = this.panelBodyHeight
        event.preventDefault()
    }

    @HostListener('document:mousemove', ['$event'])
    onMouseMove (event: MouseEvent): void {
        if (!this.resizing) {
            return
        }
        const delta = this.resizeStartY - event.clientY
        const newHeight = Math.max(100, Math.min(800, this.resizeStartHeight + delta))
        this.panelBodyHeight = newHeight
        this.cdr.markForCheck()
    }

    @HostListener('document:mouseup')
    onMouseUp (): void {
        if (this.resizing) {
            this.resizing = false
            this.panelHeight = this.panelBodyHeight
            this.configSvc.set({ panelHeight: this.panelHeight })
        }
    }
}
