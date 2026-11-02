import { Injectable, OnDestroy } from '@angular/core'
import { ReplaySubject } from 'rxjs'

type data = {
    sbol: string,
    panelType: string
}

@Injectable({
    providedIn: 'root'
})

export class EmbeddedService implements OnDestroy {

    private parent: any
    private readonly sbolSource = new ReplaySubject<data>(1)
    public readonly sbol = this.sbolSource.asObservable()

    private readonly messageListener = ({data, source}: MessageEvent) => {
                // check that message is coming from external window
                if(source != window) {
                    this.parent = source

                    // Check if no sbol, but plasmids panel was open
                    if(data && data.panelType && !data.sbol){
                        this.sbolSource.next({sbol: null, panelType: data.panelType})
                    }
                    // check if message includes SBOL
                    if(data && data.sbol) {
                        console.debug('[Embedded] Received SBOL from up above:', data.sbol.substring(0, 20) + '...')
                        this.sbolSource.next({sbol: data.sbol, panelType: data.panelType });
                    }
                }
    }

    constructor() {
        window.addEventListener('message', this.messageListener)
    }

    ngOnDestroy(): void {
        window.removeEventListener('message', this.messageListener)
        this.sbolSource.complete()
    }

    public isAppEmbedded(): boolean {
        return !!this.parent
    }

    public postMessage(message: any): void {
        this.parent && this.parent.postMessage(message, '*')
    }
}