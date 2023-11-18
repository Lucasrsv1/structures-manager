import { DataTableDirective } from "angular-datatables";
import { HttpErrorResponse } from "@angular/common/http";
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from "@angular/core";

import { forkJoin, Subject } from "rxjs";

import { faRefresh } from "@fortawesome/free-solid-svg-icons";
import { BlockUI, NgBlockUI } from "ng-block-ui";

import { IProcessors } from "src/app/interfaces/processors";
import { getEmptyStatistics, IStatistics } from "src/app/interfaces/statistics";

import { AlertsService } from "src/app/services/alerts/alerts.service";
import { ProcessorsService } from "src/app/services/processors/processors.service";
import { StatisticsService } from "src/app/services/statistics/statistics.service";

@Component({
	selector: "app-home",
	templateUrl: "./home.component.html",
	styleUrls: ["./home.component.scss"]
})
export class HomeComponent implements AfterViewInit, OnInit, OnDestroy {
	@BlockUI()
	private blockUI?: NgBlockUI;

	@ViewChild(DataTableDirective, { static: true })
	private dataTable?: DataTableDirective;

	private firstLoad = true;
	private refreshing = false;
	private interval?: number;

	public statistics: IStatistics = getEmptyStatistics();
	public processors: IProcessors[] = [];

	public faRefresh = faRefresh;
	public dtTrigger: Subject<any> = new Subject();
	public dtOptions: DataTables.Settings = {
		stateSave: true,
		pageLength: 25,
		order: [[4, "desc"]]
	};

	constructor (
		private readonly alertsService: AlertsService,
		private readonly processorsService: ProcessorsService,
		private readonly statisticsService: StatisticsService
	) { }

	public ngOnInit (): void {
		this.refresh();
		this.interval = setInterval(this.refresh.bind(this), 5000) as any;
	}

	public ngAfterViewInit (): void {
		this.dtTrigger.next(this.dtOptions);
	}

	public ngOnDestroy (): void {
		this.dtTrigger.unsubscribe();
		clearInterval(this.interval);
	}

	public rerenderDatatables (): void {
		this.dataTable?.dtInstance.then((dtInstance: DataTables.Api) => {
			dtInstance.destroy();
			this.dtTrigger.next(this.dtOptions);
		});
	}

	public refresh (): void {
		if (this.refreshing) return;

		if (this.firstLoad)
			this.blockUI?.start();

		this.firstLoad = false;
		this.refreshing = true;

		forkJoin([
			this.processorsService.getProcessors(),
			this.statisticsService.getStatistics()
		]).subscribe({
			next: ([processors, statistics]) => {
				this.blockUI?.stop();
				this.processors = processors;
				this.statistics = statistics;

				const now = Date.now();
				for (const processor of this.processors) {
					if (processor.lastContact >= now - 70000)
						processor.statusClass = "text-bg-success";
					else if (processor.lastContact >= now - 140000)
						processor.statusClass = "text-bg-warning";
					else
						processor.statusClass = "text-bg-danger";
				}

				this.refreshing = false;
				this.rerenderDatatables();
			},

			error: (error: HttpErrorResponse) => {
				console.error("Error:", error);
				this.blockUI?.stop();
				this.refreshing = false;
				this.alertsService.httpErrorAlert(
					"Error",
					"Couldn't update the statistics.",
					error
				);
			}
		});
	}
}
