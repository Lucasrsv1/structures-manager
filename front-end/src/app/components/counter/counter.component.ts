import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";

import { BehaviorSubject } from "rxjs";

@Component({
	selector: "app-counter",
	templateUrl: "./counter.component.html",
	styleUrls: ["./counter.component.scss"]
})
export class CounterComponent implements OnChanges {
	@Input({ required: true })
	public target = 0;

	@Input()
	public duration = 1300;

	public currentValue: BehaviorSubject<number> = new BehaviorSubject(0);

	private frameRate = 1000 / 30;
	private interval?: number;

	constructor () {}

	public ngOnChanges (_: SimpleChanges): void {
		clearInterval(this.interval);

		const qtySteps = this.duration / this.frameRate;
		const target = this.target;
		const step = (target - this.currentValue.getValue()) / qtySteps;

		this.interval = window.setInterval(() => {
			if (step > 0)
				this.currentValue.next(Math.min(target, this.currentValue.getValue() + step));
			else
				this.currentValue.next(Math.max(target, this.currentValue.getValue() + step));

			if (Math.abs(this.currentValue.getValue() - target) < 0.1)
				clearInterval(this.interval);
		}, this.frameRate);
	}
}
