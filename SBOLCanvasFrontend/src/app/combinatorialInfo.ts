import { Info } from './info';
import { VariableComponentInfo } from './variableComponentInfo';

export class CombinatorialInfo extends Info{

    static counter: number = 0;

    templateURI: string;    
    version: string;
    strategy: string;
    name: string;
    description: string;
    variableComponents = [];

    constructor(){
        super();
        this.displayID = 'combinatorial' + (CombinatorialInfo.counter++);
    }

    addVariableComponentInfo(variableComponentInfo: VariableComponentInfo){
        this.variableComponents[variableComponentInfo.cellID] = variableComponentInfo;
    }

    getVariableComponentInfo(variable: string): VariableComponentInfo {
        return this.variableComponents[variable];
    }

    setTemplateURI(templateURI: string){
        this.templateURI = templateURI;
    }

    getTemplateURI(): string {
        return this.templateURI;
    }

    makeCopy(): CombinatorialInfo {
        const copy: CombinatorialInfo = new CombinatorialInfo();
        copy.displayID = this.displayID;
        copy.uriPrefix = this.uriPrefix;
        copy.templateURI = this.templateURI;
        copy.version = this.version;
        copy.strategy = this.strategy;
        copy.name = this.name;
        copy.description = this.description;
        for(let key in this.variableComponents){
            copy.variableComponents[key] = this.variableComponents[key].makeCopy();
        }
        return copy;
    }

    copyDataFrom(info: CombinatorialInfo) {
        this.displayID = info.displayID;
        this.uriPrefix = info.uriPrefix;
        this.templateURI = info.templateURI;
        this.version = info.version;
        this.strategy = info.strategy;
        this.name = info.name;
        this.description = info.description;
        this.variableComponents = [];
        for(let key in info.variableComponents){
            this.variableComponents[key] = info.variableComponents[key].makeCopy()
        }
    }

    encode(enc: any) {
        let node = enc.document.createElement('CombinatorialInfo');
        node.setAttribute("displayID", this.displayID);
        node.setAttribute("uriPrefix", this.uriPrefix);
        node.setAttribute("templateURI", this.templateURI);
        node.setAttribute("version", this.version);
        node.setAttribute("strategy", this.strategy);
        node.setAttribute("name", this.name);
        node.setAttribute("description", this.description);
        node.addChild
    }

    getFullURI(): string {
        let fullURI = this.uriPrefix + '/' + this.displayID;
        if (this.version && this.version.length > 0) {
          fullURI += '/' + this.version;
        }
        return fullURI;
    }

}