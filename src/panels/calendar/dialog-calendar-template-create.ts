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
        .heading=${createCloseHeading(this.hass, "This is title")}
        style="--dialog-content-padding: 24px; width: 1000px; max-width: 90%;"
      >
        This is text
        <ha-template-calendar
          .events=${this._params.events}
          .calendars=${this._params.calendars}
          .narrow=${false}
          .initialView=${"dayGridWeek"}
          .hass=${this.hass}
          .error=${"error"}
          @view-changed=${this._handleViewChanged}
        ></ha-template-calendar>
      </ha-dialog>
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
        @media all and (min-width: 450px) and (min-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: 1000px;
            --mdc-dialog-max-width: 10000px;
            --mdc-dialog-min-height: 1000px;
          }
        }
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
