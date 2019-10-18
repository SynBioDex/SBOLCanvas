export class InteractionInfo {
  // Remember that when you change this you need to change the encode function in graph service
  static counter: number = 0;
  displayID: string;
  interactionType: string;
  fromParticipationType: string;
  toParticipationType: string;

  constructor() {
    this.displayID = 'id'+(InteractionInfo.counter++);
    this.interactionType = 'Inhibition';
  }

  makeCopy() {
    const copy: InteractionInfo = new InteractionInfo();
    copy.displayID = this.displayID;
    copy.interactionType = this.interactionType;
    copy.fromParticipationType = this.fromParticipationType;
    copy.toParticipationType = this.toParticipationType;
    return copy;
  }

  copyDataFrom(other: InteractionInfo) {
    this.displayID = other.displayID;
    this.interactionType = other.interactionType;
    this.fromParticipationType = other.fromParticipationType;
    this.toParticipationType = other.toParticipationType;
  }

  encode(enc: any) {
    let node = enc.document.createElement('InteractionInfo');
    if(this.displayID)
      node.setAttribute("displayID", this.displayID);
    if(this.interactionType)
      node.setAttribute("interactionType", this.interactionType);
    if(this.fromParticipationType)
      node.setAttribute("fromParticipationType", this.fromParticipationType);
    if(this.toParticipationType)
      node.setAttribute("toParticipationType", this.toParticipationType);
    return node;
  }
}
