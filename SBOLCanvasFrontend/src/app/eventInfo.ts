import { Info, valueType } from './info';
import { environment } from 'src/environments/environment';

export const CELL_REFERENCE_PREFIX = 'cell:';

export interface SpeciesInstanceRef {
  definitionUri: string;
  cellId: string;
  label: string;
}

export function isCellReference(raw: unknown): raw is string {
  if (typeof raw !== 'string' || !raw.startsWith(CELL_REFERENCE_PREFIX)) {
    return false;
  }
  const cellId = raw.slice(CELL_REFERENCE_PREFIX.length);
  return cellId.length > 0 && !/\s/.test(cellId);
}

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

    encode(enc: any) {
        let node = enc.document.createElement('EventInfo');
        if (this.uriPrefix)
            node.setAttribute("uriPrefix", this.uriPrefix);
        if (this.displayID)
            node.setAttribute("displayID", this.displayID);
        node.setAttribute("version", this.version == null ? "" : this.version);
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
                dataNode.setAttribute("type", valueType(this.simulationData[key]));
                simulationDataNode.appendChild(dataNode);
            }
            node.appendChild(simulationDataNode);
        }
        return node;
    }
}
