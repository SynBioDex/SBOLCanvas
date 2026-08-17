import { Info } from './info';
import { environment } from 'src/environments/environment';
import { customAlphabet } from 'nanoid';
import { alphanumeric } from 'nanoid-dictionary';

export class EventInfo extends Info {
    name: string = '';
    description: string = '';
    simulationData: Record<string, number | string | boolean> = {};

    constructor() {
        super();
        this.uriPrefix = environment.baseURI;
        // Static 'Event_' prefix never starts with a digit, so the displayID is NCName-safe without a guard.
        this.displayID = 'Event_' + customAlphabet(alphanumeric, 8)();
    }

    getFullURI(): string {
        return this.uriPrefix + '/' + this.displayID;
    }

    makeCopy(): EventInfo {
        const copy: EventInfo = new EventInfo();
        copy.uriPrefix = this.uriPrefix;
        copy.displayID = this.displayID;
        copy.name = this.name;
        copy.description = this.description;
        copy.simulationData = this.simulationData ? { ...this.simulationData } : {};
        return copy;
    }

    copyDataFrom(other: EventInfo) {
        this.uriPrefix = other.uriPrefix;
        this.displayID = other.displayID;
        this.name = other.name;
        this.description = other.description;
        this.simulationData = other.simulationData ? { ...other.simulationData } : {};
    }

    encode(enc: any) {
        let node = enc.document.createElement('EventInfo');
        if (this.uriPrefix)
            node.setAttribute("uriPrefix", this.uriPrefix);
        if (this.displayID)
            node.setAttribute("displayID", this.displayID);
        if (this.name && this.name.length > 0)
            node.setAttribute("name", this.name);
        if (this.description && this.description.length > 0)
            node.setAttribute("description", this.description);
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
