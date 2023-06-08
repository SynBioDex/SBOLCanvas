import { Info } from './info';
import { environment } from 'src/environments/environment';

export class InteractionInfo extends Info {
  // Remember that when you change this you need to change the encode function in graph service
  static counter: number = 0;
  interactionType: string;

  // treat these as dictionaries, not arrays
  sourceRefinement = [];
  targetRefinement = [];
  fromURI = [];
  toURI = [];

  constructor() {
    super();
    this.displayID = 'Interaction' + (InteractionInfo.counter++);
  }

  makeCopy() {
    const copy: InteractionInfo = new InteractionInfo();
    copy.displayID = this.displayID;
    copy.uriPrefix = this.uriPrefix;
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
    this.uriPrefix = other.uriPrefix;
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
    return this.uriPrefix + '/' + this.displayID;
  }

  encode(enc: any) {
    let node = enc.document.createElement('InteractionInfo');
    if (this.displayID)
      node.setAttribute("displayID", this.displayID);
    if (this.interactionType)
      node.setAttribute("interactionType", this.interactionType);
    if(this.uriPrefix)
      node.setAttribute("uriPrefix", this.uriPrefix);
    if(this.sourceRefinement){
      let sourceRefinementNode = enc.document.createElement('Array');
      sourceRefinementNode.setAttribute("as", "sourceRefinement");
      for (let key in this.sourceRefinement) {
        let sourceRefNode = enc.document.createElement("add");
        sourceRefNode.setAttribute("value", this.sourceRefinement[key]);
        sourceRefNode.setAttribute("as", key);
        sourceRefinementNode.appendChild(sourceRefNode);
      }
      node.appendChild(sourceRefinementNode);
    }
    if(this.targetRefinement){
      let targetRefinementNode = enc.document.createElement("Array");
      targetRefinementNode.setAttribute("as", "targetRefinement");
      for(let key in this.targetRefinement){
        let targetRefNode = enc.document.createElement("add");
        targetRefNode.setAttribute("value", this.targetRefinement[key]);
        targetRefNode.setAttribute("as", key);
        targetRefinementNode.appendChild(targetRefNode);
      }
      node.appendChild(targetRefinementNode);
    }
    if(this.fromURI){
      let fromURINode = enc.document.createElement("Array");
      fromURINode.setAttribute("as", "fromURI");
      for(let key in this.fromURI){
        let URINode = enc.document.createElement("add");
        URINode.setAttribute("value", this.fromURI[key]);
        URINode.setAttribute("as", key);
        fromURINode.appendChild(URINode);
      }
      node.appendChild(fromURINode);
    }
    if(this.toURI){
      let toURINode = enc.document.createElement("Array");
      toURINode.setAttribute("as", "toURI");
      for(let key in this.toURI){
        let URINode = enc.document.createElement("add");
        URINode.setAttribute("value", this.toURI[key]);
        URINode.setAttribute("as", key);
        toURINode.appendChild(URINode);
      }
      node.appendChild(toURINode);
    }
    return node;
  }
}
