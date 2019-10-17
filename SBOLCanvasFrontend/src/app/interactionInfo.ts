export class InteractionInfo {
  // Remember that when you change this you need to change the encode function in graph service
  static counter: number = 0;
  interactionType: string;
  fromParticipationType: string;
  toParticipationType: string;

  constructor() {
    this.interactionType = 'Inhibition';
  }

  makeCopy() {
    const copy: InteractionInfo = new InteractionInfo();
    copy.interactionType = this.interactionType;
    return copy;
  }

  copyDataFrom(other: InteractionInfo) {
    this.interactionType = other.interactionType;
  }

  encode(enc: any) {
    let node = enc.document.createElement('GlyphInfo');
    if(this.interactionType)
      node.setAttribute("partType", this.interactionType);

    return node;
  }
}
