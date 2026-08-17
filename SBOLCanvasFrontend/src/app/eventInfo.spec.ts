import { EventInfo } from './eventInfo';

describe('EventInfo', () => {
  it('generates an NCName-safe displayID with the Event_ prefix', () => {
    const info = new EventInfo();
    expect(info.displayID).toMatch(/^Event_[A-Za-z0-9]{8}$/);
    // never starts with a digit (no "i"-guard needed because of the static prefix)
    expect(/^\d/.test(info.displayID)).toBe(false);
  });

  it('gives each event a distinct displayID', () => {
    expect(new EventInfo().displayID).not.toBe(new EventInfo().displayID);
  });

  it('builds getFullURI from uriPrefix and displayID', () => {
    const info = new EventInfo();
    expect(info.getFullURI()).toBe(info.uriPrefix + '/' + info.displayID);
  });

  it('carries name, description, and simulationData through makeCopy as a distinct object', () => {
    const info = new EventInfo();
    info.name = 'My Event';
    info.description = 'desc';
    info.simulationData = { delay: 5, targetSpecies: 'LacI' };

    const copy = info.makeCopy();
    expect(copy).not.toBe(info);
    expect(copy.displayID).toBe(info.displayID);
    expect(copy.name).toBe('My Event');
    expect(copy.description).toBe('desc');
    expect(copy.simulationData).toEqual({ delay: 5, targetSpecies: 'LacI' });
    expect(copy.simulationData).not.toBe(info.simulationData);
  });

  it('copies name and description through copyDataFrom', () => {
    const source = new EventInfo();
    source.name = 'Src';
    source.description = 'd';
    const target = new EventInfo();
    target.copyDataFrom(source);
    expect(target.name).toBe('Src');
    expect(target.description).toBe('d');
    expect(target.displayID).toBe(source.displayID);
  });

  it('encodes name and description as attributes only when set', () => {
    const info = new EventInfo();
    info.name = 'Trigger A';
    info.simulationData = { delay: 2 };
    const node = info.encode({ document });
    expect(node.getAttribute('name')).toBe('Trigger A');
    expect(node.hasAttribute('description')).toBe(false);

    const blank = new EventInfo();
    const blankNode = blank.encode({ document });
    expect(blankNode.hasAttribute('name')).toBe(false);
  });
});
