import { DataTableDirective } from "angular-datatables";
import { HttpErrorResponse } from "@angular/common/http";
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from "@angular/core";

import { Subject } from "rxjs";

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
	private interval?: number;

	public statistics: IStatistics = getEmptyStatistics();
	public processors: IProcessors[] = [];

	public faRefresh = faRefresh;
	public dtTrigger: Subject<any> = new Subject();
	public dtOptions: DataTables.Settings = {
		stateSave: true,
		pageLength: 25,
		order: [[3, "desc"]]
	};

	constructor (
		private readonly alertsService: AlertsService,
		private readonly processorsService: ProcessorsService,
		private readonly statisticsService: StatisticsService
	) { }

	public ngOnInit (): void {
		this.refresh();
		this.interval = setInterval(this.refresh.bind(this), 10000) as any;
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
		if (this.firstLoad)
			this.blockUI?.start();

		this.firstLoad = false;
		this.getProcessors();
		this.getStatistics();
	}

	public getStatistics (): void {
		this.statisticsService.getStatistics().subscribe({
			next: statistics => {
				this.blockUI?.stop();
				this.statistics = statistics;
			},

			error: (error: HttpErrorResponse) => {
				this.blockUI?.stop();
				this.alertsService.httpErrorAlert(
					"Error",
					"Couldn't get statistics",
					error
				);
			}
		});
	}

	public getProcessors (): void {
		this.processorsService.getProcessors().subscribe({
			next: processors => {
				this.processors = processors;
				this.rerenderDatatables();
			},

			error: (error: HttpErrorResponse) => {
				this.alertsService.httpErrorAlert(
					"Error",
					"Couldn't get processors",
					error
				);
			}
		});
	}
}
