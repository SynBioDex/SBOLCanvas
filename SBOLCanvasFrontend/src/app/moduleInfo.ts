import { GlyphInfo } from './glyphInfo';
import { Info } from './info';


export class ModuleInfo extends Info{
    static counter: number = 0;
    description: string;

    constructor() {
        super();
        this.displayID = 'module' + (ModuleInfo.counter++);
    }

    makeCopy(): ModuleInfo {
        const copy: ModuleInfo = new ModuleInfo();
        copy.displayID = this.displayID;
        copy.name = this.name;
        copy.description = this.description;
        copy.version = this.version;
        copy.uriPrefix = this.uriPrefix;
        return copy;
    }

    copyDataFrom(other: ModuleInfo) {
        this.displayID = other.displayID;
        this.name = other.name;
        this.description = other.description;
        this.version = other.version;
        this.uriPrefix = other.uriPrefix;
    }

    encode(enc: any) {
        let node = enc.document.createElement('ModuleInfo');
        if (this.displayID)
            node.setAttribute("displayID", this.displayID);
        if (this.name && this.name.length > 0)
            node.setAttribute("name", this.name);
        if (this.description && this.description.length > 0)
            node.setAttribute("description", this.description);
        if (this.version && this.version.length > 0)
            node.setAttribute("version", this.version);
        if (this.uriPrefix)
            node.setAttribute("uriPrefix", this.uriPrefix);

        return node;
    }
}