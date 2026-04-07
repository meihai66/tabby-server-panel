import {
    Component,
    Input,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    ChangeDetectionStrategy,
} from '@angular/core'
import { Subscription } from 'rxjs'
import { ServerStats } from '../models/server-stats.model'
import { ServerStatsService, SshLikeSession } from '../services/server-stats.service'
import { PanelConfigService } from '../services/config.service'

@Component({
    selector: 'server-stats',
    template: `
        <ng-container *ngIf="loading">
            <div class="loading-msg">正在连接，采集服务器状态…</div>
        </ng-container>
        <ng-container *ngIf="error">
            <div class="error-msg">⚠ 无法采集状态：{{ error }}</div>
        </ng-container>
        <ng-container *ngIf="stats">
            <div class="stats-grid">
                <!-- CPU -->
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-label">🖥 CPU</span>
                        <span class="stat-value" [class]="svc.getColorClass(stats.cpu.usage)">
                            {{ stats.cpu.usage }}%
                        </span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" [class]="svc.getColorClass(stats.cpu.usage)"
                             [style.width.%]="stats.cpu.usage"></div>
                    </div>
                </div>

                <!-- RAM -->
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-label">💾 内存 (RAM)</span>
                        <span class="stat-value" [class]="svc.getColorClass(stats.memory.usagePercent)">
                            {{ stats.memory.usagePercent }}%
                        </span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" [class]="svc.getColorClass(stats.memory.usagePercent)"
                             [style.width.%]="stats.memory.usagePercent"></div>
                    </div>
                    <div class="stat-detail">
                        {{ svc.formatBytes(stats.memory.used) }} / {{ svc.formatBytes(stats.memory.total) }}
                    </div>
                </div>

                <!-- SWAP -->
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-label">🔄 交换内存 (SWAP)</span>
                        <span class="stat-value" [class]="svc.getColorClass(stats.swap.usagePercent)">
                            {{ stats.swap.total === 0 ? '无' : stats.swap.usagePercent + '%' }}
                        </span>
                    </div>
                    <div class="progress-bar-bg" *ngIf="stats.swap.total > 0">
                        <div class="progress-bar-fill" [class]="svc.getColorClass(stats.swap.usagePercent)"
                             [style.width.%]="stats.swap.usagePercent"></div>
                    </div>
                    <div class="stat-detail" *ngIf="stats.swap.total > 0">
                        {{ svc.formatBytes(stats.swap.used) }} / {{ svc.formatBytes(stats.swap.total) }}
                    </div>
                </div>
            </div>

            <!-- Disk -->
            <div class="disk-table" *ngIf="stats.disk.length">
                <div class="disk-table-header">
                    <span style="flex:2">文件系统</span>
                    <span style="flex:1">挂载点</span>
                    <span style="flex:3">使用率</span>
                    <span style="flex:1;text-align:right">大小</span>
                </div>
                <div class="disk-row" *ngFor="let d of stats.disk">
                    <span class="disk-fs">{{ d.filesystem }}</span>
                    <span class="disk-mount">{{ d.mountedOn }}</span>
                    <div class="disk-usage">
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" [class]="svc.getColorClass(d.usePercent)"
                                 [style.width.%]="d.usePercent"></div>
                        </div>
                        <span class="disk-pct" [class]="svc.getColorClass(d.usePercent)">
                            {{ d.usePercent }}%
                        </span>
                    </div>
                    <span class="disk-size">{{ d.size }}</span>
                </div>
            </div>

            <!-- Network -->
            <div class="network-section" *ngIf="stats.network && stats.network.length">
                <div class="section-title">🌐 网络流量</div>
                <div class="net-row" *ngFor="let n of stats.network">
                    <span class="net-iface">{{ n.interface }}</span>
                    <div class="net-speeds">
                        <span class="net-rx">↓ {{ svc.formatBytes(n.rxBytes) }}/s</span>
                        <span class="net-tx">↑ {{ svc.formatBytes(n.txBytes) }}/s</span>
                    </div>
                </div>
            </div>
        </ng-container>
    `,
    styleUrls: ['./server-stats.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerStatsComponent implements OnInit, OnDestroy {
    @Input() session: SshLikeSession | null = null

    stats: ServerStats | null = null
    loading = true
    error: string | null = null

    private sub: Subscription | null = null

    constructor (
        public svc: ServerStatsService,
        private configSvc: PanelConfigService,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit (): void {
        if (!this.session) {
            this.loading = false
            this.error = '没有可用的 SSH 会话'
            this.cdr.markForCheck()
            return
        }

        const interval = this.configSvc.get().statsRefreshInterval

        this.sub = this.svc.stats$.subscribe({
            next: (stats: ServerStats) => {
                this.stats = stats
                this.loading = false
                this.error = null
                this.cdr.markForCheck()
            },
            error: (err: unknown) => {
                this.error = String(err)
                this.loading = false
                this.cdr.markForCheck()
            },
        })

        this.svc.startMonitoring(this.session, interval)
    }

    ngOnDestroy (): void {
        this.sub?.unsubscribe()
        this.svc.stopMonitoring()
    }
}
