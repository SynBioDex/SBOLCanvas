import { Info } from './info';
import { environment } from 'src/environments/environment';

export class EventInfo extends Info {
    name: string;
    delay: number;
    targetSpecies: string;
    assignmentValue: number;

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
        copy.name = this.name;
        copy.delay = this.delay;
        copy.targetSpecies = this.targetSpecies;
        copy.assignmentValue = this.assignmentValue;
        return copy;
    }

    copyDataFrom(other: EventInfo) {
        this.uriPrefix = other.uriPrefix;
        this.displayID = other.displayID;
        this.name = other.name;
        this.delay = other.delay;
        this.targetSpecies = other.targetSpecies;
        this.assignmentValue = other.assignmentValue;
    }

    encode(enc: any) {
        let node = enc.document.createElement('EventInfo');
        if (this.uriPrefix)
            node.setAttribute("uriPrefix", this.uriPrefix);
        if (this.displayID)
            node.setAttribute("displayID", this.displayID);
        if (this.name)
            node.setAttribute("name", this.name);
        if (this.delay !== undefined)
            node.setAttribute("delay", this.delay.toString());
        if (this.targetSpecies)
            node.setAttribute("targetSpecies", this.targetSpecies);
        if (this.assignmentValue !== undefined)
            node.setAttribute("assignmentValue", this.assignmentValue.toString());

        return node;
    }
}
