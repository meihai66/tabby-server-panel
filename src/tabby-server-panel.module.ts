import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ConfigProvider } from 'tabby-core'

import { ServerPanelComponent } from './components/server-panel.component'
import { ServerStatsComponent } from './components/server-stats.component'
import { QuickCommandsComponent } from './components/quick-commands.component'
import { FileManagerComponent } from './components/file-manager.component'

import { ServerStatsService } from './services/server-stats.service'
import { QuickCommandsService } from './services/quick-commands.service'
import { FileManagerService } from './services/file-manager.service'
import { PanelConfigService } from './services/config.service'
import { ServerPanelConfigProvider } from './config/config.provider'

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
    ],
    declarations: [
        ServerPanelComponent,
        ServerStatsComponent,
        QuickCommandsComponent,
        FileManagerComponent,
    ],
    providers: [
        ServerStatsService,
        QuickCommandsService,
        FileManagerService,
        PanelConfigService,
        { provide: ConfigProvider, useClass: ServerPanelConfigProvider, multi: true },
    ],
    exports: [
        ServerPanelComponent,
    ],
})
export default class TabbyServerPanelModule { }
