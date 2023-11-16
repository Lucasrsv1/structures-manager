import { Component } from "@angular/core";

import { faMagnifyingGlassChart } from "@fortawesome/free-solid-svg-icons";

@Component({
	selector: "app-footer",
	templateUrl: "./footer.component.html",
	styleUrls: ["./footer.component.scss"]
})
export class FooterComponent {
	public faMagnifyingGlassChart = faMagnifyingGlassChart;

	public year = new Date().getFullYear();

	constructor () { }
}
