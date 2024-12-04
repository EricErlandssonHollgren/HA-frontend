import "@material/mwc-button";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/entity/state-info";
import "../../components/ha-alert";
import "../../components/ha-date-input";
import "../../components/ha-time-input";
import { createCloseHeading } from "../../components/ha-dialog";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../lovelace/components/hui-generic-entity-row";
// import { createCloseHeading } from "../../components/ha-dialog";
import type { CalendarEventEditTemplateDialogParams } from "./show-dialog-calendar-event-editor-template";
import "./dialog-calendar-template-create";
import "../../components/ha-formfield";
import "../../components/ha-textarea";
import "../../components/ha-switch";
import type { CalendarTemplateViewEventItem } from "../../data/calendar";

/**
 * This class is responsible for a dialog for creating or editing events adapted for a calendar.
 */
class DialogCalendarTemplateEventEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _calendarEvents: CalendarTemplateViewEventItem[] = [];

  @state() private _info?: string;

  @state() private _params?: CalendarEventEditTemplateDialogParams;

  @state() private _summary = "";

  @state() private _description? = "";

  @state() private _dtstart?: string; // In sync with _data.dtstart

  @state() private _dtend?: string; // Inclusive for display, in sync with _data.dtend (exclusive)

  /** Shows the dialog and sets the respective variable to the value of the entry, if there is one. If not gives them default values. */
  public async showDialog(
    params: CalendarEventEditTemplateDialogParams
  ): Promise<void> {
    this._info = undefined;
    this._params = params;
    if (params.entry) {
      const entry = params.entry!;
      this._summary = entry.summary;
      this._description = entry.description;
      this._dtstart = entry.start_time;
      this._dtend = entry.end_time;
    } else {
      this._summary = "";
      this._description = "";
      this._dtstart = "00:00:00";
      this._dtend = "01:00:00";
    }
  }

  private closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  /**
   *
   * @returns HTML for the dialog, contains input fields for summary, description and time of an event.
   * Has a edit and create variant that the header and footer depends on.
   */
  protected render() {
    if (!this._params) {
      return nothing;
    }
    const isCreate = this._params.entry === undefined;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            `ui.components.calendar.event.${isCreate ? "add" : "edit"}`
          )
        )}
      >
        <div id="content">
          ${this._info
            ? html`<ha-alert
                alert-type="error"
                dismissable
                @alert-dismissed-clicked=${this._clearInfo}
                >${this._info}</ha-alert
              >`
            : ""}
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
          <div class="time">
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
                >${this.hass.localize(
                  "ui.components.calendar.event.end"
                )}:</span
              >
              <div class="flex">
                <ha-time-input
                  .value=${this._dtend}
                  .locale=${this.hass.locale}
                  @value-changed=${this._endTimeChanged}
                ></ha-time-input>
              </div>
            </div>
          </div>
          <div class="footer">
            ${isCreate
              ? html`
                  <button
                    class="save-button"
                    @click=${this._onSaveEvent(isCreate)}
                  >
                    SAVE EVENT
                  </button>
                `
              : html`
                  <button
                    class="save-button"
                    @click=${this._onSaveEvent(isCreate)}
                  >
                    SAVE EVENT
                  </button>
                  ${this._params.canDelete
                    ? html`
                        <button
                          class="delete-button"
                          @click=${this._deleteEvent}
                        >
                          DELETE EVENT
                        </button>
                      `
                    : ""}
                `}
          </div>
        </div>
      </ha-dialog>
    `;
  }

  private _clearInfo() {
    this._info = undefined;
  }

  /**
   * Removes an event from the list of calendar events based on its index. Updates the list and closes the dialog.
   */
  private _deleteEvent() {
    const i = this._params?.index;
    if (i !== undefined && i >= 0 && i < this._calendarEvents.length) {
      this._calendarEvents = [
        ...this._calendarEvents.slice(0, i),
        ...this._calendarEvents.slice(i + 1),
      ];
      this._params?.updated(this._calendarEvents);
      this.closeDialog();
    } else {
      alert("The index is undefined");
    }
  }

  /**
   * Wrapper function for _saveEvent
   */
  private _onSaveEvent = (isCreate: boolean) => () => {
    this._saveEvent(isCreate);
  };

  /**
   * Creates a template event and adds it to the end of the list of events, or edits the event at the current index
   * @param isCreate true if the user is adding a new event, false if the have selected an existing event.
   */
  private _saveEvent(isCreate: boolean): void {
    // Validate required fields
    if (
      this._summary &&
      this._dtend &&
      this._dtstart &&
      !(this._dtend! <= this._dtstart!)
    ) {
      // Add the new event to the calendar
      const newEvent: CalendarTemplateViewEventItem = {
        summary: this._summary,
        weekday_int: this.dayStringToNumber(this._params?.day),
        start_time: this._dtstart,
        end_time: this._dtend,
        description: this._description || undefined,
      };
      if (isCreate) {
        this._calendarEvents = [...this._calendarEvents, newEvent];
        // Emit an event with the updated events
        this._params?.updated(this._calendarEvents);
      } else {
        const i = this._params?.index;
        if (i !== undefined && i >= 0 && i < this._calendarEvents.length) {
          this._calendarEvents = [
            ...this._calendarEvents.slice(0, i),
            newEvent,
            ...this._calendarEvents.slice(i + 1),
          ];
          this._params?.updated(this._calendarEvents);
        } else {
          alert("The index is undefined");
        }
      }
      this.closeDialog();
    } else {
      this._info =
        "Please fill in the required fields and make sure that the start time of the event is before the end time.";
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

  private _startTimeChanged(ev: CustomEvent) {
    this._clearInfo();
    this._dtstart = ev.detail.value;
    // Prevent that the end time can be before the start time. Try to keep the
    // duration the same.
    if (this._dtend! <= this._dtstart!) {
      this._info = "The start time needs to be before the end time.";
    }
  }

  private _endTimeChanged(ev: CustomEvent) {
    this._clearInfo();
    this._dtend = ev.detail.value;
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
          margin-right: 8px;
        }
        .time {
          display: flex;
          flex-direction: row;
          justify-content: start;
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
        .footer {
          display: flex;
          justify-content: end;
          gap: 16px;
        }
        .save-button {
          font:
            12.25px Roboto,
            sans-serif;
          width: 100px;
          font-weight: 500;
          height: 40px;
          border: 1px;
          border-radius: 4px;
          box-sizing: border-box;
          background-color: white;
          color: #03a9fa;
          cursor: pointer;
        }
        .save-button:hover {
          background-color: rgba(0, 174, 248, 0.08);
          cursor: pointer;
        }
        .delete-button {
          font:
            12.25px Roboto,
            sans-serif;
          width: 100px;
          font-weight: 500;
          height: 40px;
          border: 1px;
          border-radius: 4px;
          box-sizing: border-box;
          background-color: white;
          color: rgb(186, 27, 27);
          cursor: pointer;
        }
        .delete-button:hover {
          cursor: pointer;
          background-color: rgba(186, 27, 27, 0.08);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-calendar-template-event-editor": DialogCalendarTemplateEventEditor;
  }
}

customElements.define(
  "dialog-calendar-template-event-editor",
  DialogCalendarTemplateEventEditor
);
