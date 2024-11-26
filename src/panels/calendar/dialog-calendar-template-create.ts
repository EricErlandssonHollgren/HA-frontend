import "@material/mwc-button";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button-toggle-group";
import "../../components/ha-fab";
import { mdiClose } from "@mdi/js";
import "../../components/ha-icon-button-next";
import "../../components/ha-icon-button-prev";
import { haStyle } from "../../resources/styles";
import type { CalendarViewChanged, HomeAssistant } from "../../types";
import { showCalendarEventEditTemplateDialog } from "./show-dialog-calendar-event-editor-template";
import type { CalendarTemplateCreateDialogParams } from "./show-dialog-calendar-template-create";
import type {
  CalendarTemplateViewEventItem,
  CalendarTemplateEvents,
} from "../../data/calendar";

@customElement("dialog-calendar-template-create")
export class DialogCalendarTemplateCreate extends LitElement {
  public hass!: HomeAssistant;

  @state() private _params?: CalendarTemplateCreateDialogParams;

  @state() private _calendarEvents: CalendarTemplateViewEventItem[] = [];

  public async showDialog(
    params: CalendarTemplateCreateDialogParams
  ): Promise<void> {
    this._params = params;
  }

  private closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  private _openModal(day: string): void {
    showCalendarEventEditTemplateDialog(this, {
      updated: (events: CalendarTemplateViewEventItem[]) => {
        this._updateCalendarEvents(events);
      },
      day,
    });
  }

  private _updateCalendarEvents(events: CalendarTemplateViewEventItem[]): void {
    this._calendarEvents = events;
  }

  private _convertIntDayToString(dayNumber: number): string {
    const daysArray: string[] = [
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
      "sun",
    ];

    if (dayNumber >= 0 && dayNumber <= 6) {
      return daysArray[dayNumber];
    }

    throw new Error(
      `Invalid day number: ${dayNumber}. Must be between 0 and 6.`
    );
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    return html`
      <div class="dialog-backdrop"></div>
      <dialog
        class="full-dialog"
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction=${this.closeDialog}
      >
        <div class="header">
          <h1 class="header-text">Create template</h1>
          <ha-icon-button
            .label=${this.hass?.localize("ui.dialogs.generic.close") ?? "Close"}
            .path=${mdiClose}
            @click=${this.closeDialog}
            class="header-button"
          ></ha-icon-button>
        </div>
        <table class="custom-calendar">
          <thead>
            <tr>
              <th>MON</th>
              <th>TUE</th>
              <th>WED</th>
              <th>THU</th>
              <th>FRI</th>
              <th>SAT</th>
              <th>SUN</th>
            </tr>
          </thead>
          <tbody>
            <tr class="weekday-column">
              ${["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => {
                const dayEvents = this._calendarEvents
                  .filter((event) =>
                    this._convertIntDayToString(event.weekday_int).startsWith(
                      day
                    )
                  )
                  .sort((a, b) => a.start_time.localeCompare(b.start_time)); // Sort by start_time

                return html`
                  <td>
                    ${dayEvents.length > 0
                      ? dayEvents.map(
                          (event) => html`
                            <button class="event">
                              <div>
                                <strong>${event.summary}</strong><br />
                                ${event.start_time} - ${event.end_time}<br />
                              </div>
                            </button>
                          `
                        )
                      : html` <div class="no-events">No events</div> `}
                    <button
                      class="calendar-button"
                      @click=${() => this._openModal(day)}
                    >
                      Add event
                    </button>
                  </td>
                `;
              })}
            </tr>
          </tbody>
        </table>
      </dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .full-dialog {
          z-index: 8;
          width: fit-content;
          height: 90%;
          box-sizing: border-box;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border: 1px;
          border-radius: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .dialog-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.5);
          z-index: 7;
        }

        .custom-calendar {
          width: 100%;
          max-width: 600px;
          border-collapse: collapse;
        }

        thead th,
        tbody td {
          text-align: center;
          padding: 4px;
          box-sizing: border-box;
          overflow-wrap: break-word;
        }

        .weekday-column td {
          width: calc(100% / 7);
          vertical-align: top;
        }

        button.event {
          margin-bottom: 8px;
          padding: 8px;
          width: 100px;
          height: fit-content;
          border: 1px;
          border-radius: 10px;
        }

        button.calendar-button {
          margin-top: 8px;
          width: 60px;
          height: 40px;
          border: 1px;
          border-radius: 30px;
          box-sizing: border-box;
          background-color: #03a9fa;
          color: white;
        }

        div.no-events {
          font-size: 14px;
          color: gray;
          text-align: center;
        }
        .header-text {
          padding: 0;
          margin: 0;
          align-content: center;
        }
        .header-button {
          padding: 0;
          margin: 0;
        }
        .header {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          padding: 0 24px 12px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-calendar-template-create": DialogCalendarTemplateCreate;
  }
  interface HASSDomEvents {
    "view-changed": CalendarViewChanged;
    "calendar-events-updated": { events: CalendarTemplateEvents };
  }
}
