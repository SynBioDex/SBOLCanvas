import { Info } from './info';
import { environment } from 'src/environments/environment';

export class InteractionInfo extends Info {
  // Remember that when you change this you need to change the encode function in graph service
  static counter: number = 0;
  interactionType: string;
  sourceRefinement: {};
  targetRefinement: {};
  fromURI: {};
  toURI: {};

  constructor() {
    super();
    this.displayID = 'Interaction' + (InteractionInfo.counter++);
    this.interactionType;
    this.sourceRefinement = {};
    this.targetRefinement = {};
    this.fromURI = {};
    this.toURI = {};
  }

  makeCopy() {
    const copy: InteractionInfo = new InteractionInfo();
    copy.displayID = this.displayID;
    copy.interactionType = this.interactionType;
    for(let key in this.sourceRefinement){
      copy.sourceRefinement[key] = this.sourceRefinement[key];
    }
    for(let key in this.targetRefinement){
      copy.targetRefinement[key] = this.targetRefinement[key];
    }
    for(let key in this.fromURI){
      copy.fromURI[key] = this.fromURI[key];
    }
    for(let key in this.toURI){
      copy.toURI[key] = this.toURI[key];
    }
    return copy;
  }

  copyDataFrom(other: InteractionInfo) {
    this.displayID = other.displayID;
    this.interactionType = other.interactionType;
    for(let key in other.sourceRefinement){
      this.sourceRefinement[key] = other.sourceRefinement[key];
    }
    for(let key in other.targetRefinement){
      this.targetRefinement[key] = other.targetRefinement[key];
    }
    for(let key in other.fromURI){
      this.fromURI[key] = other.fromURI[key];
    }
    for(let key in other.toURI){
      this.toURI[key] = other.toURI[key];
    }
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
