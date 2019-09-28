export class GlyphInfo {
  // Remember that when you change this you need to change the encode function in graph service
  static counter: number = 0;
  partType: string;
  partRole: string;
  partRefine: string;
  displayID: string;
  name: string;
  description: string;
  version: string;
  model: string;

  constructor(){
    this.displayID = 'id'+(GlyphInfo.counter++);
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
    copy.model = this.model;
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
    this.model = other.model;
  }

  encode(enc: any) {
    let node = enc.document.createElement('GlyphInfo');
    if(this.partType)
      node.setAttribute("partType", this.partType);
    if(this.partRole)
      node.setAttribute("partRole", this.partRole);
    if(this.partRefine)
      node.setAttribute("partRefine", this.partRefine);
    if(this.displayID)
      node.setAttribute("displayID", this.displayID);
    if(this.name)
      node.setAttribute("name", this.name);
    if(this.description)
      node.setAttribute("description", this.description);
    if(this.version)
      node.setAttribute("version", this.version);
    if(this.model)
      node.setAttribute("model", this.model);

    return node;
  }
}
