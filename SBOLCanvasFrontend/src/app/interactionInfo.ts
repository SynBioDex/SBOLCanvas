import { Info, valueType } from './info';
import type { mxCell } from 'src/mxgraph';

export type ParticipantSide = 'source' | 'target';

export function typeFollowsEndpoints(type: string): boolean {
  return type === 'Biochemical Reaction' || type === 'Genetic Production';
}

export function processEdgeType(source: mxCell, target: mxCell): string {
  return source && source.isSequenceFeatureGlyph() ? 'Genetic Production' : 'Biochemical Reaction';
}

export class InteractionInfo extends Info {
  interactionType: string;

  // treat these as dictionaries, not arrays
  sourceRefinement: Record<string, string> = {};
  targetRefinement: Record<string, string> = {};
  sourceCoefficient: Record<string, number> = {};
  targetCoefficient: Record<string, number> = {};
  fromURI: Record<string, string> = {};
  toURI: Record<string, string> = {};
  simulationData: Record<string, number | string | boolean> = {};

  constructor() {
    super();
    // no version: libSBOLj's createInteraction has no version overload, so
    // interaction identities are versionless in the SBOL we write
    this.displayID = Info.generateID('Interaction');
  }

  makeCopy() {
    const copy: InteractionInfo = new InteractionInfo();
    copy.displayID = this.displayID;
    copy.version = this.version;
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
    copy.sourceCoefficient = { ...this.sourceCoefficient };
    copy.targetCoefficient = { ...this.targetCoefficient };
    for(let key in this.simulationData){
      copy.simulationData[key] = this.simulationData[key];
    }
    return copy;
  }

  encode(enc: any) {
    let node = enc.document.createElement('InteractionInfo');
    if (this.displayID)
      node.setAttribute("displayID", this.displayID);
    if (this.version && this.version.length > 0)
      node.setAttribute("version", this.version);
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
    for (const field of ['sourceCoefficient', 'targetCoefficient']) {
      const values = enc.document.createElement('Array');
      values.setAttribute('as', field);
      for (const key in this[field]) {
        const entry = enc.document.createElement('add');
        entry.setAttribute('value', this[field][key]);
        entry.setAttribute('as', key);
        entry.setAttribute('type', valueType(this[field][key]));
        values.appendChild(entry);
      }
      node.appendChild(values);
    }
    if (this.simulationData) {
      let simulationDataNode = enc.document.createElement("Array");
      simulationDataNode.setAttribute("as", "simulationData");
      for (let key in this.simulationData) {
        let dataNode = enc.document.createElement("add");
        dataNode.setAttribute("value", this.simulationData[key]);
        dataNode.setAttribute("as", key);
        dataNode.setAttribute("type", valueType(this.simulationData[key]));
        simulationDataNode.appendChild(dataNode);
      }
      node.appendChild(simulationDataNode);
    }
    return node;
  }
}
