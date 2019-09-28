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
  sequence: string;

  constructor() {
    this.displayID = 'id'+(GlyphInfo.counter++);
    this.partType = 'DNA region';
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
  }

}
