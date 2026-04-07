import { Injectable } from '@angular/core'
import { ConfigService } from 'tabby-core'
import { QuickCommandTab, QuickCommand } from '../models/quick-command.model'

@Injectable()
export class QuickCommandsService {
    constructor (private config: ConfigService) {}

    getTabs (): QuickCommandTab[] {
        return this.config.store?.serverPanel?.quickCommands?.tabs ?? []
    }

    saveTabs (tabs: QuickCommandTab[]): void {
        if (!this.config.store.serverPanel) {
            this.config.store.serverPanel = {}
        }
        if (!this.config.store.serverPanel.quickCommands) {
            this.config.store.serverPanel.quickCommands = {}
        }
        this.config.store.serverPanel.quickCommands.tabs = tabs
        this.config.save()
    }

    addTab (name: string): QuickCommandTab {
        const tabs = this.getTabs()
        const tab: QuickCommandTab = {
            id: `tab-${Date.now()}`,
            name,
            commands: [],
        }
        tabs.push(tab)
        this.saveTabs(tabs)
        return tab
    }

    renameTab (tabId: string, newName: string): void {
        const tabs = this.getTabs()
        const tab = tabs.find(t => t.id === tabId)
        if (tab) {
            tab.name = newName
            this.saveTabs(tabs)
        }
    }

    deleteTab (tabId: string): void {
        const tabs = this.getTabs().filter(t => t.id !== tabId)
        this.saveTabs(tabs)
    }

    addCommand (tabId: string, command: Omit<QuickCommand, 'id'>): QuickCommand {
        const tabs = this.getTabs()
        const tab = tabs.find(t => t.id === tabId)
        if (!tab) {
            throw new Error(`Tab ${tabId} not found`)
        }
        const newCmd: QuickCommand = { id: `cmd-${Date.now()}`, ...command }
        tab.commands.push(newCmd)
        this.saveTabs(tabs)
        return newCmd
    }

    updateCommand (tabId: string, commandId: string, updates: Partial<QuickCommand>): void {
        const tabs = this.getTabs()
        const tab = tabs.find(t => t.id === tabId)
        if (!tab) {
            return
        }
        const cmd = tab.commands.find(c => c.id === commandId)
        if (cmd) {
            Object.assign(cmd, updates)
            this.saveTabs(tabs)
        }
    }

    deleteCommand (tabId: string, commandId: string): void {
        const tabs = this.getTabs()
        const tab = tabs.find(t => t.id === tabId)
        if (!tab) {
            return
        }
        tab.commands = tab.commands.filter(c => c.id !== commandId)
        this.saveTabs(tabs)
    }
}
