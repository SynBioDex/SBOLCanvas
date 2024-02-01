

export class IdentifiedInfo {
    description: string;
    displayId: string;
    name: string;
    type: string;
    uri: string;
    version: string;

    makeCopy(): IdentifiedInfo{
        const copy: IdentifiedInfo = new IdentifiedInfo();
        copy.description = this.description;
        copy.displayId = this.displayId;
        copy.name = this.name;
        copy.type = this.type;
        copy.uri = this.uri;
        copy.version = this.version;
        return copy;
    }

    copyDataFrom(other: IdentifiedInfo){
        this.description = other.description;
        this.displayId = other.displayId;
        this.name = other.name;
        this.type = other.type;
        this.uri = other.uri;
        this.version = other.version;
    }

    encode(enc: any){
        let node = enc.document.createElement('IdentifiedInfo');
        if(this.description)
            node.setAttribute("description", this.description);
        if(this.displayId)
            node.setAttribute("displayID", this.displayId);
        if(this.name)
            node.setAttribute("name", this.name);
        if(this.type)
            node.setAttribute("type", this.type);
        if(this.uri)
            node.setAttribute("uri", this.uri);
        if(this.version)
            node.setAttribute("version", this.version);

        return node;
    }
}