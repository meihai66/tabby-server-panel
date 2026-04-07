export interface QuickCommandTab {
    id: string
    name: string
    commands: QuickCommand[]
}

export interface QuickCommand {
    id: string
    name: string
    command: string
    icon?: string
    color?: string
}
