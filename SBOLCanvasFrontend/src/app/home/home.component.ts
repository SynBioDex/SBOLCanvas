import {Component, HostListener, OnInit, ViewChild} from '@angular/core';
import {GlyphInfo} from '../glyphInfo';
import {GraphService} from "../graph.service";
import { ToolbarComponent } from "../toolbar/toolbar.component";
import { GlyphMenuComponent } from '../glyph-menu/glyph-menu.component';
import {ComponentCanDeactivate} from '../pending-changes.guard';
import {Observable} from 'rxjs';
import {Title} from "@angular/platform-browser";

export enum KEY_CODE {
  DELETE = "Delete",
  BACKSPACE = "Backspace",
  UNDO = "Undo",
  REDO = "Redo",
}

@Component({
  selector: 'app-sbol-canvas',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, ComponentCanDeactivate {

  @ViewChild(ToolbarComponent) toolbar;
  @ViewChild(GlyphMenuComponent) glyphMenu;
  
  rightBarOpened = true;
  leftBarOpened = true;
  tipsHidden = false;

  constructor(private graphService: GraphService, private titleService: Title) {
    this.titleService.setTitle('SBOL Canvas');
  }

  ngOnInit() {
  }
  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    console.debug(event);
    this.handleEvent(event, event.code);
  }

  @HostListener('window:keydown.control.z', ['$event'])
  onControlZHandler(event: KeyboardEvent) {
    console.debug('Undo');
    console.debug(event);
    this.handleEvent(event, KEY_CODE.UNDO);
  }

  @HostListener('window:keydown.control.shift.z', ['$event'])
  onShiftControlZHandler(event: KeyboardEvent) {
    console.debug('Redo');
    this.handleEvent(event, KEY_CODE.REDO);
  }

  handleEvent(event: KeyboardEvent, code: string) {

    const target = event.target as HTMLElement;

    // If we are not an input field or text area, then we are safe to assume the user is trying to do
    // stuff to the graph.
    if ((target == null || (target.tagName != "INPUT" && target.tagName != "TEXTAREA" && target.tagName != "DIV")) && !this.toolbar.popupOpen) {
      // prevent default actions on keypresses using preventDefault()

      if (code === KEY_CODE.DELETE || code === KEY_CODE.BACKSPACE) {
        this.graphService.delete();
      }
      else if (code == KEY_CODE.UNDO) {
        this.graphService.undo();
      }
      else if (code == KEY_CODE.REDO) {
        this.graphService.redo();
      }
    }
  }

  // @HostListener allows us to also guard against browser refresh, close, etc.
  @HostListener('window:beforeunload')
  canDeactivate(): Observable<boolean> | boolean {
    // insert logic to check if there are pending changes here;
    // returning true will navigate without confirmation
    // returning false will show a confirm dialog before navigating away
    return false;
  }

  zoomSliderChanged($event) {
    this.graphService.setZoom($event.value / 100);
  }

  zoomInputChanged($event) {
    let number = parseInt($event.target.value);
    if (!isNaN(number)) {
      const percent = number / 100;
      this.graphService.setZoom(percent);
    }

    // if they entered nonsense the zoom doesn't change, which
    // means angular won't refresh the input box on its own
    $event.target.value = this.getZoomDisplayValue();
  }

  getZoomSliderValue() {
    return this.graphService.getZoom() * 100;
  }

  getZoomDisplayValue() {
    let percent = this.graphService.getZoom() * 100;
    let string = percent.toFixed(0);
    return string.toString() + '%';
  }

  getViewStack() {
    // console.log(this.glyphMenu.sequenceFeatureDict);
    return this.graphService.viewStack;
  }

  switchView(depth) {
    let levels = this.graphService.viewStack.length - depth - 1;

    for(let i = 0; i < levels; i++) {
      this.graphService.exitGlyph();
    }
  }
}
