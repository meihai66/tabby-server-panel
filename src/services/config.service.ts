import { Injectable } from '@angular/core'
import { ConfigService } from 'tabby-core'
import { ServerPanelConfig } from '../config/config.provider'

@Injectable({ providedIn: 'root' })
export class PanelConfigService {
    constructor (private config: ConfigService) {}

    get (): ServerPanelConfig {
        return this.config.store?.serverPanel ?? this.defaults
    }

    set (values: Partial<ServerPanelConfig>): void {
        if (!this.config.store.serverPanel) {
            this.config.store.serverPanel = {}
        }
        Object.assign(this.config.store.serverPanel, values)
        this.config.save()
    }

    private get defaults (): ServerPanelConfig {
        return {
            statsRefreshInterval: 5,
            defaultUploadPath: '/tmp',
            autoSyncEnabled: true,
            panelHeight: 250,
            quickCommands: { tabs: [] },
        }
    }
}
