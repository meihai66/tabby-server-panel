import {
    Component,
    Input,
    OnInit,
    ChangeDetectorRef,
    ChangeDetectionStrategy,
} from '@angular/core'
import { QuickCommandTab, QuickCommand } from '../models/quick-command.model'
import { QuickCommandsService } from '../services/quick-commands.service'

export interface TerminalLike {
    sendText (text: string): void
}

@Component({
    selector: 'quick-commands',
    template: `
        <!-- Tab bar -->
        <div class="tabs-header">
            <button
                *ngFor="let tab of tabs"
                class="tab-pill"
                [class.active]="tab.id === activeTabId"
                (click)="selectTab(tab.id)"
            >
                <span *ngIf="renamingTabId !== tab.id" (dblclick)="startRenameTab(tab, $event)">
                    {{ tab.name }}
                </span>
                <input
                    *ngIf="renamingTabId === tab.id"
                    class="rename-input"
                    [(ngModel)]="renamingTabName"
                    (blur)="finishRenameTab()"
                    (keydown.enter)="finishRenameTab()"
                    (keydown.escape)="cancelRenameTab()"
                    (click)="$event.stopPropagation()"
                    style="width:80px;background:#1e1e1e;border:1px solid #0078d4;color:#d4d4d4;padding:1px 4px;border-radius:2px;font-size:12px;outline:none;"
                    autofocus
                />
                <span class="tab-delete" (click)="deleteTab(tab.id, $event)" title="删除分页">✕</span>
            </button>
            <button class="add-tab-btn" (click)="addTab()" title="新增分页">＋ 分页</button>
        </div>

        <!-- Commands -->
        <div class="commands-body">
            <ng-container *ngIf="activeTab">
                <div class="commands-grid">
                    <button
                        *ngFor="let cmd of activeTab.commands"
                        class="cmd-btn"
                        [style.border-color]="cmd.color || ''"
                        (click)="executeCommand(cmd)"
                        title="{{ cmd.command }}"
                    >
                        <span *ngIf="cmd.icon" class="cmd-icon">{{ cmd.icon }}</span>
                        <span class="cmd-name">{{ cmd.name }}</span>
                        <div class="cmd-actions">
                            <button (click)="startEditCommand(cmd, $event)" title="编辑">✎</button>
                            <button (click)="deleteCommand(cmd.id, $event)" title="删除">✕</button>
                        </div>
                    </button>

                    <button class="add-cmd-btn" (click)="showAddForm = true; editingCmd = null"
                            *ngIf="!showAddForm && !editingCmd">
                        ＋ 添加命令
                    </button>
                </div>

                <!-- Inline add/edit form -->
                <div class="inline-form" *ngIf="showAddForm || editingCmd">
                    <input class="input-icon" [(ngModel)]="formIcon" placeholder="图标" maxlength="2" />
                    <input class="input-name" [(ngModel)]="formName" placeholder="名称" />
                    <input class="input-command" [(ngModel)]="formCommand" placeholder="命令" />
                    <input class="input-color" type="color" [(ngModel)]="formColor" title="颜色" />
                    <button (click)="saveForm()">保存</button>
                    <button class="btn-cancel" (click)="cancelForm()">取消</button>
                </div>

                <div class="empty-msg" *ngIf="activeTab.commands.length === 0 && !showAddForm">
                    暂无命令，点击「添加命令」开始
                </div>
            </ng-container>

            <div class="empty-msg" *ngIf="!activeTab">
                点击「＋ 分页」新建分页
            </div>
        </div>
    `,
    styleUrls: ['./quick-commands.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickCommandsComponent implements OnInit {
    @Input() terminal: TerminalLike | null = null

    tabs: QuickCommandTab[] = []
    activeTabId: string | null = null

    renamingTabId: string | null = null
    renamingTabName = ''

    showAddForm = false
    editingCmd: QuickCommand | null = null
    formName = ''
    formCommand = ''
    formIcon = ''
    formColor = '#888888'

    get activeTab (): QuickCommandTab | undefined {
        return this.tabs.find(t => t.id === this.activeTabId)
    }

    constructor (
        private svc: QuickCommandsService,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit (): void {
        this.tabs = this.svc.getTabs()
        if (this.tabs.length > 0) {
            this.activeTabId = this.tabs[0].id
        }
    }

    selectTab (id: string): void {
        this.activeTabId = id
        this.showAddForm = false
        this.editingCmd = null
    }

    addTab (): void {
        const name = `分页 ${this.tabs.length + 1}`
        const tab = this.svc.addTab(name)
        this.tabs = this.svc.getTabs()
        this.activeTabId = tab.id
        this.cdr.markForCheck()
        // Immediately start renaming
        this.renamingTabId = tab.id
        this.renamingTabName = tab.name
    }

    startRenameTab (tab: QuickCommandTab, event: Event): void {
        event.stopPropagation()
        this.renamingTabId = tab.id
        this.renamingTabName = tab.name
    }

    finishRenameTab (): void {
        if (this.renamingTabId && this.renamingTabName.trim()) {
            this.svc.renameTab(this.renamingTabId, this.renamingTabName.trim())
            this.tabs = this.svc.getTabs()
        }
        this.renamingTabId = null
        this.cdr.markForCheck()
    }

    cancelRenameTab (): void {
        this.renamingTabId = null
        this.cdr.markForCheck()
    }

    deleteTab (tabId: string, event: Event): void {
        event.stopPropagation()
        this.svc.deleteTab(tabId)
        this.tabs = this.svc.getTabs()
        if (this.activeTabId === tabId) {
            this.activeTabId = this.tabs.length > 0 ? this.tabs[0].id : null
        }
        this.cdr.markForCheck()
    }

    executeCommand (cmd: QuickCommand): void {
        if (this.terminal) {
            this.terminal.sendText(cmd.command + '\n')
        }
    }

    startEditCommand (cmd: QuickCommand, event: Event): void {
        event.stopPropagation()
        this.editingCmd = cmd
        this.showAddForm = false
        this.formName = cmd.name
        this.formCommand = cmd.command
        this.formIcon = cmd.icon ?? ''
        this.formColor = cmd.color ?? '#888888'
        this.cdr.markForCheck()
    }

    deleteCommand (cmdId: string, event: Event): void {
        event.stopPropagation()
        if (!this.activeTabId) {
            return
        }
        this.svc.deleteCommand(this.activeTabId, cmdId)
        this.tabs = this.svc.getTabs()
        this.cdr.markForCheck()
    }

    saveForm (): void {
        if (!this.activeTabId || !this.formName.trim() || !this.formCommand.trim()) {
            return
        }
        if (this.editingCmd) {
            this.svc.updateCommand(this.activeTabId, this.editingCmd.id, {
                name: this.formName.trim(),
                command: this.formCommand.trim(),
                icon: this.formIcon.trim() || undefined,
                color: this.formColor,
            })
        } else {
            this.svc.addCommand(this.activeTabId, {
                name: this.formName.trim(),
                command: this.formCommand.trim(),
                icon: this.formIcon.trim() || undefined,
                color: this.formColor,
            })
        }
        this.tabs = this.svc.getTabs()
        this.cancelForm()
    }

    cancelForm (): void {
        this.showAddForm = false
        this.editingCmd = null
        this.formName = ''
        this.formCommand = ''
        this.formIcon = ''
        this.formColor = '#888888'
        this.cdr.markForCheck()
    }
}
