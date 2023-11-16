import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

import { Observable } from "rxjs";

import { environment } from "src/environments/environment";
import { IStatistics } from "src/app/interfaces/statistics";

@Injectable({ providedIn: "root" })
export class StatisticsService {
	constructor (private readonly http: HttpClient) { }

	public getStatistics (): Observable<IStatistics> {
		return this.http.get<IStatistics>(`${environment.API_URL}/v1/structures/count`);
	}
}
