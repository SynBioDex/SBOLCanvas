import { IdentifiedInfo } from './identifiedInfo';

export class VariableComponentInfo {
    uri: string;
    cellID: string;
    operator: string;
    variants: IdentifiedInfo[] = [];

    constructor(cellID?: string){
        if(cellID)
            this.cellID = cellID;
    }

    makeCopy(): VariableComponentInfo {
        const copy: VariableComponentInfo = new VariableComponentInfo(this.cellID);
        copy.uri = this.uri;
        copy.operator = this.operator;
        for(let variant of this.variants){
            copy.variants.push(variant.makeCopy());
        }
        return copy;
    }

    addVariant(info: IdentifiedInfo){
        // avoid duplicates
        for(let variant of this.variants){
            if(variant.uri == info.uri)
                return;
        }
        this.variants.push(info);
    }
}