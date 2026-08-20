import { CanvasAnnotation } from './canvasAnnotation';
import { Info } from './info';

export class GlyphInfo extends Info {
    // Remember that when you change this you need to change the encode function in graph service
    partType: string;
    otherTypes: string[];
    partRole: string;
    otherRoles: string[];
    partRefine: string;
    name: string;
    description: string;
    version: string;
    sequence: string;
    sequenceURI: string;
    annotations: CanvasAnnotation[];
    derivedFroms: string[];
    generatedBys: string[];
    simulationData: Record<string, number | string | boolean> = {};

    constructor({
        version = "1",
        partType = "DNA region",
        partRole,
    }: {
        version?,
        partType?,
        partRole?,
    } = {}) {
        super();

        this.version = version;
        this.partType = partType;
        this.partRole = partRole;
        this.otherTypes = [];

        // try to make a prefix from the part role
        const partRolePrefix = partRole && (partRole.match(/^(\w+)/) || [])[1];
        this.displayID = Info.generateID(partRolePrefix || 'part');

        // make a name so the displayed stuff is cleaner
        this.name = partRolePrefix || " ";
    }

    makeCopy() {
        const copy: GlyphInfo = new GlyphInfo();
        copy.partType = this.partType;
        copy.otherTypes = this.otherTypes ? this.otherTypes.slice() : null;
        copy.partRole = this.partRole;
        copy.otherRoles = this.otherRoles ? this.otherRoles.slice() : null;
        copy.partRefine = this.partRefine;
        copy.displayID = this.displayID;
        copy.name = this.name;
        copy.description = this.description;
        copy.version = this.version;
        copy.sequence = this.sequence;
        copy.sequenceURI = this.sequenceURI;
        copy.uriPrefix = this.uriPrefix;
        copy.annotations = this.annotations ? this.annotations.slice() : null;
        copy.derivedFroms = this.derivedFroms ? this.derivedFroms.slice() : null;
        copy.generatedBys = this.generatedBys ? this.generatedBys.slice() : null;
        copy.simulationData = this.simulationData ? { ...this.simulationData } : {};
        return copy;
    }

    copyDataFrom(other: GlyphInfo) {
        this.partType = other.partType;
        this.otherTypes = other.otherTypes ? other.otherTypes.slice() : null;
        this.partRole = other.partRole;
        this.otherRoles = other.otherRoles ? other.otherRoles.slice() : null;
        this.partRefine = other.partRefine;
        this.displayID = other.displayID;
        this.name = other.name;
        this.description = other.description;
        this.version = other.version;
        this.sequence = other.sequence;
        this.sequenceURI = other.sequenceURI;
        this.uriPrefix = other.uriPrefix;
        this.annotations = other.annotations ? other.annotations.slice() : null;
        this.derivedFroms = other.derivedFroms ? other.derivedFroms.slice() : null;
        this.generatedBys = other.generatedBys ? other.generatedBys.slice() : null;
        this.simulationData = other.simulationData ? { ...other.simulationData } : {};
    }

    getFullURI(): string {
        let fullURI = this.uriPrefix + '/' + this.displayID;
        if (this.version && this.version.length > 0) {
            fullURI += '/' + this.version;
        }
        return fullURI;
    }

    encode(enc: any) {
        let node = enc.document.createElement('GlyphInfo');
        if (this.partType)
            node.setAttribute("partType", this.partType);
        if (this.otherTypes) {
            let otherTypesNode = enc.encode(this.otherTypes);
            otherTypesNode.setAttribute("as", "otherTypes");
            node.appendChild(otherTypesNode);
        }
        if (this.partRole)
            node.setAttribute("partRole", this.partRole);
        if (this.otherRoles) {
            let otherRolesNode = enc.encode(this.otherRoles);
            otherRolesNode.setAttribute("as", "otherRoles");
            node.appendChild(otherRolesNode);
        }
        if (this.partRefine)
            node.setAttribute("partRefine", this.partRefine);
        if (this.displayID)
            node.setAttribute("displayID", this.displayID);
        if (this.name && this.name.length > 0)
            node.setAttribute("name", this.name);
        if (this.description && this.description.length > 0)
            node.setAttribute("description", this.description);
        if (this.version && this.version.length > 0)
            node.setAttribute("version", this.version);
        if (this.sequence && this.sequence.length > 0)
            node.setAttribute("sequence", this.sequence);
        if (this.sequenceURI && this.sequenceURI.length > 0)
            node.setAttribute("sequenceURI", this.sequenceURI);
        if (this.uriPrefix)
            node.setAttribute("uriPrefix", this.uriPrefix);

        if (this.annotations) {
            let annotationsNode = enc.encode(this.annotations);
            annotationsNode.setAttribute("as", "annotations");
            node.appendChild(annotationsNode);
        }
        if (this.derivedFroms) {
            let derivedFromsNode = enc.encode(this.derivedFroms);
            derivedFromsNode.setAttribute("as", "derivedFroms");
            node.appendChild(derivedFromsNode);
        }
        if (this.generatedBys) {
            let generatedBysNode = enc.encode(this.generatedBys);
            generatedBysNode.setAttribute("as", "generatedBys");
            node.appendChild(generatedBysNode);
        }
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
