import { SearchfilterPipe } from './searchfilter.pipe';

describe('SearchfilterPipe', () => {
  let pipe: SearchfilterPipe;

  beforeEach(() => {
    pipe = new SearchfilterPipe();
  });

  it('returns an empty array when items is null or undefined', () => {
    expect(pipe.transform(null as any, 'x')).toEqual([]);
    expect(pipe.transform(undefined as any, 'x')).toEqual([]);
  });

  it.each([
    ['empty phrase keeps every item',     '',           ['apple', 'banana', 'origin-of-replication']],
    ['case-insensitive prefix match',     'AP',         ['apple']],
    ['matches anywhere in the key',       'plication',  ['origin-of-replication']],
  ])('%s', (_label, phrase, expected) => {
    const items = [{ key: 'apple' }, { key: 'banana' }, { key: 'origin-of-replication' }];
    expect(pipe.transform(items, phrase).map(i => i.key)).toEqual(expected);
  });
});
