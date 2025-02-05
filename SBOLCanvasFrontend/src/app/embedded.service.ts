import { Injectable } from '@angular/core'
import { GraphService } from './graph.service'
import { ActivatedRoute } from '@angular/router'
import { Observable } from 'rxjs'

type data = {
    sbol: string,
    panelType: string
}

@Injectable({
    providedIn: 'root'
})

export class EmbeddedService {

    private parent: any
    public sbol: Observable<data>

    constructor(private route: ActivatedRoute) {

        // create observable that watches for messages
        this.sbol = new Observable<data>(observer => {
            window.addEventListener('message', ({data, source}) => {
                // check that message is coming from external window
                if(source != window) {
                    this.parent = source

                    // check if message includes SBOL
                    if(data && data.sbol) {
                        console.log("HSEBHSABED", data.panelType)
                        console.debug('[Embedded] Received SBOL from up above:', data.sbol.substring(0, 20) + '...')
                        observer.next({sbol: data.sbol, panelType: data.panelType });
                    }
                }
            })
        })
    }

    public isAppEmbedded(): boolean {
        return !!this.parent
    }

    public postMessage(message: any): void {
        this.parent && this.parent.postMessage(message, '*')
    }
}