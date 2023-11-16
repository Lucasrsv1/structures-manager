import { Component } from "@angular/core";

import {
	faBars,
	faGripHorizontal,
	faMagnifyingGlassChart
} from "@fortawesome/free-solid-svg-icons";

@Component({
	selector: "app-header",
	templateUrl: "./header.component.html",
	styleUrls: ["./header.component.scss"]
})
export class HeaderComponent {
	public faBars = faBars;
	public faMagnifyingGlassChart = faMagnifyingGlassChart;
	public faGripHorizontal = faGripHorizontal;

	public isMenuCollapsed = true;

	constructor () { }
}
