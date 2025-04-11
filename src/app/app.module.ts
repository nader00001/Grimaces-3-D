import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FaceDetectorComponent } from './modules/face-detector/face-detector.component';
import { FaceVisualizerComponent } from './modules/face-visualizer/face-visualizer.component';
import { CanvasContainerComponent } from './shared/components/canvas-container/canvas-container.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    FaceDetectorComponent,
    FaceVisualizerComponent,
    CanvasContainerComponent  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
    ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
