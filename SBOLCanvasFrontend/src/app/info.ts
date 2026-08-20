import { customAlphabet } from 'nanoid';
import { alphanumeric } from 'nanoid-dictionary';
import { environment } from 'src/environments/environment';


/**
 * Base class for GlyphInfo InteractionInfo and ModuleInfo
 */
export abstract class Info{
    uriPrefix: string = environment.baseURI;
    displayID: any;

    /**
     * Generates a displayID as '<prefix>_<8 alphanumeric chars>'. The letter
     * prefix keeps the result NCName-safe (never digit-leading) without a guard.
     */
    protected static generateID(prefix: string): string {
        return prefix + '_' + customAlphabet(alphanumeric, 8)();
    }

    abstract makeCopy(): Info;
    abstract copyDataFrom(info: Info);
    abstract encode(enc: any);
    abstract getFullURI(): string;

}