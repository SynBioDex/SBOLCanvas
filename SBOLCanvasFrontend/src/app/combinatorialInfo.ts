import { Info } from './info';

export class CombinatorialInfo extends Info{

    templateURI: string;    
    version: string;


    makeCopy(): Info {
        const copy: CombinatorialInfo = new CombinatorialInfo();
        copy.displayID = this.displayID;
        copy.uriPrefix = this.uriPrefix;
        return copy;
    }

    copyDataFrom(info: Info) {
        this.displayID = info.displayID;
        this.uriPrefix = info.uriPrefix;
    }

    encode(enc: any) {
        let node = enc.document.createElement('CombinatorialInfo');
        node.setAttribute("templateURI", this.templateURI);
    }

    getFullURI(): string {
        let fullURI = this.uriPrefix + '/' + this.displayID;
        if (this.version && this.version.length > 0) {
          fullURI += '/' + this.version;
        }
        return fullURI;
    }

}