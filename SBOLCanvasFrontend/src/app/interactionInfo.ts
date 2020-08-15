import { Info } from './info';
import { environment } from 'src/environments/environment';

export class InteractionInfo extends Info {
  // Remember that when you change this you need to change the encode function in graph service
  static counter: number = 0;
  interactionType: string;
  fromURI: string;
  toURI: string;

  constructor() {
    super();
    this.displayID = 'Interaction' + (InteractionInfo.counter++);
    this.interactionType = "Yo momma";
  }

  makeCopy() {
    const copy: InteractionInfo = new InteractionInfo();
    copy.displayID = this.displayID;
    copy.interactionType = this.interactionType;
    copy.fromURI = this.fromURI;
    copy.toURI = this.toURI;
    return copy;
  }

  copyDataFrom(other: InteractionInfo) {
    this.displayID = other.displayID;
    this.interactionType = other.interactionType;
    this.fromURI = other.fromURI;
    this.toURI = other.toURI;
  }

  getFullURI() {
    return environment.baseURI + '/' + this.displayID;
  }

  encode(enc: any) {
    let node = enc.document.createElement('InteractionInfo');
    if (this.displayID)
      node.setAttribute("displayID", this.displayID);
    if (this.interactionType)
      node.setAttribute("interactionType", this.interactionType);
    if(this.fromURI)
      node.setAttribute("fromURI", this.fromURI);
    if(this.toURI)
      node.setAttribute("toURI", this.toURI);
    return node;
  }
}
