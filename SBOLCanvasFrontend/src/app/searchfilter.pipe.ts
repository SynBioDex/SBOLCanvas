import { Injectable, Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'searchfilter'
})

@Injectable()
export class SearchfilterPipe implements PipeTransform {
  transform(items: any[], searchPhrase: string): any[] {
    if (!items) return [];
    return items.filter(it => it.key.toLowerCase().indexOf(searchPhrase.toLowerCase()) !== -1);
  }
}
