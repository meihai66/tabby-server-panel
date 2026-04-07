import { Injectable } from '@angular/core'
import { ConfigProvider } from 'tabby-core'
import { QuickCommandTab } from '../models/quick-command.model'

export interface ServerPanelConfig {
    statsRefreshInterval: number
    defaultUploadPath: string
    autoSyncEnabled: boolean
    panelHeight: number
    quickCommands: {
        tabs: QuickCommandTab[]
    }
}

@Injectable()
export class ServerPanelConfigProvider extends ConfigProvider {
    defaults = {
        serverPanel: {
            statsRefreshInterval: 5,
            defaultUploadPath: '/tmp',
            autoSyncEnabled: true,
            panelHeight: 250,
            quickCommands: {
                tabs: [
                    {
                        id: 'default',
                        name: '常用',
                        commands: [
                            {
                                id: 'cmd-1',
                                name: '查看日志',
                                command: 'tail -f /var/log/syslog',
                                icon: '📄',
                                color: '#4CAF50',
                            },
                            {
                                id: 'cmd-2',
                                name: '磁盘使用',
                                command: 'df -h',
                                icon: '💾',
                                color: '#2196F3',
                            },
                            {
                                id: 'cmd-3',
                                name: '进程列表',
                                command: 'ps aux | head -20',
                                icon: '📋',
                                color: '#9C27B0',
                            },
                        ],
                    },
                ],
            },
        },
    }

    // No additional migrations needed currently
    migrations = []
}
