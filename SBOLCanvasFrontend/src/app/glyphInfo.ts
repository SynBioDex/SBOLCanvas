export class GlyphInfo {
  name: string;
  description: string;

  makeCopy() {
    const copy: GlyphInfo = new GlyphInfo();
    copy.name = this.name;
    copy.description = this.description;
    return copy;
  }

  copyDataFrom(other: GlyphInfo) {
    this.name = other.name;
    this.description = other.description;
  }

}
