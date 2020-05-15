import { ParsedEventType } from '@angular/compiler';

export class GlyphInfo {
  // Remember that when you change this you need to change the encode function in graph service
  static counter: number = 0;
  static baseURI: string = "https://sbolcanvas.org";
  partType: string;
  otherTypes: string[];
  partRole: string;
  otherRoles: string[];
  partRefine: string;
  displayID: string;
  name: string;
  description: string;
  version: string;
  sequence: string;
  uriPrefix: string = GlyphInfo.baseURI;

  constructor(partType?: string) {
    this.displayID = 'id' + (GlyphInfo.counter++);
    if(partType){
      this.partType = partType;
    }else{
      this.partType = 'DNA region';
    }
  }

  makeCopy() {
    const copy: GlyphInfo = new GlyphInfo();
    copy.partType = this.partType;
    copy.partRole = this.partRole;
    copy.partRefine = this.partRefine;
    copy.displayID = this.displayID;
    copy.name = this.name;
    copy.description = this.description;
    copy.version = this.version;
    copy.sequence = this.sequence;
    copy.uriPrefix = this.uriPrefix;
    return copy;
  }

  copyDataFrom(other: GlyphInfo) {
    this.partType = other.partType;
    this.partRole = other.partRole;
    this.partRefine = other.partRefine;
    this.displayID = other.displayID;
    this.name = other.name;
    this.description = other.description;
    this.version = other.version;
    this.sequence = other.sequence;
    this.uriPrefix = other.uriPrefix;
  }

  getFullURI(): string {
    let fullURI = this.uriPrefix + '/' + this.displayID;
    if(this.version && this.version.length > 0){
      fullURI += '/' + this.version;
    }
    return fullURI;
  }

  encode(enc: any) {
    let node = enc.document.createElement('GlyphInfo');
    if (this.partType)
      node.setAttribute("partType", this.partType);
    if(this.otherTypes){
      let otherTypesNode = enc.encode(this.otherTypes);
      otherTypesNode.setAttribute("as", "otherTypes");
      node.appendChild(otherTypesNode);
    }
    if (this.partRole)
      node.setAttribute("partRole", this.partRole);
    if(this.otherRoles){
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
    if (this.uriPrefix)
      node.setAttribute("uriPrefix", this.uriPrefix);
    

    return node;
  }
}
