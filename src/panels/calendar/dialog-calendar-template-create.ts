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

class DialogCalendarTemplateCreate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: CalendarTemplateCreateDialogParams;

  // @state() private _calendarId?: string;

  @state() private _timeIntervals: Array<{ day: string; interval: string }> = [];

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

  private _logState():void {
    console.log("Current Time Intervals State:", this._timeIntervals);
  }
  
  private _addTimeInterval(event: Event) {
    const button = event.target as HTMLElement;
    const day = button.dataset.day as string; // Get the day (e.g., "mon", "tue")
  
    // Prompt the user for a time interval
    const timeInterval = window.prompt(
      `Enter a time interval for ${day.toUpperCase()} (e.g., 14:00-15:00):`
    );
  
    // Validate the input
    if (timeInterval && /^[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}$/.test(timeInterval)) {
      // Save the day and interval to the state
      this._timeIntervals = [
        ...this._timeIntervals,
        { day, interval: timeInterval },
      ];
    } else if (timeInterval) {
      // Alert if the format is invalid
      window.alert("Invalid time format. Please use HH:MM-HH:MM.");
    }
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
              ${["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => {
                // Find all intervals for this day
                const dayIntervals = this._timeIntervals
                  .filter((entry) => entry.day === day)
                  .map((entry) => entry.interval);

                return html`
                  <td>
                    ${dayIntervals.length > 0
                      ? dayIntervals.map(
                          (interval) => html`<span class="time-interval">${interval}</span><br />`
                        )
                      : html`
                          <button
                            class="calendar-button"
                            data-day=${day}
                            @click=${this._addTimeInterval}
                          >
                            Press me
                          </button>
                        `}
                  </td>
                `;
              })}
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
