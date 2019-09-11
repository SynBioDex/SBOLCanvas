export class GlyphInfo {
  partType: string;
  partRole: string;
  partRefine: string;
  displayID: string;
  name: string;
  description: string;
  version: string;

  makeCopy() {
    const copy: GlyphInfo = new GlyphInfo();
    copy.partType = this.partType;
    copy.partRole = this.partRole;
    copy.partRefine = this.partRefine;
    copy.displayID = this.displayID;
    copy.name = this.name;
    copy.description = this.description;
    copy.version = this.version;
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
  }

}
