import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
// import { GraphService } from '../graph.service';
// import * as FileSaver from 'file-saver';

export type ErrorDialogType = 'refusal' | 'error';

export interface ErrorDialogData {
  type: ErrorDialogType;
  message: string;
}

const DIALOG_TITLES: Record<ErrorDialogType, string> = {
  refusal: 'That change is not allowed.',
  error: 'An error has occurred.',
};

@Component({
  selector: 'app-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.css']
})
export class ErrorComponent implements OnInit {

  type: ErrorDialogType = 'error';
  message: string;
  title: string;

  constructor(
    public dialogRef: MatDialogRef<ErrorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: string | ErrorDialogData
  ) {
    if (typeof data === 'string') {
      this.message = data;
    } else if (data) {
      this.type = data.type ?? 'error';
      this.message = data.message ?? String(data);
    }
    this.title = DIALOG_TITLES[this.type];
  }

  ngOnInit() {
  }

  onOkClick(){
    this.dialogRef.close();
  }

//   onDownloadGraphClick(){
//     var file = new File(
//         [this.graphService.getGraphXML()], 
//         "mxgraph.xml"
//     );
//     FileSaver.saveAs(file);
//   }

}
