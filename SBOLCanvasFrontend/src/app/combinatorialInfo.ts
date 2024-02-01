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

    removeVariableComponentInfo(variable: string){
        delete this.variableComponents[variable];
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
        if(this.displayID)
            node.setAttribute("displayID", this.displayID);
        if(this.uriPrefix)
            node.setAttribute("uriPrefix", this.uriPrefix);
        if(this.templateURI)
            node.setAttribute("templateURI", this.templateURI);
        if(this.version)
            node.setAttribute("version", this.version);
        if(this.strategy)
            node.setAttribute("strategy", this.strategy);
        if(this.name)
            node.setAttribute("name", this.name);
        if(this.description)
            node.setAttribute("description", this.description);
        if(this.variableComponents){
            let varCompsNode = enc.document.createElement('Array');
            varCompsNode.setAttribute("as", 'variableComponents');
            for (let key in this.variableComponents) {
                let varCompNode = enc.encode(this.variableComponents[key]);
                varCompNode.setAttribute("as", this.variableComponents[key].cellID);
                varCompsNode.appendChild(varCompNode);
            }
            node.appendChild(varCompsNode);
        }
        return node;
    }

    getFullURI(): string {
        let fullURI = this.uriPrefix + '/' + this.displayID;
        if (this.version && this.version.length > 0) {
          fullURI += '/' + this.version;
        }
        return fullURI;
    }

}