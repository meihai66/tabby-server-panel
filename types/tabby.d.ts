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

// ---------------------------------------------------------------------------
// Minimal type stubs for Angular packages.
//
// @angular/common, @angular/forms, and @angular/core are declared as webpack
// externals (Tabby provides the actual implementations at runtime).  We keep
// only the declarations TypeScript needs to type-check our source, so we do
// NOT install those packages as devDependencies and avoid pulling in the CVEs
// that affect them (GHSA-58c5-g7wp-6w37, GHSA-jrmj-c5cx-3cw6,
// GHSA-v4hv-rgfq-gp49, GHSA-prjf-86w9-mfqv).
//
// @angular/compiler and @angular/compiler-cli are still installed because
// @ngtools/webpack requires them as peer dependencies.  Those two packages do
// NOT require('@angular/core') at runtime — they only reference the string
// '@angular/core' as an AST marker, so the type stubs below satisfy the build.
// ---------------------------------------------------------------------------

declare module '@angular/common' {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    export class CommonModule {}
}

declare module '@angular/forms' {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    export class FormsModule {}
}

declare module '@angular/core' {
    /** Lifecycle hook: called once after the first ngOnChanges. */
    export interface OnInit {
        ngOnInit (): void
    }

    /** Lifecycle hook: called once before the view is destroyed. */
    export interface OnDestroy {
        ngOnDestroy (): void
    }

    /** Change-detection strategy. */
    export const ChangeDetectionStrategy: {
        readonly OnPush: 0
        readonly Default: 1
    }
    export type ChangeDetectionStrategy = 0 | 1

    /** Reference to the host DOM element of a component. */
    export class ElementRef<T = HTMLElement> {
        nativeElement: T
    }

    /** Abstraction for running code inside/outside Angular's zone. */
    export class NgZone {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        run<T> (fn: (...args: any[]) => T, applyThis?: unknown, applyArgs?: unknown[]): T
    }

    /** Service for manually triggering change detection. */
    export abstract class ChangeDetectorRef {
        abstract markForCheck (): void
        abstract detectChanges (): void
    }

    // ---- Decorators --------------------------------------------------------

    export interface NgModuleMetadata {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        imports?: any[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        declarations?: any[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        providers?: any[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        exports?: any[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bootstrap?: any[]
    }
    export function NgModule (metadata: NgModuleMetadata): ClassDecorator

    export interface ComponentMetadata {
        selector?: string
        template?: string
        templateUrl?: string
        styles?: string[]
        styleUrls?: string[]
        changeDetection?: ChangeDetectionStrategy
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        providers?: any[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any
    }
    export function Component (metadata: ComponentMetadata): ClassDecorator

    export interface InjectableOptions {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        providedIn?: any
    }
    export function Injectable (options?: InjectableOptions): ClassDecorator

    export function Input (bindingPropertyName?: string): PropertyDecorator

    export function HostListener (eventName: string, args?: string[]): MethodDecorator

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function ViewChild (selector: any, opts?: any): PropertyDecorator
}
