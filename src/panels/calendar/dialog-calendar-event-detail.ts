import "@material/mwc-button";
import { mdiCalendarClock, mdiCalendarCheck, mdiCompass } from "@mdi/js";
import { toDate } from "date-fns-tz";
import { addDays, isSameDay } from "date-fns";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators";
import { formatDate } from "../../common/datetime/format_date";
import { formatDateTime } from "../../common/datetime/format_date_time";
import { formatTime } from "../../common/datetime/format_time";
import { fireEvent } from "../../common/dom/fire_event";
import { isDate } from "../../common/string/is_date";
import "../../components/entity/state-info";
import "../../components/ha-alert";
import "../../components/ha-date-input";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-time-input";
import type { CalendarEventMutableParams } from "../../data/calendar";
import { deleteCalendarEvent } from "../../data/calendar";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../lovelace/components/hui-generic-entity-row";
import { renderRRuleAsText } from "./recurrence";
import { showConfirmEventDialog } from "./show-confirm-event-dialog-box";
import type { CalendarEventDetailDialogParams } from "./show-dialog-calendar-event-detail";
import { showCalendarEventEditDialog } from "./show-dialog-calendar-event-editor";
import { resolveTimeZone } from "../../common/datetime/resolve-time-zone";

/*
This class represents a dialog box for showing details of an event.
*/
class DialogCalendarEventDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: CalendarEventDetailDialogParams;

  @state() private _calendarId?: string;

  @state() private _submitting = false;

  @state() private _error?: string;

  @state() private _data!: CalendarEventMutableParams;

  /**
   * Function used for showing the dialog. If there is already an entry, its value will be copied to _data.
   */
  public async showDialog(
    params: CalendarEventDetailDialogParams
  ): Promise<void> {
    this._params = params;
    if (params.entry) {
      const entry = params.entry!;
      this._data = entry;
      this._calendarId = params.calendarId;
    }
  }

  /**
   * Function called when closing the dialog. Resets the values of _calendarId and _params. Closes the dialog.
   */
  private closeDialog(): void {
    this._calendarId = undefined;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  /**
   * @returns HTML for the dialog box. Contains information fields of the event.
   */
  protected render() {
    if (!this._params) {
      return nothing;
    }
    const stateObj = this.hass.states[this._calendarId!];
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(this.hass, this._data!.summary)}
      >
        <div class="content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <div class="field">
            <ha-svg-icon .path=${mdiCalendarClock}></ha-svg-icon>
            <div class="value">
              ${this._formatDateRange()}<br />
              ${this._data!.rrule
                ? this._renderRRuleAsText(this._data.rrule)
                : ""}
              ${this._data.description
                ? html`<br />
                    <div class="description">
                      ${this._data.description
                        .split("\n")
                        .map((line) => html`${line}<br />`)}
                    </div>
                    <br />`
                : nothing}
            </div>
          </div>
          <div class="field">
            ${this._data.location
              ? html`
                  <ha-svg-icon .path=${mdiCompass}></ha-svg-icon>
                  <div class="value" style="margin-bottom: 16px;">
                    ${this._data.location}
                    <div style="border-radius:6px;">
                      <br />
                      <iframe
                        width="100%"
                        height="200"
                        src=${`https://maps.google.com/maps?width=100%&height=200&hl=en&q=${encodeURIComponent(this._data.location)}&ie=UTF8&t=&z=14&iwloc=B&output=embed`}
                        frameborder="0"
                        scrolling="no"
                        marginheight="0"
                        marginwidth="0"
                        title="Map showing location: ${this._data.location}"
                      >
                        >
                      </iframe>
                      <br />
                    </div>
                  </div>
                `
              : ""}
          </div>
          <div class="field">
            <ha-svg-icon .path=${mdiCalendarCheck}></ha-svg-icon>
            <div class="value">
              ${this._data?.attendees?.length
                ? this._data.attendees.map(
                    (attendee) => html`
                      <div style="margin-bottom: 8px; display: flex; gap: 8px;">
                        <div>${attendee.email}</div>
                        <div>${attendee.response_status}</div>
                      </div>
                    `
                  )
                : "No attendees"}
            </div>
          </div>
          <div class="attribute">
            <state-info
              .hass=${this.hass}
              .stateObj=${stateObj}
              .color=${this._params.color}
              inDialog
            ></state-info>
          </div>
        </div>
        ${this._params.canDelete
          ? html`
              <mwc-button
                slot="secondaryAction"
                class="warning"
                @click=${this._deleteEvent}
                .disabled=${this._submitting}
              >
                ${this.hass.localize("ui.components.calendar.event.delete")}
              </mwc-button>
            `
          : ""}
        ${this._params.canEdit
          ? html`<mwc-button
              slot="primaryAction"
              @click=${this._editEvent}
              .disabled=${this._submitting}
            >
              ${this.hass.localize("ui.components.calendar.event.edit")}
            </mwc-button>`
          : ""}
      </ha-dialog>
    `;
  }

  /**
   * Converts the a value to text, uses translations to get the correct value
   * @param value
   * @returns
   */
  private _renderRRuleAsText(value: string) {
    if (!value) {
      return "";
    }
    try {
      const ruleText = renderRRuleAsText(this.hass, value);
      if (ruleText !== undefined) {
        return html`<div id="text">${ruleText}</div>`;
      }
      return html`<div id="text">Cannot convert recurrence rule</div>`;
    } catch (e) {
      return "Error while processing the rule";
    }
  }

  /**
   * Formats the dates to a range between start and end date
   * @returns
   */
  private _formatDateRange() {
    const timeZone = resolveTimeZone(
      this.hass.locale.time_zone,
      this.hass.config.time_zone
    );
    const start = toDate(this._data!.dtstart, { timeZone: timeZone });
    const endValue = toDate(this._data!.dtend, { timeZone: timeZone });
    // All day events should be displayed as a day earlier
    const end = isDate(this._data.dtend) ? addDays(endValue, -1) : endValue;
    // The range can be shortened when the start and end are on the same day.
    if (isSameDay(start, end)) {
      if (isDate(this._data.dtstart)) {
        // Single date string only
        return formatDate(start, this.hass.locale, this.hass.config);
      }
      // Single day with a start/end time range
      return `${formatDate(
        start,
        this.hass.locale,
        this.hass.config
      )} ${formatTime(
        start,
        this.hass.locale,
        this.hass.config
      )} - ${formatTime(end, this.hass.locale, this.hass.config)}`;
    }
    // An event across multiple dates, optionally with a time range
    return `${
      isDate(this._data.dtstart)
        ? formatDate(start, this.hass.locale, this.hass.config)
        : formatDateTime(start, this.hass.locale, this.hass.config)
    } - ${
      isDate(this._data.dtend)
        ? formatDate(end, this.hass.locale, this.hass.config)
        : formatDateTime(end, this.hass.locale, this.hass.config)
    }`;
  }

  /**
   * Opens the edit event dialog
   */
  private async _editEvent() {
    showCalendarEventEditDialog(this, this._params!);
    this.closeDialog();
  }

  /**
   * Deletes and event from the calendar.
   */
  private async _deleteEvent() {
    this._submitting = true;
    const entry = this._params!.entry!;
    const range = await showConfirmEventDialog(this, {
      title: this.hass.localize(
        "ui.components.calendar.event.confirm_delete.delete"
      ),
      text: entry.recurrence_id
        ? this.hass.localize(
            "ui.components.calendar.event.confirm_delete.recurring_prompt"
          )
        : this.hass.localize(
            "ui.components.calendar.event.confirm_delete.prompt"
          ),
      confirmText: entry.recurrence_id
        ? this.hass.localize(
            "ui.components.calendar.event.confirm_delete.delete_this"
          )
        : this.hass.localize(
            "ui.components.calendar.event.confirm_delete.delete"
          ),
      confirmFutureText: entry.recurrence_id
        ? this.hass.localize(
            "ui.components.calendar.event.confirm_delete.delete_future"
          )
        : undefined,
    });
    if (range === undefined) {
      // Cancel
      this._submitting = false;
      return;
    }
    try {
      await deleteCalendarEvent(
        this.hass!,
        this._calendarId!,
        entry.uid!,
        entry.recurrence_id || "",
        range!
      );
    } catch (err: any) {
      this._error = err ? err.message : "Unknown error";
      return;
    } finally {
      this._submitting = false;
    }
    await this._params!.updated();
    this.closeDialog();
  }

  /**
   * Styling of the dialog
   */
  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        state-info {
          line-height: 40px;
        }
        ha-svg-icon {
          width: 40px;
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
          direction: var(--direction);
          vertical-align: top;
        }
        .field {
          display: flex;
        }
        .description {
          color: var(--secondary-text-color);
          max-width: 300px;
          overflow-wrap: break-word;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-calendar-event-detail": DialogCalendarEventDetail;
  }
}

customElements.define(
  "dialog-calendar-event-detail",
  DialogCalendarEventDetail
);
