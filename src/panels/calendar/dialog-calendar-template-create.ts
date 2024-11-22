import "@material/mwc-button";
import { formatInTimeZone } from "date-fns-tz";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators";
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
import type { CalendarTemplateViewEventItem } from "../../data/calendar";

class DialogCalendarTemplateCreate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _calendarEvents: CalendarTemplateViewEventItem[] = [];

  @state() private _error?: string;

  @state() private _info?: string;

  @state() private _params?: CalendarEventEditTemplateDialogParams;

  @state() private _summary = "";

  @state() private _description? = "";

  @state() private _dtstart?: string; // In sync with _data.dtstart

  @state() private _dtend?: string; // Inclusive for display, in sync with _data.dtend (exclusive)

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
 }

  private closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }


  protected render() {
    if (!this._params) {
      return nothing;
    }

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

  // Formats a time in specified timezone, or defaulting to browser display timezone
  private _formatTime(date: Date, timeZone: string = this._timeZone!): string {
    return formatInTimeZone(date, timeZone, "HH:mm:ss"); // 24 hr
  }

  private _startTimeChanged(ev: CustomEvent) {
    this._dtstart = ev.detail.value;
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
