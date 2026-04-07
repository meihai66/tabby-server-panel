import { Injectable } from '@angular/core'
import { TerminalDecorator, BaseTerminalTabComponent } from 'tabby-terminal'
import { SSHTabComponent } from 'tabby-ssh'
import { Subscription } from 'rxjs'
import { take } from 'rxjs/operators'

interface PanelRecord {
    sub: Subscription | null
    wrapper: HTMLElement | null
}

@Injectable()
export class ServerPanelDecorator extends TerminalDecorator {
    private panelMap = new WeakMap<BaseTerminalTabComponent, PanelRecord>()

    attach (tab: BaseTerminalTabComponent): void {
        if (!(tab instanceof SSHTabComponent)) {
            return
        }

        // Initialise the record before subscribing so the callback can always
        // find it, even if frontendReady$ emits synchronously.
        const record: PanelRecord = { sub: null, wrapper: null }
        this.panelMap.set(tab, record)

        record.sub = tab.frontendReady$.pipe(take(1)).subscribe(() => {
            try {
                const wrapper = document.createElement('div')
                wrapper.classList.add('server-panel-host')

                const panelEl = document.createElement('server-panel')
                wrapper.appendChild(panelEl)

                const container = tab.element?.querySelector('.content') ?? tab.element
                if (container) {
                    container.appendChild(wrapper)
                }

                record.wrapper = wrapper
            } catch (err) {
                console.error('[ServerPanelDecorator] Failed to attach panel:', err)
            }
        })
    }

    detach (tab: BaseTerminalTabComponent): void {
        const record = this.panelMap.get(tab)
        if (record) {
            record.sub?.unsubscribe()
            if (record.wrapper) {
                record.wrapper.remove()
            }
            this.panelMap.delete(tab)
        }
    }
}
