import { Injectable, OnDestroy } from '@angular/core'
import { Subject, Subscription, interval } from 'rxjs'
import { switchMap, takeUntil } from 'rxjs/operators'
import { ServerStats, CpuStats, MemoryStats, SwapStats, DiskStats, NetworkStats } from '../models/server-stats.model'

export interface SshLikeSession {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shell?: any
    executeCommand?: (cmd: string) => Promise<string>
}

@Injectable({ providedIn: 'root' })
export class ServerStatsService implements OnDestroy {
    private statsSubject = new Subject<ServerStats>()
    private stopSubject = new Subject<void>()
    private refreshSubscription: Subscription | null = null
    private session: SshLikeSession | null = null
    private prevNetworkStats: Map<string, { rx: number; tx: number; time: number }> = new Map()

    stats$ = this.statsSubject.asObservable()

    startMonitoring (session: SshLikeSession, intervalSeconds = 5): void {
        this.session = session
        this.stopMonitoring()

        // Fetch immediately, then on interval
        this.fetchStats()

        this.refreshSubscription = interval(intervalSeconds * 1000)
            .pipe(
                takeUntil(this.stopSubject),
                switchMap(() => this.fetchStatsAsync()),
            )
            .subscribe({
                next: stats => this.statsSubject.next(stats),
                error: err => console.error('[ServerStatsService] Error fetching stats:', err),
            })
    }

    stopMonitoring (): void {
        this.stopSubject.next()
        if (this.refreshSubscription) {
            this.refreshSubscription.unsubscribe()
            this.refreshSubscription = null
        }
    }

    ngOnDestroy (): void {
        this.stopMonitoring()
    }

    private async fetchStats (): Promise<void> {
        try {
            const stats = await this.fetchStatsAsync()
            this.statsSubject.next(stats)
        } catch (err) {
            console.error('[ServerStatsService] Error on initial fetch:', err)
        }
    }

    private async fetchStatsAsync (): Promise<ServerStats> {
        if (!this.session) {
            throw new Error('No SSH session available')
        }

        const [cpu, meminfo, df, netdev] = await Promise.all([
            this.execCommand('cat /proc/stat | head -1'),
            this.execCommand('cat /proc/meminfo'),
            this.execCommand('df -P'),
            this.execCommand('cat /proc/net/dev'),
        ])

        return {
            cpu: this.parseCpu(cpu),
            memory: this.parseMemory(meminfo),
            swap: this.parseSwap(meminfo),
            disk: this.parseDisk(df),
            network: this.parseNetwork(netdev),
            timestamp: new Date(),
        }
    }

    private async execCommand (cmd: string): Promise<string> {
        if (!this.session) {
            return ''
        }
        // Use executeCommand helper if available (for testing/mock), otherwise use shell write
        if (typeof this.session.executeCommand === 'function') {
            return this.session.executeCommand(cmd)
        }
        // Fallback: For a real tabby SSH session we execute via the shell
        // The session is expected to expose a method to run commands.
        // This is a best-effort wrapper around tabby-ssh BaseSSHTabComponent
        return this.runViaShell(cmd)
    }

    private runViaShell (cmd: string): Promise<string> {
        return new Promise((resolve) => {
            if (!this.session?.shell) {
                resolve('')
                return
            }
            const shell = this.session.shell
            let output = ''
            const marker = `__END_${Date.now()}__`
            const onData = (data: string) => {
                output += data
                if (output.includes(marker)) {
                    shell.removeListener('data', onData)
                    // Strip the command echo and marker
                    const lines = output.split('\n')
                    const result = lines
                        .filter(l => !l.includes(cmd) && !l.includes(marker) && l.trim())
                        .join('\n')
                    resolve(result)
                }
            }
            shell.on('data', onData)
            shell.write(`${cmd}; echo ${marker}\n`)
            // Timeout after 10s
            setTimeout(() => {
                shell.removeListener('data', onData)
                resolve(output)
            }, 10000)
        })
    }

    // ---- Parsers ----

    private parseCpu (statLine: string): CpuStats {
        // cpu  user nice system idle iowait irq softirq steal guest guest_nice
        const parts = statLine.trim().split(/\s+/)
        if (parts.length < 5) {
            return { usage: 0 }
        }
        const user = parseInt(parts[1], 10) || 0
        const nice = parseInt(parts[2], 10) || 0
        const system = parseInt(parts[3], 10) || 0
        const idle = parseInt(parts[4], 10) || 0
        const iowait = parseInt(parts[5], 10) || 0
        const total = user + nice + system + idle + iowait
        const used = total - idle - iowait
        const usage = total > 0 ? Math.round((used / total) * 100) : 0
        return { usage }
    }

    private parseMemory (meminfo: string): MemoryStats {
        const getValue = (key: string): number => {
            const match = meminfo.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'))
            return match ? parseInt(match[1], 10) * 1024 : 0 // kB -> bytes
        }
        const total = getValue('MemTotal')
        const free = getValue('MemFree')
        const buffers = getValue('Buffers')
        const cached = getValue('Cached')
        const used = total - free - buffers - cached
        const usagePercent = total > 0 ? Math.round((used / total) * 100) : 0
        return { total, used: Math.max(used, 0), free, usagePercent }
    }

    private parseSwap (meminfo: string): SwapStats {
        const getValue = (key: string): number => {
            const match = meminfo.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'))
            return match ? parseInt(match[1], 10) * 1024 : 0
        }
        const total = getValue('SwapTotal')
        const free = getValue('SwapFree')
        const used = total - free
        const usagePercent = total > 0 ? Math.round((used / total) * 100) : 0
        return { total, used: Math.max(used, 0), free, usagePercent }
    }

    private parseDisk (dfOutput: string): DiskStats[] {
        const lines = dfOutput.trim().split('\n')
        const result: DiskStats[] = []
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].trim().split(/\s+/)
            if (parts.length < 6) {
                continue
            }
            const usePercentStr = parts[4].replace('%', '')
            result.push({
                filesystem: parts[0],
                size: parts[1],
                used: parts[2],
                available: parts[3],
                usePercent: parseInt(usePercentStr, 10) || 0,
                mountedOn: parts[5],
            })
        }
        return result
    }

    private parseNetwork (netdev: string): NetworkStats[] {
        const lines = netdev.trim().split('\n')
        const result: NetworkStats[] = []
        const now = Date.now()

        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) {
                continue
            }
            const colonIdx = line.indexOf(':')
            if (colonIdx < 0) {
                continue
            }
            const iface = line.substring(0, colonIdx).trim()
            const parts = line.substring(colonIdx + 1).trim().split(/\s+/)
            if (parts.length < 10) {
                continue
            }
            const rx = parseInt(parts[0], 10) || 0
            const tx = parseInt(parts[8], 10) || 0

            const prev = this.prevNetworkStats.get(iface)
            let rxRate = 0
            let txRate = 0
            if (prev) {
                const elapsed = (now - prev.time) / 1000
                rxRate = elapsed > 0 ? Math.max(0, (rx - prev.rx) / elapsed) : 0
                txRate = elapsed > 0 ? Math.max(0, (tx - prev.tx) / elapsed) : 0
            }
            this.prevNetworkStats.set(iface, { rx, tx, time: now })

            if (iface !== 'lo') {
                result.push({ interface: iface, rxBytes: rxRate, txBytes: txRate })
            }
        }
        return result
    }

    formatBytes (bytes: number): string {
        if (bytes === 0) {
            return '0 B'
        }
        const units = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        const val = bytes / Math.pow(1024, i)
        return `${val.toFixed(1)} ${units[i]}`
    }

    getColorClass (percent: number): string {
        if (percent < 60) {
            return 'stat-green'
        }
        if (percent < 85) {
            return 'stat-yellow'
        }
        return 'stat-red'
    }
}
