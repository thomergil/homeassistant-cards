import { LitElement, html } from "https://unpkg.com/lit?module";
import { classMap } from "https://unpkg.com/lit-html@2.3.1/directives/class-map.js?module"
import { unsafeHTML } from 'https://unpkg.com/lit-html@latest/directives/unsafe-html.js?module';

// Configure the preview in the Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'canvas-homework',
  name: 'Canvas - Homework Card',
  preview: false,
  description: 'A card used to display Canvas Homework.',
});

class CanvasStudent extends LitElement {
  // Whenever the state changes, a new `hass` object is set. Use this to
  // update your content.
  set hass(hass) {
    // Initialize the content if it's not there yet.
    this._hass = hass;

    this.students = new Array();
    this.courses = new Array();
    this.assignments = new Array();
    this.courseAssignments = new Array();
    this.date = new Date();

    if(Array.isArray(this.config.entities))
    {
      var configStudents = this.config.entities.find(a => a.entity == "sensor.canvas_students")
      var configCourses = this.config.entities.find(a => a.entity == "sensor.canvas_courses")
      var configAssignments = this.config.entities.find(a => a.entity == "sensor.canvas_assignments")
      var configSubmissions = this.config.entities.find(a => a.entity == "sensor.canvas_submissions")

      var eStudents = configStudents.entity in this._hass.states ? this._hass.states[configStudents.entity] : null
      var eCourses = configCourses.entity in this._hass.states ? this._hass.states[configCourses.entity] : null
      var eAssignments = configAssignments.entity in this._hass.states ? this._hass.states[configAssignments.entity] : null
      var eSubmissions = configSubmissions.entity in this._hass.states ? this._hass.states[configSubmissions.entity] : null

      eAssignments.attributes.assignment.forEach(assignment => {
        if ((!assignment.has_submitted_submissions || eSubmissions.attributes.submission.some(s => s.assignment_id == assignment.id && s.workflow_state == "unsubmitted")) && assignment.due_at) {
          assignment.missing = eSubmissions.attributes.submission.some(s => s.assignment_id == assignment.id && s.workflow_state == "unsubmitted" &&s.missing ) ? true : false
          this.courseAssignments.push(assignment.course_id)
          this.assignments.push(assignment)
        }
      })

      // Sort assignments by due date
      this.assignments.sort((a, b) => new Date(a.due_at) - new Date(b.due_at))

      eCourses.attributes.course.forEach(course => {
        if (!this.courses.some(c => c.name == course.name) && this.courseAssignments.some(ca => ca == course.id) && (Date.parse(course.term.start_at) <= this.date && Date.parse(course.term.end_at) >= this.date)) {
          // Find the earliest assignment due date for this course
          const courseAssignments = this.assignments.filter(a => a.course_id === course.id)
          if (courseAssignments.length > 0) {
            course.earliestDueDate = Math.min(...courseAssignments.map(a => new Date(a.due_at)))
          }
          this.courses.push(course)
        }
      })

      // Sort courses by earliest assignment due date
      this.courses.sort((a, b) => (a.earliestDueDate || Infinity) - (b.earliestDueDate || Infinity))

      eStudents.attributes.student.forEach(student => {
        this.students.push(student)
      })
    }
  }

  constructor(){
    super();
    this.addEventListener('canvas-check-homework', e => {
      console.log(e)
      const modal = this.shadowRoot.querySelector('canvas-assignment-dialog');
      modal.open = true;
      modal.title = e.detail.course.name;
      modal.assignmentname = e.detail.assignment.name;
      modal.totalpoints = e.detail.assignment.points_possible;
      modal.comments = e.detail.assignment.description;
      modal.assigneddate = e.detail.assignment.created_at;
      modal.duedate = e.detail.assignment.due_at;
      modal.missing = e.detail.assignment.missing == true ? e.detail.assignment.missing : false;
      modal.date = new Date().toLocaleDateString('en-CA');
    })
  }

  render(){
    return html
    `
    ${this._renderStyle()}
    ${html
      `
      <ha-card ${this.config.title ? `header="${this.config.title}"` : ''}>
        <div class="card-content">
        ${this.students.map(student =>
          html
          `
            <div class="info flex">
              <div>
              <span class="student_name"><ha-icon icon="mdi:account-school"></ha-icon> ${student.name} (${student.id})</span>
              <div class="secondary">
                ${this.courses.map(course =>
                  html
                  `
                  ${course.enrollments[0].user_id == student.id ? html
                    `
                    <span>${course.name}</span>
                    <mwc-list class="mdc-list--dense">
                    ${this.assignments.map(assignment =>
                      html
                      `
                      ${assignment.course_id == course.id ? html
                        `
                        <mwc-list-item class="mwc-compact ${this._getDueDateClass(assignment.due_at)}" @click="${() => this._handleClick(assignment,course)}">
                          <span class="assignment-content">
                            ${assignment.missing ? html`<ha-icon icon='mdi:calendar-alert' class='missing-icon'></ha-icon>`:this._getDueDateIcon(assignment.due_at)}
                            <span class="assignment-text">${this._formatDueDate(assignment.due_at)} [${assignment.points_possible || 'N/A'}] - ${assignment.name}</span>
                          </span>
                        </mwc-list-item>
                        `
                      :""}
                      `
                      )}
                    `
                  : ""}
                  </mwc-list>
                  `
                  )}
                </div>
              </div>
            </div>
          `
        )}
        <canvas-assignment-dialog></canvas-assignment-dialog>
        </div>
      </ha-card>
      `
      }
    `
  }

  _renderStyle() {
    return html
    `
    <style>
    ha-card {
      width: 100%;
      max-width: none;
    }
    .info {
      padding-bottom: 1em;
    }
    .flex {
      display: flex;
      justify-content: space-between;
    }
    .secondary {
      display: block;
      color: #3D95EC;
      margin-left: 28px;
    }
    .missing {
      color: #a3262c;
    }
    .mwc-compact{
      height: 24px !important;
      white-space: nowrap;
      overflow: visible;
    }
    .assignment-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .assignment-content ha-icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
    }
    .assignment-text {
      flex: 1;
    }
    .missing-icon {
      color: #a3262c !important;
    }
    .overdue {
      color: #a3262c !important;
      font-weight: bold;
    }
    .today {
      color: #F1D019 !important;
      font-weight: bold;
    }
    .tomorrow {
      color: #F1D019 !important;
    }
  </style>
    `;
  }

  // The user supplied configuration. Throw an exception and Home Assistant
  // will render an error card.
  setConfig(config) {
    if (!config.entities) {
      throw new Error('You need to define entities');
    }
    // Create a new config object - don't force a default title
    this.config = {
      ...config
    };
    // Set default title only if none provided and not explicitly empty
    if (this.config.title === undefined) {
      this.config.title = 'Canvas - Homework';
    }
  }

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  getCardSize() {
    return 3;
  }

  static getConfigElement() {
    return document.createElement("canvas-card-editor");
  }

  static getStubConfig() {
    return {
      title: "Canvas - Homework",
      entities: [
        {entity:'sensor.canvas_students'},
        {entity:'sensor.canvas_courses'},
        {entity:'sensor.canvas_assignments'},
        {entity:'sensor.canvas_submissions'}
      ]
    }
  }


  _handleClick(assignment,course) {
    this.dispatchEvent(new CustomEvent('canvas-check-homework', {detail: {assignment,course}}));
  }

  _formatDueDate(dueAt) {
    const dueDate = new Date(Date.parse(dueAt));
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Reset time for comparison
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    if (dueDateOnly.getTime() === todayOnly.getTime()) {
      return `TODAY ${dueDate.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true})}`;
    } else if (dueDateOnly.getTime() === tomorrowOnly.getTime()) {
      return `TOMORROW ${dueDate.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true})}`;
    } else if (dueDateOnly < todayOnly) {
      return `OVERDUE ${dueDate.toLocaleDateString('en-US', {month: 'numeric', day: 'numeric'})}`;
    } else {
      const daysDiff = Math.ceil((dueDateOnly - todayOnly) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 7) {
        return `${dueDate.toLocaleDateString('en-US', {weekday: 'short', month: 'numeric', day: 'numeric'})}`;
      } else {
        return dueDate.toLocaleDateString('en-US', {weekday: 'short', month: 'numeric', day: 'numeric'});
      }
    }
  }

  _getDueDateIcon(dueAt) {
    const dueDate = new Date(Date.parse(dueAt));
    const today = new Date();
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (dueDateOnly < todayOnly) {
      return html`<ha-icon icon='mdi:magnify' style='color:#a3262c'></ha-icon>`;
    } else if (dueDateOnly.getTime() === todayOnly.getTime()) {
      return html`<ha-icon icon='mdi:magnify' style='color:#F1D019'></ha-icon>`;
    } else {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      
      if (dueDateOnly.getTime() === tomorrowOnly.getTime()) {
        return html`<ha-icon icon='mdi:magnify' style='color:#F1D019'></ha-icon>`;
      } else {
        return html`<ha-icon icon='mdi:magnify' style='color:#3D95EC'></ha-icon>`;
      }
    }
  }

  _getDueDateClass(dueAt) {
    const dueDate = new Date(Date.parse(dueAt));
    const today = new Date();
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (dueDateOnly < todayOnly) {
      return 'overdue';
    } else if (dueDateOnly.getTime() === todayOnly.getTime()) {
      return 'today';
    } else {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

      if (dueDateOnly.getTime() === tomorrowOnly.getTime()) {
        return 'tomorrow';
      } else {
        return '';
      }
    }
  }


}

class AssignmentDialog extends LitElement{
  static get properties() {
    return {
      open: { type: Boolean },
      title: { type: String },
      text: { type: String },
      clickAction: { type: String }
    };
  }

  constructor() {
    super();
    this.open = false;
  }

  _renderStyle() {
    return html
    `
    <style>
      :host {
        font-family: Arial, Helvetica, sans-serif;
      }
      .wrapper {
        opacity: 0;
        position: absolute;
        z-index: 10;
        transition: opacity 0.25s ease-in;
      }
      .wrapper:not(.open) {
        visibility: hidden;
      }
      .wrapper.open {
        align-items: center;
        display: flex;
        justify-content: center;
        height: 100vh;
        position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        opacity: 1;
        visibility: visible;
      }
      .overlay {
        background: rgba(0, 0, 0, 0.8);
        height: 100%;
        width: 100%;
        position: relative;
      }
      .dialog {
        background: var( --ha-card-background, var(--card-background-color, white) );
        border-radius: 2px;
        max-width: 600px;
        padding: 1rem;
        position: absolute;
      }
      .dialog h1 {
        margin: 0 0 10px;
      }
      .dialog button {
        background-color: #3D95EC;
        color: white;
        width: 100%;
        font-size: 16px;
        padding: 15px 32px;
        border: none;
        border-radius: 10px;
        text-decoration: none;
        display: inline-block;
        margin-top: 10px;
      }
      .space-between {
        display: flex;
        justify-content: space-between;
      }
      .assignment-style {
        color: #3D95EC;
      }
      .assignment-due {
        color: #F1D019
      }
    </style>
    `;
  }

  render() {
    return html`
      ${this._renderStyle()}
      <div class="${classMap({wrapper: true, open: this.open})}">
        <div class="overlay" @click="${this.close}"></div>
        <div class="dialog">
          <h1 id="title">${this.title}</h1>
          <div id="content" class="content">
            <mwc-list class="mdc-list--dense">
              <mwc-list-item>${this.assignmentname}</mwc-list-item>
              ${this.missing ? html`<mwc-list-item style='color:#a3262c;'><ha-icon icon='mdi:alert-box'></ha-icon>&ensp;MISSING</mwc-list-item>` : ""}
              <mwc-list-item><ha-icon icon="mdi:counter"></ha-icon><span class="assignment-style">&ensp;Points: </span>${this.totalpoints}</mwc-list-item>
              <mwc-list-item><ha-icon icon="mdi:calendar"></ha-icon><span class="assignment-style">&ensp;Assigned On: </span>${new Date(Date.parse(this.assigneddate)).toLocaleString('en-US', {month: 'numeric', day:'numeric' })}</mwc-list-item>
              <mwc-list-item>${new Date(Date.parse(this.duedate)).toLocaleDateString('en-CA') <= this.date ? html`<ha-icon icon='mdi:calendar-alert' class='assignment-due'></ha-icon>` : html`<ha-icon icon='mdi:calendar-alert' ></ha-icon>`}<span class="assignment-style">&ensp;Due On: </span>${new Date(Date.parse(this.duedate)).toLocaleString('en-US', {month: 'numeric', day:'numeric' })}</mwc-list-item>
              <!--<mwc-list-item><ha-icon icon="mdi:comment-text"></ha-icon><span class="assignment-style">&ensp;Comments: </span>${unsafeHTML(this.comments)}</mwc-list-item>-->
            </mwc-list>
            ${this.comments ? html `
              <div id="canvas-comments">
                <h2>Description</h2>
              ${unsafeHTML(this.comments)}
            </div>
            ` : ""}
          </div>
          <button @click=${this.handleClick}>${this.clickAction}Close</button>
        </div>
      </div>
    `;
  }

  close() {
    this.open = false;
  }

  handleClick() {
    this.dispatchEvent(new CustomEvent('button-click'));
    this.close();
  }
}

class CanvasCardEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {}
    };
  }

  setConfig(config) {
    this.config = config;
  }

  render() {
    if (!this.hass || !this.config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <div class="option">
          <ha-textfield
            label="Title"
            .value=${this.config.title || 'Canvas - Homework'}
            .configValue=${'title'}
            @input=${this._valueChanged}
          ></ha-textfield>
        </div>
      </div>
    `;
  }

  _valueChanged(ev) {
    if (!this.config || !this.hass) {
      return;
    }
    const target = ev.target;
    const configValue = target.configValue;
    const value = target.value;

    if (this.config[configValue] === value) {
      return;
    }

    const newConfig = {
      ...this.config,
      [configValue]: value
    };

    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

customElements.define('canvas-assignment-dialog', AssignmentDialog);
customElements.define('canvas-card-editor', CanvasCardEditor);
customElements.define('canvas-homework', CanvasStudent);
