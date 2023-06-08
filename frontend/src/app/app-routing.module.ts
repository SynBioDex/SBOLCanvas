import { PendingChangesGuard} from './pending-changes.guard';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { LandingPageComponent } from './landing-page/landing-page.component';
import {TutorialComponent} from './tutorial/tutorial.component';

const routes: Routes = [
  { path: '', component: HomeComponent, canDeactivate: [PendingChangesGuard] },
  { path: 'about', component: LandingPageComponent },
  { path: 'tutorial', component: TutorialComponent },
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ],
})
export class AppRoutingModule {}
