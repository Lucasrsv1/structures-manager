import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";

import { BlockUIModule } from "ng-block-ui";
import { CollapseModule } from "ngx-bootstrap/collapse";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

import { CounterComponent } from "./counter/counter.component";
import { FooterComponent } from "./footer/footer.component";
import { HeaderComponent } from "./header/header.component";

@NgModule({
	declarations: [
		CounterComponent,
		FooterComponent,
		HeaderComponent
	],
	imports: [
		BrowserModule,
		RouterModule,
		BlockUIModule.forRoot(),
		CollapseModule.forRoot(),
		BrowserAnimationsModule,
		FontAwesomeModule
	],
	exports: [
		CounterComponent,
		FooterComponent,
		HeaderComponent
	]
})
export class ComponentsModule { }
