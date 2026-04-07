declare module 'tabby-core' {
    export class ConfigProvider {
        defaults: Record<string, unknown>
        migrations: unknown[]
    }

    export class ConfigService {
        // `store` holds arbitrary plugin config from many different plugins with
        // varying shapes, so `any` is intentional here for this ambient stub only.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        store: Record<string, any>
        save (): void
    }
}

declare module 'tabby-terminal' {
    // intentionally empty – only used as an external in webpack
}

declare module 'tabby-ssh' {
    // intentionally empty – only used as an external in webpack
}

declare module '@electron/remote' {
    export const dialog: {
        showOpenDialog (options: unknown): Promise<{ canceled: boolean; filePaths: string[] }>
    }
}
