import "@material/mwc-button";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button-toggle-group";
import "../../components/ha-fab";
import "../../components/ha-icon-button-next";
import "../../components/ha-icon-button-prev";
import { haStyle } from "../../resources/styles";
import type { CalendarViewChanged, HomeAssistant } from "../../types";
// import { showCalendarEventDetailDialog } from "./show-dialog-calendar-event-detail";
import { showCalendarEventEditTemplateDialog } from "./show-dialog-calendar-event-editor-template";
import type { CalendarTemplateCreateDialogParams } from "./show-dialog-calendar-template-create";
import type{ 
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
    // Update the internal state
    this._calendarEvents = events;

    // Log for debugging purposes
    console.log("Calendar events updated hejhej:", events);
  }

  // Accepts a Date object or date string that is recognized by the Date.parse() method
  private getDayOfWeek(date) {
    const dayOfWeek = new Date(date).getDay();
    return isNaN(dayOfWeek)
      ? null
      : [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ][dayOfWeek];
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
                ${["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map(
                  (day) => {
                    const dayEvents = this._calendarEvents.filter((event) =>
                      this._convertIntDayToString(event.weekday_int).startsWith(
                        day
                      )
                    );

                    return html`
                      <td>
                        ${dayEvents.length > 0
                          ? dayEvents.map(
                              (event) => html`
                                <div class="event">
                                  <strong>${event.summary}</strong><br />
                                  ${event.start_time} - ${event.end_time}<br />
                                  ${event.description || ""}
                                </div>
                              `
                            )
                          

                          : html`
                            <div class="no-events">No events</div>
                            `}
                        <button
                          class="calendar-button"
                            @click=${() => this._openModal(day)}
                          >
                            Add event
                        </button>
                            
                      </td>
                    `;
                  }
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: flex;
          flex-direction: column;
          --fc-theme-standard-border-color: var(--divider-color);
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
        }

        :host([narrow]) .header {
          padding-right: 8px;
          padding-left: 8px;
          padding-inline-start: 8px;
          padding-inline-end: 8px;
          flex-direction: column;
          align-items: flex-start;
          justify-content: initial;
        }

        .header {
          padding-right: var(--calendar-header-padding);
          padding-left: var(--calendar-header-padding);
          padding-inline-start: var(--calendar-header-padding);
          padding-inline-end: var(--calendar-header-padding);
        }

        .navigation {
          display: flex;
          align-items: center;
          flex-grow: 0;
        }

        a {
          color: var(--primary-color);
        }

        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .buttons {
          display: flex;
          flex-wrap: wrap;
        }

        .buttons > * {
          margin-bottom: 5px;
          box-sizing: border-box;
        }

        .today {
          margin-right: 20px;
          margin-inline-end: 20px;
          margin-inline-start: initial;
          direction: var(--direction);
        }

        .prev,
        .next {
          --mdc-icon-button-size: 32px;
        }

        ha-button-toggle-group {
          color: var(--primary-color);
        }

        ha-fab {
          position: absolute;
          bottom: 32px;
          right: 32px;
          inset-inline-end: 32px;
          inset-inline-start: initial;
          z-index: 1;
        }

        ha-alert {
          display: block;
          margin: 4px 0;
        }

        #calendar {
          flex-grow: 1;
          background-color: var(
            --ha-card-background,
            var(--card-background-color, white)
          );
          /* height: var(--calendar-height);
          --fc-neutral-bg-color: var(
            --ha-card-background,
            var(--card-background-color, white)
          ); */
          height: 600px;
          --fc-list-event-hover-bg-color: var(
            --ha-card-background,
            var(--card-background-color, white)
          );
          --fc-theme-standard-border-color: var(--divider-color);
          --fc-border-color: var(--divider-color);
          --fc-page-bg-color: var(
            --ha-card-background,
            var(--card-background-color, white)
          );
        }

        a {
          color: inherit !important;
        }

        .fc-theme-standard .fc-scrollgrid {
          border: 1px solid var(--divider-color);
          border-width: var(--calendar-border-width, 1px);
          border-radius: var(
            --calendar-border-radius,
            var(--mdc-shape-small, 4px)
          );
        }

        .fc-theme-standard td {
          border-bottom-left-radius: var(--mdc-shape-small, 4px);
          border-bottom-right-radius: var(--mdc-shape-small, 4px);
        }

        .fc-scrollgrid-section-header td {
          border: none;
        }

        th.fc-col-header-cell.fc-day {
          background-color: var(--table-header-background-color);
          color: var(--primary-text-color);
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .fc-daygrid-dot-event:hover {
          background-color: inherit;
        }

        .fc-daygrid-day-top {
          text-align: center;
          padding-top: 5px;
          justify-content: center;
        }

        table.fc-scrollgrid-sync-table
          tbody
          tr:first-child
          .fc-daygrid-day-top {
          padding-top: 0;
        }

        a.fc-daygrid-day-number {
          float: none !important;
          font-size: 12px;
          cursor: pointer;
        }

        .fc .fc-daygrid-day-number {
          padding: 3px !important;
        }

        .fc .fc-daygrid-day.fc-day-today {
          background: inherit;
        }

        td.fc-day-today .fc-daygrid-day-number {
          height: 26px;
          color: var(--text-primary-color) !important;
          background-color: var(--primary-color);
          border-radius: 50%;
          display: inline-block;
          text-align: center;
          white-space: nowrap;
          width: max-content;
          min-width: 24px;
        }

        .fc-daygrid-day-events {
          margin-top: 4px;
        }

        .fc-event {
          border-radius: 4px;
          line-height: 1.7;
          cursor: pointer;
        }

        .fc-daygrid-block-event .fc-event-main {
          padding: 0 1px;
        }

        .fc-day-past .fc-daygrid-day-events {
          opacity: 0.5;
        }

        .fc-icon-x:before {
          font-family: var(--paper-font-common-base_-_font-family);
          content: "X";
        }

        .fc-popover {
          background-color: var(--primary-background-color) !important;
        }

        .fc-popover-header {
          background-color: var(--secondary-background-color) !important;
        }

        .fc-theme-standard .fc-list-day-frame {
          background-color: transparent;
        }

        .fc-list.fc-view,
        .fc-list-event.fc-event td {
          border: none;
        }

        .fc-list-day.fc-day th {
          border-bottom: none;
          border-top: 1px solid var(--fc-theme-standard-border-color, #ddd) !important;
        }

        .fc-list-day-text {
          font-size: 16px;
          font-weight: 400;
        }

        .fc-list-day-side-text {
          font-weight: 400;
          font-size: 16px;
          color: var(--primary-color);
        }

        .fc-list-table td,
        .fc-list-day-frame {
          padding-top: 12px;
          padding-bottom: 12px;
        }

        :host([narrow])
          .fc-dayGridMonth-view
          .fc-daygrid-dot-event
          .fc-event-time,
        :host([narrow])
          .fc-dayGridMonth-view
          .fc-daygrid-dot-event
          .fc-event-title {
          display: none;
        }

        :host([narrow]) .fc-dayGridMonth-view .fc-daygrid-event-harness {
          margin-top: 0 !important;
        }

        :host([narrow]) .fc-dayGridMonth-view .fc-daygrid-day-events {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
        }

        :host([narrow]) .fc-dayGridMonth-view .fc-scrollgrid-sync-table {
          overflow: hidden;
        }

        .fc-scroller::-webkit-scrollbar {
          width: 0.4rem;
          height: 0.4rem;
        }

        .fc-scroller::-webkit-scrollbar-thumb {
          -webkit-border-radius: 4px;
          border-radius: 4px;
          background: var(--scrollbar-thumb-color);
        }

        .fc-scroller {
          overflow-y: auto;
          scrollbar-color: var(--scrollbar-thumb-color) transparent;
          scrollbar-width: thin;
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
    "view-changed": CalendarViewChanged; // Existing events
    "calendar-events-updated": { events: CalendarTemplateEvents }; // Add this line
  }
}
