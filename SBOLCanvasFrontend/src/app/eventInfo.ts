import { Info } from './info';
import { environment } from 'src/environments/environment';

export class EventInfo extends Info {
    name: string = '';
    description: string = '';
    simulationData: Record<string, number | string | boolean> = {};

    constructor() {
        super();
        this.uriPrefix = environment.baseURI;
        this.version = "1";
        this.displayID = Info.generateID('Event');
        // default name is the type, same convention as molecular species ("prot")
        this.name = 'Event';
    }

    makeCopy(): EventInfo {
        const copy: EventInfo = new EventInfo();
        copy.uriPrefix = this.uriPrefix;
        copy.displayID = this.displayID;
        copy.version = this.version;
        copy.name = this.name;
        copy.description = this.description;
        copy.simulationData = this.simulationData ? { ...this.simulationData } : {};
        return copy;
    }

    copyDataFrom(other: EventInfo) {
        this.uriPrefix = other.uriPrefix;
        this.displayID = other.displayID;
        this.version = other.version;
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
        if (this.version && this.version.length > 0)
            node.setAttribute("version", this.version);
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
