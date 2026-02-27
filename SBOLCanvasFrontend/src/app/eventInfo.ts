import { Info } from './info';
import { environment } from 'src/environments/environment';

export class EventInfo extends Info {
    simulationData = {};

    constructor() {
        super();
        this.uriPrefix = environment.baseURI;
    }

    getFullURI(): string {
        return this.uriPrefix + '/' + this.displayID;
    }

    makeCopy(): EventInfo {
        const copy: EventInfo = new EventInfo();
        copy.uriPrefix = this.uriPrefix;
        copy.displayID = this.displayID;
        copy.simulationData = this.simulationData ? { ...this.simulationData } : {};
        return copy;
    }

    copyDataFrom(other: EventInfo) {
        this.uriPrefix = other.uriPrefix;
        this.displayID = other.displayID;
        this.simulationData = other.simulationData ? { ...other.simulationData } : {};
    }

    encode(enc: any) {
        let node = enc.document.createElement('EventInfo');
        if (this.uriPrefix)
            node.setAttribute("uriPrefix", this.uriPrefix);
        if (this.displayID)
            node.setAttribute("displayID", this.displayID);
        if (this.simulationData) {
            let simulationDataNode = enc.document.createElement("Array");
            simulationDataNode.setAttribute("as", "simulationData");
            for (let key in this.simulationData) {
                let dataNode = enc.document.createElement("add");
                dataNode.setAttribute("value", this.simulationData[key]);
                dataNode.setAttribute("as", key);
                simulationDataNode.appendChild(dataNode);
            }
            node.appendChild(simulationDataNode);
        }
        return node;
    }
}
