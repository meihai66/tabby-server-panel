import { TabbyServerPanelModule } from './tabby-server-panel.module'

// Re-export the module for Tabby's plugin discovery
export { TabbyServerPanelModule }

// Export all public API
export * from './components/server-panel.component'
export * from './components/server-stats.component'
export * from './components/quick-commands.component'
export * from './components/file-manager.component'
export * from './services/server-stats.service'
export * from './services/quick-commands.service'
export * from './services/file-manager.service'
export * from './services/config.service'
export * from './config/config.provider'
export * from './models/server-stats.model'
export * from './models/quick-command.model'
export * from './models/file-item.model'

// Tabby plugin entry - export the default Angular module as `default`
export default TabbyServerPanelModule
