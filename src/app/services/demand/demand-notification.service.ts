import { inject, Injectable } from '@angular/core';

import {
  Observable,
  catchError,
  forkJoin,
  from,
  map,
  mergeMap,
  of,
  reduce,
  retry,
  switchMap,
  timer,
  timeout,
} from 'rxjs';

import { User } from '../../models/user';
import { EmailService } from '../../core/services/email.service';
import { UsersService } from '../users.service';
import { ProgramService } from '../program.service';

export type DemandNotificationAction =
  | 'CITATION'
  | 'ATTENDANCE'
  | 'FEEDBACK'
  | 'REFERENCE'
  | 'CLOSURE'
  | 'DOCUMENT'
  | 'OBSERVATION';

type CommunicationFlag =
  | 'canReceiveCitations'
  | 'canReceiveAttendances'
  | 'canReceiveFeedback'
  | 'canReceiveReferences'
  | 'canReceiveClosures'
  | 'canReceiveDocuments'
  | 'canReceiveObservations';

interface CommunicationRelation {
  id: number | null;
  userId: number | null;
  programId: number | null;

  canReceiveCitations: boolean;
  canReceiveAttendances: boolean;
  canReceiveFeedback: boolean;
  canReceiveReferences: boolean;
  canReceiveClosures: boolean;
  canReceiveDocuments: boolean;
  canReceiveObservations: boolean;
}

export interface DemandNotificationRecipient {
  userId: number;
  name: string;
  email: string;
}

export interface DemandNotificationDispatchResult {
  requested: number;
  sent: number;
  failed: number;
  recipients: string[];
}

@Injectable({
  providedIn: 'root',
})
export class DemandNotificationService {
  private readonly usersService = inject(UsersService);
  private readonly emailService = inject(EmailService);
  private readonly programService = inject(ProgramService);

  private readonly actionFlagMap: Record<
    DemandNotificationAction,
    CommunicationFlag
  > = {
    CITATION: 'canReceiveCitations',
    ATTENDANCE: 'canReceiveAttendances',
    FEEDBACK: 'canReceiveFeedback',
    REFERENCE: 'canReceiveReferences',
    CLOSURE: 'canReceiveClosures',
    DOCUMENT: 'canReceiveDocuments',
    OBSERVATION: 'canReceiveObservations',
  };

  /**
   * Obtiene los funcionarios de un programa que tienen habilitada
   * la recepción de correo para una acción determinada.
   */
  getRecipients(
    programId: number,
    action: DemandNotificationAction,
  ): Observable<DemandNotificationRecipient[]> {
    const numericProgramId = Number(programId);

    if (!Number.isFinite(numericProgramId) || numericProgramId <= 0) {
      return of([]);
    }

    return this.usersService
      .getCommunicationRecipients(numericProgramId, action)
      .pipe(
        map((relations: any[]) => {
          const recipients = (relations ?? [])
            .map((relation: any) => {
              const user = relation?.user as User | null | undefined;
              const userId = Number(
                relation?.userId ??
                  user?.id,
              );

              const email = this.normalizeEmail(user?.email);

              if (
                !Number.isFinite(userId) ||
                userId <= 0 ||
                !user ||
                user.deletedAt ||
                !email
              ) {
                return null;
              }

              return {
                userId,
                name: this.formatUserName(user),
                email,
              } as DemandNotificationRecipient;
            })
            .filter(
              (
                recipient: DemandNotificationRecipient | null,
              ): recipient is DemandNotificationRecipient =>
                recipient !== null,
            );

          return this.uniqueRecipients(recipients);
        }),

        catchError((error) => {
          console.error(
            '[DemandNotificationService] Error obteniendo destinatarios',
            {
              programId: numericProgramId,
              action,
              error,
            },
          );

          return of([]);
        }),
      );
  }
  /**
   * Envío automático para las acciones que no muestran
   * destinatarios al usuario.
   *
   * Cada destinatario genera una llamada independiente
   * al servicio de correo.
   */
  sendAutomatic(
    programId: number,
    action: Exclude<DemandNotificationAction, 'REFERENCE'>,
    subject: string,
    message: string,
  ): Observable<DemandNotificationDispatchResult> {
    return forkJoin({
      recipients: this.getRecipients(
        programId,
        action,
      ),

      program: this.programService
        .findById(programId)
        .pipe(
          catchError((error) => {
            console.error(
              '[DemandNotificationService] No fue posible obtener el correo institucional del programa.',
              {
                programId,
                action,
                error,
              },
            );

            return of(null);
          }),
        ),
    }).pipe(
      map(({ recipients, program }) =>
        this.normalizeEmails([
          ...recipients.map(
            (recipient) => recipient.email,
          ),
          program?.email ?? '',
        ]),
      ),

      switchMap((emails) =>
        this.sendEmailsInParallel(
          emails,
          subject,
          message,
          action,
          programId,
        ),
      ),
    );
  }

  /**
   * Envío explícito a una lista determinada.
   *
   * Se utilizará en REFERENCIA:
   * - destinatarios REF. cargados automáticamente;
   * - correos adicionales agregados por el usuario;
   * - una sola acción "Confirmar referencia".
   */
  sendToEmails(
    emails: string[],
    subject: string,
    message: string,
  ): Observable<DemandNotificationDispatchResult> {
    return this.sendEmailsInParallel(
      this.normalizeEmails(emails),
      subject,
      message,
      'REFERENCE',
      null,
    );
  }

  /**
   * Envía exactamente un correo por solicitud.
   *
   * Los destinatarios se procesan secuencialmente para
   * respetar el contrato actual del servicio.
   */
  private sendEmailsInParallel(
    emails: string[],
    subject: string,
    message: string,
    action: DemandNotificationAction,
    programId: number | null,
  ): Observable<DemandNotificationDispatchResult> {
    if (!emails.length) {
      return of({
        requested: 0,
        sent: 0,
        failed: 0,
        recipients: [],
      });
    }

    return from(emails).pipe(
      mergeMap(
        (email) =>
          this.emailService
            .sendNotificationEmail(
              email,
              subject,
              message,
            )
            .pipe(
              timeout(15000),

              retry({
                count: 4,
                delay: (error, retryCount) => {
                  const nextAttempt = retryCount + 1;

                  console.warn(
                    `[DemandNotificationService] Reintento ${nextAttempt}/5 en 15 segundos.`,
                    {
                      email,
                      action,
                      programId,
                      error,
                    },
                  );

                  return timer(15000);
                },
              }),

              map(() => ({
                email,
                sent: true,
              })),

              catchError((error) => {
                console.error(
                  '[DemandNotificationService] No fue posible enviar el correo después de 5 intentos.',
                  {
                    email,
                    action,
                    programId,
                    error,
                  },
                );

                return of({
                  email,
                  sent: false,
                });
              }),
            ),
        3,
      ),

      reduce(
        (result, current) => {
          result.requested++;

          if (current.sent) {
            result.sent++;
          } else {
            result.failed++;
          }

          result.recipients.push(current.email);

          return result;
        },
        {
          requested: 0,
          sent: 0,
          failed: 0,
          recipients: [] as string[],
        },
      ),
    );
  }

  private normalizeRelations(
    relations: any[],
  ): CommunicationRelation[] {
    return (relations ?? []).map((relation) => ({
      id: this.readNumericId(relation?.id),

      userId: this.readNumericId(
        relation?.userId,
        relation?.user?.id,
        relation?.users?.id,
      ),

      programId: this.readNumericId(
        relation?.programId,
        relation?.program?.id,
        relation?.programs?.id,
      ),

      canReceiveCitations:
        relation?.canReceiveCitations === true,

      canReceiveAttendances:
        relation?.canReceiveAttendances === true,

      canReceiveFeedback:
        relation?.canReceiveFeedback === true,

      canReceiveReferences:
        relation?.canReceiveReferences === true,

      canReceiveClosures:
        relation?.canReceiveClosures === true,

      canReceiveDocuments:
        relation?.canReceiveDocuments === true,

      canReceiveObservations:
        relation?.canReceiveObservations === true,
    }));
  }

  private uniqueRecipients(
    recipients: DemandNotificationRecipient[],
  ): DemandNotificationRecipient[] {
    const emails = new Set<string>();

    return recipients.filter((recipient) => {
      const email = this.normalizeEmail(recipient.email);

      if (!email || emails.has(email)) {
        return false;
      }

      emails.add(email);
      recipient.email = email;

      return true;
    });
  }

  private normalizeEmails(values: string[]): string[] {
    return [
      ...new Set(
        (values ?? [])
          .map((email) => this.normalizeEmail(email))
          .filter(Boolean),
      ),
    ];
  }

  private normalizeEmail(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase();
  }

  private readNumericId(...values: unknown[]): number | null {
    for (const value of values) {
      if (
        value === null ||
        value === undefined ||
        value === ''
      ) {
        continue;
      }

      const numeric = Number(value);

      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }

    return null;
  }

  private formatUserName(user: User): string {
    const name = [
      user.firstName,
      user.secondName,
      user.firstLastName,
      user.secondLastName,
    ]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean)
      .join(' ');

    return name || user.username || 'Usuario';
  }
}
