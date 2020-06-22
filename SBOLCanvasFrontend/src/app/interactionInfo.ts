export class InteractionInfo {
  // Remember that when you change this you need to change the encode function in graph service
  static counter: number = 0;
  displayID: string;
  interactionType: string;

  constructor() {
    this.displayID = 'Interaction' + (InteractionInfo.counter++);
    this.interactionType = "Yo momma";
  }

  makeCopy() {
    const copy: InteractionInfo = new InteractionInfo();
    copy.displayID = this.displayID;
    copy.interactionType = this.interactionType;
    return copy;
  }

  copyDataFrom(other: InteractionInfo) {
    this.displayID = other.displayID;
    this.interactionType = other.interactionType;
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
    }
    return this;
  }

  encode(enc: any) {
    let node = enc.document.createElement('InteractionInfo');
    if (this.displayID)
      node.setAttribute("displayID", this.displayID);
    if (this.interactionType)
      node.setAttribute("interactionType", this.interactionType);
    return node;
  }
}
