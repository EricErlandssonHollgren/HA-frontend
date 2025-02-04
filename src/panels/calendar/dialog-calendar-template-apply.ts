import "@material/mwc-button";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html } from "lit";
import { property, state } from "lit/decorators";
import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item-base";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/entity/state-info";
import "../../components/ha-alert";
import "../../components/ha-date-input";
import "../../components/ha-time-input";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../lovelace/components/hui-generic-entity-row";
import "../../components/ha-formfield";
import "../../components/ha-textarea";
import "../../components/ha-switch";
import type { CalendarTemplateApplyDialogParams } from "./show-dialog-calendar-template-apply";
import "../../components/entity/ha-entity-picker";
import type { HaListItem } from "../../components/ha-list-item";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { createCloseHeading } from "../../components/ha-dialog";

/**
 * This class represents a dialog for applying a template to chosen calendars.
 */
class DialogCalendarTemplateApply extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: CalendarTemplateApplyDialogParams;

  @state() private _info?: string;

  private _templateName?: string = undefined;

  /** The week on which to start applying the template */
  private _week?: number = undefined;

  /** The year on which to start applying the template. */
  private _year?: number = undefined;

  /** How often the template will be applied (1 = every week/month/year, 2 = every other week/month/year) */
  private _interval: number = 1;

  /** How often the template will be applied (weekly/monthly/yearly) */
  private _howOften: string = "";

  /** For how many weeks/months/years will the template be applied */
  private _endAfter: number = 1;

  /** The selected calendars for which the templates will be applied */
  private _selectedCalendars: string[] = [];

  public async showDialog(
    params: CalendarTemplateApplyDialogParams
  ): Promise<void> {
    this._params = params;
    this._info = undefined;
  }

  private closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  /**
   * Handles the selection of calendars for applying a template
   */
  private async _requestSelected(ev: CustomEvent<RequestSelectedDetail>) {
    ev.stopPropagation();
    const entityId = (ev.target as HaListItem).value;

    if (ev.detail.selected) {
      // Add to the list only if it's not already there
      if (!this._selectedCalendars.includes(entityId)) {
        this._selectedCalendars = [...this._selectedCalendars, entityId];
      }
    } else {
      // Remove from the list if deselected
      this._selectedCalendars = this._selectedCalendars.filter(
        (cal) => cal !== entityId
      );
    }
  }

  /**
   *
   * @returns HTML for the dialog of specifying application a template
   */
  protected render() {
    const calendarItems = this._params?.calendars.map(
      (selCal) => html`
        <ha-check-list-item
          @request-selected=${this._requestSelected}
          graphic="icon"
          style=${styleMap({
            "--mdc-theme-secondary": selCal.backgroundColor!,
          })}
          .value=${selCal.entity_id}
          .selected=${this._selectedCalendars.includes(selCal.entity_id)}
        >
          <ha-state-icon
            slot="graphic"
            .hass=${this.hass}
            .stateObj=${selCal}
          ></ha-state-icon>
          ${selCal.name}
        </ha-check-list-item>
      `
    );

    return html`
      <ha-dialog
        .open=${Boolean(this._params)}
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction=${this.closeDialog}
        .heading=${createCloseHeading(this.hass, "Enter template details")}
      >
        <div class="content">
          ${this._info
            ? html`<ha-alert
                alert-type="error"
                dismissable
                @alert-dismissed-clicked=${this._clearInfo}
                >${this._info}</ha-alert
              >`
            : ""}
          <ha-textfield
            class="template-name"
            label="Template Name"
            @input=${this._handleTemplateNameChanged}
            dialogInitialFocus
          ></ha-textfield>
          <ha-textfield
            class="week"
            label="Week"
            @input=${this._handleWeekChanged}
          ></ha-textfield>
          <ha-textfield
            class="year"
            label="Year"
            @input=${this._handleYearChanged}
          ></ha-textfield>
          <ha-select
            class="how-often"
            label="How often?"
            @closed=${stopPropagation}
            @selected=${this._handleHowOftenChanged}
            .value=${"none"}
          >
            <mwc-list-item value="none">None</mwc-list-item>
            <mwc-list-item value="weekly">Every week</mwc-list-item>
            <mwc-list-item value="monthly">Once a month</mwc-list-item>
            <mwc-list-item value="yearly">Once a year</mwc-list-item>
          </ha-select>
          <ha-textfield
            class="template-interval"
            label="Interval"
            type="number"
            inputmode="numeric"
            @input=${this._handleTemplateIntervalChanged}
            dialogInitialFocus
          ></ha-textfield>
          <ha-textfield
            class="end-after"
            label="End after"
            type="number"
            inputmode="numeric"
            @input=${this._handleTemplateOccurencesChanged}
            dialogInitialFocus
          ></ha-textfield>
          ${calendarItems}
        </div>
        <mwc-button slot="primaryAction" @click=${this._submitTemplateDetails}>
          Submit
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _clearInfo() {
    this._info = undefined;
  }

  private _handleTemplateNameChanged(event: Event): void {
    this._templateName = (event.target as HTMLInputElement).value;
  }

  private _handleWeekChanged(event: Event): void {
    this._week = Number((event.target as HTMLInputElement).value);
  }

  private _handleYearChanged(event: Event): void {
    this._year = Number((event.target as HTMLInputElement).value);
  }

  private _handleTemplateIntervalChanged(event: Event): void {
    this._interval = Number((event.target as HTMLInputElement).value);
  }

  private _handleHowOftenChanged(event: Event): void {
    event.stopPropagation();
    this._howOften = (event.target as HTMLInputElement).value;
  }

  private _handleTemplateOccurencesChanged(event: Event): void {
    this._endAfter = Number((event.target as HTMLInputElement).value);
  }

  /**
   * Converts the input to a valid recurrence rule and calls the onSave function. Reloads the page.
   */
  private _submitTemplateDetails(): void {
    if (this._templateName && this._week && this._selectedCalendars) {
      const templateName = this._templateName ?? "Default Template Name";
      const week = this._week ?? 40;
      const year = this._year ?? 2024;
      let rrule: string | undefined;
      if (this._howOften !== "none") {
        rrule =
          "FREQ=" +
          this._howOften.toUpperCase() +
          ";COUNT=" +
          this._endAfter +
          ";INTERVAL=" +
          this._interval;
      }
      this._params?.onSave(
        this._selectedCalendars,
        templateName,
        week,
        year,
        rrule
      );
      location.reload();
    } else {
      this._info = "Please fill out all fields before submitting";
    }
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
        ha-textarea,
        ha-select {
          margin-bottom: 26px;
          display: block;
        }
        /* ha-textarea {
          margin-bottom: 16px;
        } */
        ha-formfield {
          display: block;
          padding: 16px 0;
          margin-bottom: 16px;
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
          margin-bottom: 16px;
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
    "dialog-calendar-template-apply": DialogCalendarTemplateApply;
  }
}

customElements.define(
  "dialog-calendar-template-apply",
  DialogCalendarTemplateApply
);
