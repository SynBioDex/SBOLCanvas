import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
// import { GraphService } from '../graph.service';
// import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.css']
})
export class ErrorComponent implements OnInit {

  message: string;
  

  constructor(
    public dialogRef: MatDialogRef<ErrorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
    ) { this.message = data; }

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
