// import factory from 'mxgraph';

// declare global {
//     interface Window {
//       mxBasePath: string;
//       mxImageBasePath: string;
//     }
//   }
  
// // declare var require: any;
// // export const mx = require('mxgraph')({
// //     mxImageBasePath: './../assets/mxgraph/images',
// //     mxBasePath: '../../assets/mxgraph'
// // });

// (window as any)['mxBasePath'] = 'assets/mxgraph';

// export default factory({
//   // not working see https://github.com/jgraph/mxgraph/issues/479
//   mxBasePath: 'assets',
//   //mxImageBasePath : 'assets/images'
// });
import factory from 'mxgraph';

declare global {
  interface Window {
    mxBasePath: string;
    //mxImageBasePath: string;
    mxLoadResources: boolean;
    mxForceIncludes: boolean;
    mxLoadStylesheets: boolean;
    mxResourceExtension: string;
  }
}

window.mxBasePath = '../../assets/mxgraph';
//window.mxImageBasePath = '../../assets/mxgraph/images'
window.mxLoadResources = true;
window.mxForceIncludes = false;
window.mxLoadStylesheets = true;
window.mxResourceExtension = '.txt';

export default factory.call(window, {
  // not working see https://github.com/jgraph/mxgraph/issues/479
  mxBasePath: '../../assets/mxgraph',
//  mxImageBsePath: '../../assets/mxgraph/images'
});