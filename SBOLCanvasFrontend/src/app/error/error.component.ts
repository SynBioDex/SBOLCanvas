import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
// import { GraphService } from '../graph.service';
// import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.css']
})
export class ErrorComponent implements OnInit {

  message: string;
  hasDetails: boolean;

  constructor(
    public dialogRef: MatDialogRef<ErrorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
    ) { this.message = data; this.hasDetails = /<[a-z!][^>]*>/i.test(String(data)); }

  ngOnInit() {
  }

  onOkClick(){
    this.dialogRef.close();
  }

  fitFrame(frame: HTMLIFrameElement) {
    const body = frame.contentDocument?.body;
    if (body) frame.style.height = Math.min(body.scrollHeight + 16, 400) + 'px';
  }

//   onDownloadGraphClick(){
//     var file = new File(
//         [this.graphService.getGraphXML()], 
//         "mxgraph.xml"
//     );
//     FileSaver.saveAs(file);
//   }

}
