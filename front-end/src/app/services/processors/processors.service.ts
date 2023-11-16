import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

import { Observable } from "rxjs";

import { environment } from "src/environments/environment";
import { IProcessors } from "src/app/interfaces/processors";

@Injectable({ providedIn: "root" })
export class ProcessorsService {
	constructor (private readonly http: HttpClient) { }

	public getProcessors (): Observable<IProcessors[]> {
		return this.http.get<IProcessors[]>(`${environment.API_URL}/v1/processors`);
	}
}
