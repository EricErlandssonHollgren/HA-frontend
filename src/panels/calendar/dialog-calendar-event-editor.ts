import "@material/mwc-button";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { mdiTrashCanOutline } from "@mdi/js";
import {
  addDays,
  addHours,
  addMilliseconds,
  differenceInMilliseconds,
  startOfHour,
} from "date-fns";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { resolveTimeZone } from "../../common/datetime/resolve-time-zone";
import { fireEvent } from "../../common/dom/fire_event";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { supportsFeature } from "../../common/entity/supports-feature";
import { isDate } from "../../common/string/is_date";
import "../../components/entity/ha-entity-picker";
import "../../components/ha-alert";
import "../../components/ha-date-input";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-formfield";
import "../../components/ha-switch";
import "../../components/ha-textarea";
import "../../components/ha-textfield";
import "../../components/ha-time-input";
import type {
  Attendee,
  CalendarEventData,
  CalendarEventMutableParams,
} from "../../data/calendar";
import {
  CalendarEntityFeature,
  RecurrenceRange,
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "../../data/calendar";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../lovelace/components/hui-generic-entity-row";
import "./ha-recurrence-rule-editor";
import { showConfirmEventDialog } from "./show-confirm-event-dialog-box";
import type { CalendarEventEditDialogParams } from "./show-dialog-calendar-event-editor";

const CALENDAR_DOMAINS = ["calendar"];
/**
 * This class represents a dialog fo creating or editing calendar events.
 */
@customElement("dialog-calendar-event-editor")
class DialogCalendarEventEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _info?: string;

  @state() private _params?: CalendarEventEditDialogParams;

  @state() private _calendarId?: string;

  @state() private _summary = "";

  @state() private _description? = "";

  @state() private _location? = "";

  @state() private _meeting? = "";

  @state() private _rrule?: string;

  @state() private _allDay = false;

  @state() private _dtstart?: Date; // In sync with _data.dtstart

  @state() private _dtend?: Date; // Inclusive for display, in sync with _data.dtend (exclusive)

  @state() private _submitting = false;

  @state() private _attendees?: Attendee[];

  // Dates are displayed in the timezone according to the user's profile
  // which may be different from the Home Assistant timezone. When
  // events are persisted, they are relative to the Home Assistant
  // timezone, but floating without a timezone.
  private _timeZone?: string;

  /**
   * Function for showing the dialog, checks the calendarId and prefills the input fields if there is an entry.
   * @param params
   */
  public showDialog(params: CalendarEventEditDialogParams): void {
    this._error = undefined;
    this._info = undefined;
    this._params = params;
    this._calendarId =
      params.calendarId ||
      Object.values(this.hass.states).find(
        (stateObj) =>
          computeStateDomain(stateObj) === "calendar" &&
          supportsFeature(stateObj, CalendarEntityFeature.CREATE_EVENT)
      )?.entity_id;
    this._timeZone = resolveTimeZone(
      this.hass.locale.time_zone,
      this.hass.config.time_zone
    );
    if (params.entry) {
      const entry = params.entry!;
      this._allDay = isDate(entry.dtstart);
      this._summary = entry.summary;
      this._meeting = this._parseMeetingLink(entry);
      this._description = this._parseDescription(entry);
      this._attendees = entry.attendees;
      this._rrule = entry.rrule;
      this._location = entry.location || "";

      if (this._allDay) {
        this._dtstart = new Date(entry.dtstart + "T00:00:00");
        // Calendar event end dates are exclusive, but not shown that way in the UI. The
        // reverse happens when persisting the event.
        this._dtend = addDays(new Date(entry.dtend + "T00:00:00"), -1);
      } else {
        this._dtstart = new Date(entry.dtstart);
        this._dtend = new Date(entry.dtend);
      }
    } else {
      this._allDay = false;
      // If we have been provided a selected date (e.g. based on the currently displayed
      // day in a calendar view), use that as the starting value.
      this._dtstart = startOfHour(
        params.selectedDate ? params.selectedDate : new Date()
      );
      this._dtend = addHours(this._dtstart, 1);
    }
  }

  /**
   * Resets the variables and closes the dialog
   * @returns
   */
  public closeDialog(): void {
    if (!this._params) {
      return;
    }
    this._calendarId = undefined;
    this._params = undefined;
    this._dtstart = undefined;
    this._dtend = undefined;
    this._summary = "";
    this._description = "";
    this._attendees = [];
    this._location = "";
    this._meeting = "";
    this._rrule = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  /**
   * Returns HTML for the dialog, contains different types of input fields and buttons for saving or deleting the event
   */
  protected render() {
    if (!this._params) {
      return nothing;
    }
    const isCreate = this._params.entry === undefined;

    const { startDate, startTime, endDate, endTime } = this._getLocaleStrings(
      this._dtstart,
      this._dtend
    );

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
        <div class="content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          ${this._info
            ? html`<ha-alert
                alert-type="info"
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
          <ha-textfield
            class="location"
            name="location"
            .label=${"Location"}
            .value=${this._location}
            @input=${this._handleLocationChanged}
          ></ha-textfield>
          <ha-textfield
            class="meeting"
            name="meeting"
            .label=${"Meeting"}
            .value=${this._meeting}
            @input=${this._handleMeetingChanged}
          ></ha-textfield>
          <div class="attendees">
            ${this._attendees?.length ? html`<span>Attendees</span>` : ""}
            <div class="flex-col">
              ${this._attendees?.map(
                (attendee, index) => html`
                  <div class="flex-row">
                    <ha-icon-button
                      .path=${mdiTrashCanOutline}
                      @click=${this._onRemoveAttendee(index)}
                    >
                    </ha-icon-button>
                    <ha-textfield
                      class="flex-grow"
                      name="attendee"
                      .value=${attendee.email}
                      .label=${"Attendee"}
                      @input=${this._onAttendeeChange(index)}
                    >
                    </ha-textfield>
                  </div>
                `
              )}
            </div>
            <ha-button
              .label=${"Add attendee"}
              @click=${this._addAttendee}
            ></ha-button>
          </div>
          <ha-entity-picker
            name="calendar"
            .hass=${this.hass}
            .label=${this.hass.localize("ui.components.calendar.label")}
            .value=${this._calendarId!}
            .includeDomains=${CALENDAR_DOMAINS}
            .entityFilter=${this._isEditableCalendar}
            .disabled=${!isCreate}
            required
            @value-changed=${this._handleCalendarChanged}
          ></ha-entity-picker>
          <ha-formfield
            .label=${this.hass.localize("ui.components.calendar.event.all_day")}
          >
            <ha-switch
              id="all_day"
              .checked=${this._allDay}
              @change=${this._allDayToggleChanged}
            ></ha-switch>
          </ha-formfield>

          <div>
            <span class="label"
              >${this.hass.localize(
                "ui.components.calendar.event.start"
              )}:</span
            >
            <div class="flex">
              <ha-date-input
                .value=${startDate}
                .locale=${this.hass.locale}
                @value-changed=${this._startDateChanged}
              ></ha-date-input>
              ${!this._allDay
                ? html`<ha-time-input
                    .value=${startTime}
                    .locale=${this.hass.locale}
                    @value-changed=${this._startTimeChanged}
                  ></ha-time-input>`
                : ""}
            </div>
          </div>
          <div>
            <span class="label"
              >${this.hass.localize("ui.components.calendar.event.end")}:</span
            >
            <div class="flex">
              <ha-date-input
                .value=${endDate}
                .min=${startDate}
                .locale=${this.hass.locale}
                @value-changed=${this._endDateChanged}
              ></ha-date-input>
              ${!this._allDay
                ? html`<ha-time-input
                    .value=${endTime}
                    .locale=${this.hass.locale}
                    @value-changed=${this._endTimeChanged}
                  ></ha-time-input>`
                : ""}
            </div>
          </div>
          <ha-recurrence-rule-editor
            .hass=${this.hass}
            .dtstart=${this._dtstart}
            .allDay=${this._allDay}
            .locale=${this.hass.locale}
            .timezone=${this.hass.config.time_zone}
            .value=${this._rrule || ""}
            @value-changed=${this._handleRRuleChanged}
          >
          </ha-recurrence-rule-editor>
        </div>
        ${isCreate
          ? html`
              <mwc-button
                slot="primaryAction"
                @click=${this._createEvent}
                .disabled=${this._submitting}
              >
                ${this.hass.localize("ui.components.calendar.event.add")}
              </mwc-button>
            `
          : html`
              <mwc-button
                slot="primaryAction"
                @click=${this._saveEvent}
                .disabled=${this._submitting}
              >
                ${this.hass.localize("ui.components.calendar.event.save")}
              </mwc-button>
              ${this._params.canDelete
                ? html`
                    <mwc-button
                      slot="secondaryAction"
                      class="warning"
                      @click=${this._deleteEvent}
                      .disabled=${this._submitting}
                    >
                      ${this.hass.localize(
                        "ui.components.calendar.event.delete"
                      )}
                    </mwc-button>
                  `
                : ""}
            `}
      </ha-dialog>
    `;
  }

  private _isEditableCalendar = (entityStateObj: HassEntity) =>
    supportsFeature(entityStateObj, CalendarEntityFeature.CREATE_EVENT);

  /**
   * Separates a date into both date and time and assigns the respective variables with the value
   */
  private _getLocaleStrings = memoizeOne(
    (startDate?: Date, endDate?: Date) => ({
      startDate: this._formatDate(startDate!),
      startTime: this._formatTime(startDate!),
      endDate: this._formatDate(endDate!),
      endTime: this._formatTime(endDate!),
    })
  );

  /**
   * Wrapper function for _removeAttendee
   */
  private _onRemoveAttendee = (index: number) => () => {
    this._removeAttendee(index);
  };

  /**
   * Removes the attendee from the list of attendees
   */
  private _removeAttendee(index: number): void {
    this._attendees = this._attendees?.filter((_, i) => i !== index);
  }

  /**
   * Wrapper function for _handleAttendeesChanges
   */
  private _onAttendeeChange = (index: number) => (ev: Event) => {
    this._handleAttendeesChanged(ev, index);
  };

  /**
   * Edits the list of attendees
   * @param ev the event that has the list of attendees
   * @param index the index on which to remove the attendee
   */
  private _handleAttendeesChanged(ev: Event, index: number): void {
    const target = ev.target as HTMLInputElement;
    const newValue = target.value;

    if (this._attendees) {
      const updatedAttendees = [...this._attendees];
      updatedAttendees[index] = {
        ...updatedAttendees[index],
        email: newValue,
      };
      this._attendees = updatedAttendees;
    }
  }

  // Formats a date in specified timezone, or defaulting to browser display timezone
  private _formatDate(date: Date, timeZone: string = this._timeZone!): string {
    return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
  }

  // Formats a time in specified timezone, or defaulting to browser display timezone
  private _formatTime(date: Date, timeZone: string = this._timeZone!): string {
    return formatInTimeZone(date, timeZone, "HH:mm:ss"); // 24 hr
  }

  // Parse a date in the browser timezone
  private _parseDate(dateStr: string): Date {
    return toDate(dateStr, { timeZone: this._timeZone! });
  }

  private _clearInfo() {
    this._info = undefined;
  }

  private _handleSummaryChanged(ev) {
    this._summary = ev.target.value;
  }

  private _parseDescription(entry: CalendarEventData) {
    const prefix = "Meeting: ";
    // Split the description into lines
    const lines = entry.description?.split("\n");

    // Filter out the line that contains the prefix
    const filteredLines = lines?.filter((line) => !line.includes(prefix));

    // Rejoin the remaining lines
    return filteredLines?.join("\n").trim();
  }

  private _parseMeetingLink(entry: CalendarEventData): string | undefined {
    const meetingPrefix = "Meeting: ";
    const index = entry.description?.indexOf(meetingPrefix);

    if (index === -1 || index === undefined) return undefined;

    const remainingText = entry.description?.slice(
      index + meetingPrefix.length
    );

    if (remainingText === undefined) return undefined;

    return remainingText.split("\n")[0].trim();
  }

  private _handleLocationChanged(ev) {
    this._location = ev.target.value;
  }

  private _handleMeetingChanged(ev) {
    this._meeting = ev.target.value;
  }

  private _handleDescriptionChanged(ev) {
    this._description = ev.target.value;
  }

  /**
   * Creates a new attendee and adds it to the list of attendees
   */
  private _addAttendee() {
    const newAttendee: Attendee = {
      comment: undefined,
      display_name: undefined,
      email: "",
      id: undefined,
      optional: false,
      response_status: "",
    };
    this._attendees = [...(this._attendees ?? []), newAttendee];
  }

  private _handleRRuleChanged(ev) {
    this._rrule = ev.detail.value;
  }

  private _allDayToggleChanged(ev) {
    this._allDay = ev.target.checked;
  }

  private _startDateChanged(ev: CustomEvent) {
    // Store previous event duration
    const duration = differenceInMilliseconds(this._dtend!, this._dtstart!);

    this._dtstart = this._parseDate(
      `${ev.detail.value}T${this._formatTime(this._dtstart!)}`
    );

    // Prevent that the end time can be before the start time. Try to keep the
    // duration the same.
    if (this._dtend! <= this._dtstart!) {
      this._dtend = addMilliseconds(this._dtstart, duration);
      this._info = this.hass.localize(
        "ui.components.calendar.event.end_auto_adjusted"
      );
    }
  }

  private _endDateChanged(ev: CustomEvent) {
    this._dtend = this._parseDate(
      `${ev.detail.value}T${this._formatTime(this._dtend!)}`
    );
  }

  private _startTimeChanged(ev: CustomEvent) {
    // Store previous event duration
    const duration = differenceInMilliseconds(this._dtend!, this._dtstart!);

    this._dtstart = this._parseDate(
      `${this._formatDate(this._dtstart!)}T${ev.detail.value}`
    );

    // Prevent that the end time can be before the start time. Try to keep the
    // duration the same.
    if (this._dtend! <= this._dtstart!) {
      this._dtend = addMilliseconds(new Date(this._dtstart), duration);
      this._info = this.hass.localize(
        "ui.components.calendar.event.end_auto_adjusted"
      );
    }
  }

  private _endTimeChanged(ev: CustomEvent) {
    this._dtend = this._parseDate(
      `${this._formatDate(this._dtend!)}T${ev.detail.value}`
    );
  }

  private _calculateData() {
    if (this._meeting && this._meeting.length !== 0) {
      this._description = `Meeting: ${this._meeting}\n\n${this._description}`;
    }
    const data: CalendarEventMutableParams = {
      summary: this._summary,
      description: this._description?.trim(),
      location: this._location || "",
      attendees: this._attendees,
      rrule: this._rrule || undefined,
      dtstart: "",
      dtend: "",
    };
    if (this._allDay) {
      data.dtstart = this._formatDate(this._dtstart!);
      // End date/time is exclusive when persisted
      data.dtend = this._formatDate(addDays(this._dtend!, 1));
    } else {
      data.dtstart = `${this._formatDate(
        this._dtstart!,
        this.hass.config.time_zone
      )}T${this._formatTime(this._dtstart!, this.hass.config.time_zone)}`;
      data.dtend = `${this._formatDate(
        this._dtend!,
        this.hass.config.time_zone
      )}T${this._formatTime(this._dtend!, this.hass.config.time_zone)}`;
    }
    return data;
  }

  private _handleCalendarChanged(ev: CustomEvent) {
    this._calendarId = ev.detail.value;
  }

  private _isValidStartEnd(): boolean {
    if (this._allDay) {
      return this._dtend! >= this._dtstart!;
    }
    return this._dtend! > this._dtstart!;
  }

  private async _createEvent() {
    if (!this._summary || !this._calendarId) {
      this._error = this.hass.localize(
        "ui.components.calendar.event.not_all_required_fields"
      );
      return;
    }

    if (!this._isValidStartEnd()) {
      this._error = this.hass.localize(
        "ui.components.calendar.event.invalid_duration"
      );
      return;
    }

    this._submitting = true;
    try {
      await createCalendarEvent(
        this.hass!,
        this._calendarId!,
        this._calculateData()
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

  private async _saveEvent() {
    if (!this._summary || !this._calendarId) {
      this._error = this.hass.localize(
        "ui.components.calendar.event.not_all_required_fields"
      );
      return;
    }

    if (!this._isValidStartEnd()) {
      this._error = this.hass.localize(
        "ui.components.calendar.event.invalid_duration"
      );
      return;
    }

    this._submitting = true;
    const entry = this._params!.entry!;
    let range: RecurrenceRange | undefined = RecurrenceRange.THISEVENT;
    if (entry.recurrence_id) {
      range = await showConfirmEventDialog(this, {
        title: this.hass.localize(
          "ui.components.calendar.event.confirm_update.update"
        ),
        text: this.hass.localize(
          "ui.components.calendar.event.confirm_update.recurring_prompt"
        ),
        confirmText: this.hass.localize(
          "ui.components.calendar.event.confirm_update.update_this"
        ),
        confirmFutureText: this.hass.localize(
          "ui.components.calendar.event.confirm_update.update_future"
        ),
      });
    }
    if (range === undefined) {
      // Cancel
      this._submitting = false;
      return;
    }
    const eventData = this._calculateData();
    if (entry.rrule && eventData.rrule && range === RecurrenceRange.THISEVENT) {
      // Updates to a single instance of a recurring event by definition
      // cannot change the recurrence rule and doing so would be invalid.
      // It is difficult to detect if the user changed the recurrence rule
      // since updating the date may change it implicitly (e.g. day of week
      // of the event changes) so we just assume the users intent based on
      // recurrence range and drop any other rrule changes.
      eventData.rrule = undefined;
    }
    try {
      await updateCalendarEvent(
        this.hass!,
        this._calendarId!,
        entry.uid!,
        eventData,
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
        ha-button {
          align-self: center;
          margin-bottom: 16px;
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
        ha-textfield {
          margin-bottom: 8px;
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
        .flex-col {
          display: flex;
          flex-direction: column;
        }
        .flex-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
        }
        .flex-grow {
          flex-grow: 1;
        }
        .attendee-button {
          height: 64px;
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
        .attendee {
          display: flex;
          flex-direction: column;
        }
        .location {
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-calendar-event-editor": DialogCalendarEventEditor;
  }
}
