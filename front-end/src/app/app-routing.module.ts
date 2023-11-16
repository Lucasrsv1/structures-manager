import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { HomeComponent } from "./pages/home/home.component";

const routes: Routes = [
	// Public
	{ path: "home", component: HomeComponent },

	// No match
	{ path: "**", redirectTo: "home" }
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule { }
