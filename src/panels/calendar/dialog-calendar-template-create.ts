import "@material/mwc-button";

import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators";
import type { CalendarTemplateCreateDialogParams } from "./show-dialog-calendar-template-create";
import { fireEvent, type HASSDomEvent } from "../../common/dom/fire_event";
import "../../components/entity/state-info";
import "../../components/ha-alert";
import "../../components/ha-date-input";
import "../../components/ha-time-input";
import { haStyleDialog } from "../../resources/styles";
import type { CalendarViewChanged, HomeAssistant } from "../../types";
import "../lovelace/components/hui-generic-entity-row";
import { createCloseHeading } from "../../components/ha-dialog";
import "./ha-template-calendar";
import type { CalendarEventMutableParams } from "../../data/calendar";

class DialogCalendarTemplateCreate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: CalendarTemplateCreateDialogParams;

  // @state() private _calendarId?: string;
  //  private _timeIntervals: { [day: string]: { interval: string; summary: string }[] } = {};

 private _timeIntervals: Record<string, CalendarEventMutableParams[]> = {};


  public async showDialog(
    params: CalendarTemplateCreateDialogParams
  ): Promise<void> {
    this._params = params;
  }

  private closeDialog(): void {
    // this._calendarId = undefined;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _logState(): void {
    console.log("Current Time Intervals State:", this._timeIntervals);
  }
  
  private _addTimeInterval(day: string, interval: string, summary: string): void {
    const [startTime, endTime] = interval.split("-");
    const date = this._getDateFromDay(day); // Convert day to date string
  
    const event: CalendarEventMutableParams = {
      summary,
      dtstart: `${date}T${startTime}:00`, // e.g., "2024-11-20T14:00:00"
      dtend: `${date}T${endTime}:00`, // e.g., "2024-11-20T15:00:00"
    };
  
    if (!this._timeIntervals[day]) {
      this._timeIntervals[day] = [];
    }
  
    this._timeIntervals[day].push(event);
    this.requestUpdate(); // Trigger UI update
    this._logState(); // Optionally log the state
  }
  
  

  

  /* TODO:
   * Add list of already created templates (sidebar thing from design)
   */

  protected render() {
    if (!this._params) {
      return nothing;
    }
    // const stateObj = this.hass.states[this._calendarId!];
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction=${this.closeDialog}
        style="--dialog-content-padding: 24px; width: 1000px; max-width: 90%;"
      >
      <div id="calendar-container">
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
  <tr>
    ${["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
      (day) => html`
        <td>
          <button
            class="calendar-button"
            id="button-${day.toLowerCase()}"
            @click=${() => this._addTimeInterval(day)}
          >
            ${this._timeIntervals[day]?.map(e => `${e.interval} (${e.summary})`).join(", ") || "Press me"}
          </button>
        </td>
      `
    )}
  </tr>
</tbody>

        </table>
      </div>
    `;
  }

  private async _handleViewChanged(
    ev: HASSDomEvent<CalendarViewChanged>
  ): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(ev);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
            #calendar-container {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .custom-calendar {
          border-collapse: collapse;
          width: 90%;
          table-layout: fixed;
          text-align: center;
          font-family: Arial, sans-serif;
        }

        .custom-calendar th {
          background-color: #f9f9f9;
          color: #333;
          font-size: 14px;
          font-weight: bold;
          border-bottom: 2px solid #ddd;
          padding: 10px;
        }

        .custom-calendar td {
          height: 100px;
          border: 1px solid #ddd;
          position: relative;
        }

        .event-dot {
          width: 6px;
          height: 6px;
          background-color: red;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .calendar-button {
          margin-top: 10px;
          padding: 5px 10px;
          font-size: 12px;
          border: 1px solid #ccc;
          background-color: #f0f0f0;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }

        .calendar-button:hover {
          background-color: #ddd;
        }

        .time-interval {
          font-size: 14px;
          font-weight: bold;
          color: #333;
          text-align: center;
          display: block;
          margin-top: 10px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-calendar-template-create": DialogCalendarTemplateCreate;
  }
}

customElements.define(
  "dialog-calendar-template-create",
  DialogCalendarTemplateCreate
);
