import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MailService {

  private api = `${environment.apiBaseUrl}/mail`;

  constructor(private http: HttpClient) {}

  send(data: { to: string; subject: string; message: string }) {

    return this.http.post(`${this.api}/send`, data);

  }

}