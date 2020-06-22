import { ParsedEventType } from '@angular/compiler';
import { CanvasAnnotation } from './canvasAnnotation';

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
  annotations: CanvasAnnotation[];

  constructor(partType?: string) {
    this.displayID = 'id' + (GlyphInfo.counter++);
    if (partType) {
      this.partType = partType;
    } else {
      this.partType = 'DNA region';
    }
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
    copy.uriPrefix = this.uriPrefix;
    copy.annotations = this.annotations ? this.annotations.slice() : null;
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
    this.uriPrefix = other.uriPrefix;
    this.annotations = other.annotations.slice();
  }

  getFullURI(): string {
    let fullURI = this.uriPrefix + '/' + this.displayID;
    if (this.version && this.version.length > 0) {
      fullURI += '/' + this.version;
    }
    return fullURI;
  }

  decode(dec, node, into) {
    const meta = node;
    if (meta != null) {
      for (let i = 0; i < meta.attributes.length; i++) {
        const attrib = meta.attributes[i];
        if (attrib.specified == true && attrib.name != 'as') {
          this[attrib.name] = attrib.value;
        }
      }
      for (let i = 0; i < meta.children.length; i++) {
        const childNode = meta.children[i];
        if (childNode.getAttribute("as") === "otherTypes") {
          this.otherTypes = dec.decode(childNode);
        } else if (childNode.getAttribute("as") === "otherRoles") {
          this.otherRoles = dec.decode(childNode);
        } else if (childNode.getAttribute("as") === "annotations") {
          this.annotations = dec.decode(childNode);
        }
      }
    }
    return this;
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
    if (this.uriPrefix)
      node.setAttribute("uriPrefix", this.uriPrefix);

    if (this.annotations) {
      let annotationsNode = enc.encode(this.annotations);
      annotationsNode.setAttribute("as", "annotations");
      node.appendChild(annotationsNode);
    }

    return node;
  }
}
