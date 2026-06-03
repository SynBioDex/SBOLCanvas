// Direct instantiation; TestBed avoided because of the mxgraph trap in GraphService.
// dialog.open() delegations not tested -- mock-coupling, not coverage (lesson 9).
import { ToolbarComponent } from './toolbar.component';

describe('ToolbarComponent', () => {
  let component: ToolbarComponent;
  let graphService: any;
  let filesService: any;
  let dialog: any;
  let embeddedService: any;

  beforeEach(() => {
    graphService = {
      setZoom: jest.fn(),
      getZoom: jest.fn().mockReturnValue(1),
      isRootAComponentView: jest.fn().mockReturnValue(false),
      resetGraph: jest.fn(),
    };
    filesService = { exportMXGraph: jest.fn() };
    dialog = { open: jest.fn() };
    embeddedService = {};

    component = new ToolbarComponent(graphService, filesService, dialog, embeddedService);
  });

  describe('zoomChanged', () => {
    function event(value: string) {
      return { target: { value } } as any;
    }

    it('parses an integer percent and forwards it to graphService.setZoom as a fraction', () => {
      component.zoomChanged(event('150'));
      expect(graphService.setZoom).toHaveBeenCalledWith(1.5);
    });

    it('ignores non-numeric input and resets the input box to the current zoom display', () => {
      graphService.getZoom.mockReturnValue(0.75);
      const e = event('garbage');
      component.zoomChanged(e);

      expect(graphService.setZoom).not.toHaveBeenCalled();
      expect(e.target.value).toBe('75%');
    });
  });

  it.each([
    [1,     '100%'],
    [0.5,   '50%'],
    [1.337, '134%'], // toFixed(0) rounding
  ])('getZoomDisplayValue formats %f as %s', (zoom, expected) => {
    graphService.getZoom.mockReturnValue(zoom);
    expect(component.getZoomDisplayValue()).toBe(expected);
  });

  describe('newDesign confirmation flow', () => {
    function dialogResolving(answer: string) {
      return { afterClosed: () => ({ toPromise: () => Promise.resolve(answer) }) };
    }

    it.each([
      ['newModuleDesign',    true],
      ['newComponentDesign', false],
    ])('%s resets the graph with the corresponding mode flag when the user confirms', async (method, expectedFlag) => {
      dialog.open.mockReturnValue(dialogResolving('Yes'));
      await (component as any)[method]();
      expect(graphService.resetGraph).toHaveBeenCalledWith(expectedFlag);
    });

    it('cancellation skips the graph reset', async () => {
      dialog.open.mockReturnValue(dialogResolving('Cancel'));
      await component.newModuleDesign();
      expect(graphService.resetGraph).not.toHaveBeenCalled();
    });
  });
});
