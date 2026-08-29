import { customAlphabet } from 'nanoid';
import { alphanumeric } from 'nanoid-dictionary';
import { environment } from 'src/environments/environment';


/**
 * Base class for the canvas info objects (GlyphInfo, ModuleInfo, InteractionInfo,
 * EventInfo, CombinatorialInfo). Identity (uriPrefix + displayID + version) and
 * the display-name rule live here so every type shares one shape.
 */
export abstract class Info{
    uriPrefix: string = environment.baseURI;
    displayID: any;
    version: string;
    name: string;

    /**
     * Generates a displayID as '<prefix>_<8 alphanumeric chars>'. Anything before
     * the first letter is stripped from the prefix, so the result is always
     * NCName-safe (never digit-leading) whatever the caller passes.
     */
    protected static generateID(prefix: string): string {
        const safePrefix = prefix.replace(/^[^a-zA-Z]+/, '') || 'part';
        return safePrefix + '_' + customAlphabet(alphanumeric, 8)();
    }

    getFullURI(): string {
        if (this.uriPrefix == null || this.displayID == null) {
            throw new Error(`Info has null uriPrefix or displayID (uriPrefix=${this.uriPrefix}, displayID=${this.displayID})`);
        }
        let fullURI = this.uriPrefix + '/' + this.displayID;
        if (this.version && this.version.length > 0) {
            fullURI += '/' + this.version;
        }
        return fullURI;
    }

    /** The human-facing label: the name when one is set, else the displayID. */
    getDisplayName(): string {
        return (this.name != null && this.name.trim() != '') ? this.name : this.displayID;
    }

    abstract makeCopy(): Info;
    abstract copyDataFrom(info: Info);
    abstract encode(enc: any);

}