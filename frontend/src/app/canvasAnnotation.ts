
export class CanvasAnnotation {
  namespaceURI: string;
  localPart: string;
  prefix: string;
  nestedNamespaceURI: string;
  nestedLocalPart: string;
  nestedPrefix: string;
  nestedURI: string;
  stringValue: string;
  uriValue: string;
  annotations: CanvasAnnotation[];

  encode(enc: any) {
    let node = enc.document.createElement('CanvasAnnotation');
    if (this.namespaceURI)
      node.setAttribute("namespaceURI", this.namespaceURI);
    if (this.localPart)
      node.setAttribute("localPart", this.localPart);
    if (this.prefix)
      node.setAttribute("prefix", this.prefix);
    if(this.nestedNamespaceURI)
      node.setAttribute("nestedNamespaceURI", this.nestedNamespaceURI);
    if(this.nestedLocalPart)
      node.setAttribute("nestedLocalPart", this.nestedLocalPart);
    if(this.nestedPrefix)
      node.setAttribute("nestedPrefix", this.nestedPrefix);
    if(this.nestedURI) 
      node.setAttribute("nestedURI", this.nestedURI);
    if (this.stringValue)
      node.setAttribute("stringValue", this.stringValue);
    if (this.uriValue)
      node.setAttribute("uriValue", this.uriValue);
    if (this.annotations) {
      let annotationsNode = enc.encode(this.annotations);
      annotationsNode.setAttribute("as", "annotations");
      node.appendChild(annotationsNode);
    }

    return node;
  }

}