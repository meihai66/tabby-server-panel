export interface ServerStats {
    cpu: CpuStats
    memory: MemoryStats
    swap: SwapStats
    disk: DiskStats[]
    network?: NetworkStats[]
    timestamp: Date
}

export interface CpuStats {
    usage: number      // percentage 0-100
    cores?: number
    model?: string
}

export interface MemoryStats {
    total: number      // bytes
    used: number       // bytes
    free: number       // bytes
    usagePercent: number
}

export interface SwapStats {
    total: number      // bytes
    used: number       // bytes
    free: number       // bytes
    usagePercent: number
}

export interface DiskStats {
    filesystem: string
    size: string
    used: string
    available: string
    usePercent: number
    mountedOn: string
}

export interface NetworkStats {
    interface: string
    rxBytes: number    // bytes per second
    txBytes: number    // bytes per second
}
