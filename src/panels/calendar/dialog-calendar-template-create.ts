import "@material/mwc-button";
import {
  addDays,
  addHours,
  addMilliseconds,
  differenceInMilliseconds,
  startOfHour,
  toDate,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import memoizeOne from "memoize-one";
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
// import { createCloseHeading } from "../../components/ha-dialog";
import type { CalendarEventEditTemplateDialogParams } from "./show-dialog-calendar-event-editor-template";
import "./ha-template-calendar";
import { resolveTimeZone } from "../../common/datetime/resolve-time-zone";
import "../../components/ha-formfield";
import "../../components/ha-textarea";
import "../../components/ha-switch";
import { isDate } from "../../common/string/is_date";
import { TimeZone } from "../../data/translation";
import { CalendarTemplateViewEventItem } from "../../data/calendar";

class DialogCalendarTemplateCreate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _calendarEvents: CalendarTemplateViewEventItem[] = [];

  @state() private _error?: string;

  @state() private _info?: string;

  @state() private _params?: CalendarEventEditTemplateDialogParams;

  //  @state() private _calendarId?: string;

  @state() private _summary = "";

  @state() private _description? = "";

  @state() private _allDay = false;

  @state() private _dtstart?: string; // In sync with _data.dtstart

  @state() private _dtend?: string; // Inclusive for display, in sync with _data.dtend (exclusive)

  @state() private _submitting = false;

  // Dates are displayed in the timezone according to the user's profile
  // which may be different from the Home Assistant timezone. When
  // events are persisted, they are relative to the Home Assistant
  // timezone, but floating without a timezone.
  private _timeZone?: string;


  public async showDialog(
    params: CalendarEventEditTemplateDialogParams
  ): Promise<void> {
    this._error = undefined;
    this._info = undefined;
    this._params = params;

    this._timeZone = resolveTimeZone(
      this.hass.locale.time_zone,
      this.hass.config.time_zone
    );
    // if (params.entry) {
    //   const entry = params.entry!;
      // this._allDay = isDate(entry.dtstart);
  //     this._summary = entry.summary;
  //     this._description = entry.description;

  //     // this._dtstart = new Date(entry.dtstart);
  //     // this._dtend = new Date(entry.dtend);
  //     if (this._allDay) {
  //       this._dtstart = new Date(entry.dtstart + "T00:00:00");
  //       // Calendar event end dates are exclusive, but not shown that way in the UI. The
  //       // reverse happens when persisting the event.
  //       this._dtend = addDays(new Date(entry.dtend + "T00:00:00"), -1);
  //     } else {
  //       this._dtstart = new Date(entry.dtstart);
  //       this._dtend = new Date(entry.dtend);
  //     }
  //   } else {
  //     // If we have been provided a selected date (e.g. based on the currently displayed
  //     // day in a calendar view), use that as the starting value.
  //     this._dtstart = startOfHour(
  //       params.selectedDate ? params.selectedDate : new Date()
  //     );
  //     this._dtend = addHours(this._dtstart, 1);
  // }
 }

  private closeDialog(): void {
    // this._calendarId = undefined;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  // private _logState(): void {
  //   console.log("hej");
  // }

  // private _addTimeInterval(event: Event) {
  //   const button = event.target as HTMLElement;
  //   const day = button.dataset.day as string; // Get the day (e.g., "mon", "tue")

  //   // Prompt the user for a time interval
  //   const timeInterval = window.prompt(
  //     `Enter a time interval for ${day.toUpperCase()} (e.g., 14:00-15:00):`
  //   );

  //   // Validate the input
  //   if (
  //     timeInterval &&
  //     /^[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}$/.test(timeInterval)
  //   ) {
  //     // Save the day and interval to the state
  //     this._timeIntervals = [
  //       ...this._timeIntervals,
  //       { day, interval: timeInterval },
  //     ];
  //   } else if (timeInterval) {
  //     // Alert if the format is invalid
  //     window.alert("Invalid time format. Please use HH:MM-HH:MM.");
  //   }
  // }

  /* TODO:
   * Add list of already created templates (sidebar thing from design)
   */

  protected render() {
    if (!this._params) {
      return nothing;
    }
    // const {startTime, endTime } = this._getLocaleStrings(
    //   this._dtstart,
    //   this._dtend
    // );
    // const stateObj = this.hass.states[this._calendarId!];
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction=${this.closeDialog}
        style="--dialog-content-padding: 24px; width: 1000px; max-width: 90%;"
      >
        <div id="content">
          <ha-textfield
            class="summary"
            name="summary"
            .label=${this.hass.localize("ui.components.calendar.event.summary")}
            .value=${this._summary}
            required
            @input=${this._handleSummaryChanged}
            .validationMessage=${this.hass.localize("ui.common.error_required")}
            dialogInitialFocus
          ></ha-textfield>
          <ha-textarea
            class="description"
            name="description"
            .label=${this.hass.localize(
              "ui.components.calendar.event.description"
            )}
            .value=${this._description}
            @change=${this._handleDescriptionChanged}
            autogrow
          ></ha-textarea>
          <ha-formfield
            .label=${this.hass.localize("ui.components.calendar.event.all_day")}
          >
          </ha-formfield>
          <div>
            <span class="label"
              >${this.hass.localize(
                "ui.components.calendar.event.start"
              )}:</span
            >
            <div class="flex">
                <ha-time-input
                    .value=${this._dtstart}
                    .locale=${this.hass.locale}
                    @value-changed=${this._startTimeChanged}
                  ></ha-time-input>
            </div>
          </div>
          <div>
            <span class="label"
              >${this.hass.localize("ui.components.calendar.event.end")}:</span
            >
            <div class="flex">
                <ha-time-input
                    .value=${this._dtend}
                    .locale=${this.hass.locale}
                    @value-changed=${this._endTimeChanged}
                  ></ha-time-input>
            </div>
          </div>
          <mwc-button slot="primaryAction" @click=${this._saveEvent}>
            ${this.hass.localize("ui.components.calendar.event.save")}
          </mwc-button>
        </div>
      </ha-dialog>
    `;
  }

  private _saveEvent(): void {
    // const dtstart = "";
    // const dtend = "";

    // Collect input values from modal fields
    // const summary = (this.shadowRoot!.querySelector("#summary") as HTMLInputElement).value;
    // const dtstart = (this.shadowRoot!.querySelector("#dtstart") as HTMLInputElement).value;
    // const dtend = (this.shadowRoot!.querySelector("#dtend") as HTMLInputElement).value;
    // const rrule = (this.shadowRoot!.querySelector("#rrule") as HTMLInputElement).value;
    // const description = (this.shadowRoot!.querySelector("#description") as HTMLTextAreaElement).value;
    // if (this._allDay) {
    //   dtstart = this._formatDate(this._dtstart!);
    //   // End date/time is exclusive when persisted
    //   dtend = this._formatDate(addDays(this._dtend!, 1));
    // } else {
    //   dtstart = `${this._formatDate(
    //     this._dtstart!,
    //     this.hass.config.time_zone
    //   )}T${this._formatTime(this._dtstart!, this.hass.config.time_zone)}`;
    //   dtend = `${this._formatDate(
    //     this._dtend!,
    //     this.hass.config.time_zone
    //   )}T${this._formatTime(this._dtend!, this.hass.config.time_zone)}`;
    // }

    // Validate required fields
    if (this._summary && this._dtstart && this._dtend) {
      // Add the new event to the calendar
      const newEvent: CalendarTemplateViewEventItem = {
        summary: this._summary,
        weekday_int: this.dayStringToNumber(this._params?.day),
        start_time: this._dtstart,
        end_time: this._dtend,
        description: this._description || undefined,
      };

      this._calendarEvents = [...this._calendarEvents, newEvent];
      console.log(
        "Updated calendar events state:",
        this._calendarEvents
      );
      // Emit an event with the updated events
      this._params?.updated(this._calendarEvents);

      this.closeDialog();
    } else {
      alert(
        "Please fill in the required fields (Summary, Start Time, and End Time)."
      );
    }
  }

  private dayStringToNumber(day: string | undefined): number {
    const daysMap: { [key: string]: number } = {
      mon: 0,
      tue: 1,
      wed: 2,
      thu: 3,
      fri: 4,
      sat: 5,
      sun: 6,
    };
    if (!day) {
      throw new Error("Day undefined");
    }
    const lowerDay = day.toLowerCase();
    if (lowerDay in daysMap) {
      return daysMap[lowerDay];
    }

    throw new Error(`Invalid day string: ${day}`);
  }

  private _handleSummaryChanged(ev) {
    this._summary = ev.target.value;
  }

  private _handleDescriptionChanged(ev) {
    this._description = ev.target.value;
  }

  private _allDayToggleChanged(ev) {
    this._allDay = ev.target.checked;
  }

  // private _getLocaleStrings = memoizeOne(
  //   (startDate?: string, endDate?: string) => ({
  //     startTime: this._formatTime(startDate!),
  //     endTime: this._formatTime(endDate!),
  //   })
  // );

  // Formats a date in specified timezone, or defaulting to browser display timezone
  // private _formatDate(timeZone: string = this._timeZone!): string {
  //   return formatInTimeZone(timeZone, "yyyy-MM-dd");
  // }

  // Formats a time in specified timezone, or defaulting to browser display timezone
  private _formatTime(date: Date, timeZone: string = this._timeZone!): string {
    return formatInTimeZone(date, timeZone, "HH:mm:ss"); // 24 hr
  }

  // Parse a date in the browser timezone
  // private _parseDate(dateStr: string): Date {
  //   return toDate(dateStr, { timeZone: this._timeZone! });
  // }

  // private _startDateChanged(ev: CustomEvent) {
  //   // Store previous event duration
  //   const duration = differenceInMilliseconds(this._dtend!, this._dtstart!);

  //   this._dtstart = this._parseDate(
  //     `${ev.detail.value}T${this._formatTime(this._dtstart!)}`
  //   );

  //   // Prevent that the end time can be before the start time. Try to keep the
  //   // duration the same.
  //   if (this._dtend! <= this._dtstart!) {
  //     this._dtend = addMilliseconds(this._dtstart, duration);
  //     this._info = this.hass.localize(
  //       "ui.components.calendar.event.end_auto_adjusted"
  //     );
  //   }
  // }

  // private _endDateChanged(ev: CustomEvent) {
  //   this._dtend = this._parseDate(
  //     `${ev.detail.value}T${this._formatTime(this._dtend!)}`
  //   );
  // }

  private _startTimeChanged(ev: CustomEvent) {
    // Store previous event duration
    // const duration = differenceInMilliseconds(this._dtend!, this._dtstart!);

    this._dtstart = ev.detail.value;

    // Prevent that the end time can be before the start time. Try to keep the
    // duration the same.
    // if (this._dtend! <= this._dtstart!) {
    //   this._dtend = addMilliseconds(new Date(this._dtstart), duration);
    //   this._info = this.hass.localize(
    //     "ui.components.calendar.event.end_auto_adjusted"
    //   );
    // }
  }

  private _endTimeChanged(ev: CustomEvent) {
    this._dtend = ev.detail.value;
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
        @media all and (min-width: 450px) and (min-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: min(600px, 95vw);
            --mdc-dialog-max-width: min(600px, 95vw);
          }
        }
        state-info {
          line-height: 40px;
        }
        ha-alert {
          display: block;
          margin-bottom: 16px;
        }
        ha-textfield,
        ha-textarea {
          display: block;
        }
        ha-textarea {
          margin-bottom: 16px;
        }
        ha-formfield {
          display: block;
          padding: 16px 0;
        }
        ha-date-input {
          flex-grow: 1;
        }
        ha-time-input {
          margin-left: 16px;
          margin-inline-start: 16px;
          margin-inline-end: initial;
        }
        ha-recurrence-rule-editor {
          display: block;
          margin-top: 16px;
        }
        .flex {
          display: flex;
          justify-content: space-between;
        }
        .label {
          font-size: 12px;
          font-weight: 500;
          color: var(--input-label-ink-color);
        }
        .date-range-details-content {
          display: inline-block;
        }
        ha-rrule {
          display: block;
        }
        ha-svg-icon {
          width: 40px;
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
          direction: var(--direction);
          vertical-align: top;
        }
        ha-rrule {
          display: inline-block;
        }
        .key {
          display: inline-block;
          vertical-align: top;
        }
        .value {
          display: inline-block;
          vertical-align: top;
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
