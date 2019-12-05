import {Component, HostListener, OnInit, ViewChild} from '@angular/core';
import {GlyphInfo} from '../glyphInfo';
import {GraphService} from "../graph.service";
import { ToolbarComponent } from "../toolbar/toolbar.component";
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

  @ViewChild(ToolbarComponent) toolbar

  rightBarOpened = true;
  leftBarOpened = true;

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
}
