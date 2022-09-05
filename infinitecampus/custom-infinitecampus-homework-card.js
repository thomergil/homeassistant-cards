import { LitElement, html } from "https://unpkg.com/lit?module";
import { classMap } from "https://unpkg.com/lit-html@2.3.1/directives/class-map.js?module"

// Configure the preview in the Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'infinite-campus-test-hw',
  name: 'Infinite Campus - Test HW Card',
  preview: false,
  description: 'A card used to display Infinite Campus Homework.',
});

class InfiniteCampusStudent extends LitElement {
  // Whenever the state changes, a new `hass` object is set. Use this to
  // update your content.
  set hass(hass) {
    // Initialize the content if it's not there yet.
    this._hass = hass;

    this.students = new Array();
    this.courses = new Array();
    this.assignments = new Array();
    this.courseAssignments = new Array();
    this.date = new Date().toLocaleDateString('en-CA');

    if(Array.isArray(this.config.entities))
    {
      var configStudents = this.config.entities.find(a => a.entity == "sensor.infinite_campus_students")
      var configCourses = this.config.entities.find(a => a.entity == "sensor.infinite_campus_courses")
      var configAssignments = this.config.entities.find(a => a.entity == "sensor.infinite_campus_assignments")
      
      var eStudents = configStudents.entity in this._hass.states ? this._hass.states[configStudents.entity] : null
      var eCourses = configCourses.entity in this._hass.states ? this._hass.states[configCourses.entity] : null
      var eAssignments = configAssignments.entity in this._hass.states ? this._hass.states[configAssignments.entity] : null

      eAssignments.attributes.assignments.forEach(assignment => {
        if ((Date.parse(assignment.duedate) >= Date.parse(this.date) || (assignment.missing)) && !assignment.scorepoints) {
          this.courseAssignments.push(assignment.coursename)
          this.assignments.push(assignment)
        }
      })

      eCourses.attributes.courses.forEach(course => {
        //console.warn(course)
        if (!this.courses.some(c => c.coursename == course.coursename) && this.courseAssignments.some(ca => ca == course.coursename)) {
          this.courses.push(course)
        }
      })

      eStudents.attributes.students.forEach(student => {
        this.students.push(student)
      })
    }
  }

  constructor(){
    super();
    this.addEventListener('check-homework', e => {
      console.log(e)
      const modal = this.shadowRoot.querySelector('assignment-dialog');
      modal.open = true;
      modal.title = e.detail.e.coursename;
      modal.assignmentname = e.detail.e.assignmentname;
      modal.totalpoints = e.detail.e.totalpoints;
      modal.comments = e.detail.e.comments;
      modal.assigneddate = e.detail.e.assigneddate;
      modal.duedate = e.detail.e.duedate;
      modal.missing = e.detail.e.missing == true ? e.detail.e.missing : false;
      modal.date = new Date().toLocaleDateString('en-CA');
    })
  }

  render(){
    return html
    `
    ${this._renderStyle()}
    ${html
      `
      <ha-card header="Infinite Campus - Homework">
        <div class="card-content">
        ${this.students.map(student => 
          html
          `
            <div class="info flex">
              <div>
                <span class="student_name"><ha-icon icon="mdi:account-school"></ha-icon> ${student.firstname} ${student.lastname} (${student.studentnumber})</span>
                <div class="secondary">
                ${this.courses.map(course => 
                  html
                  `
                  ${course.personid == student.personid ? html
                    `
                    <span>${course.coursename}</span>
                    <mwc-list class="mdc-list--dense">
                    ${this.assignments.map(assignment =>
                      html
                      `
                      ${assignment.personid == student.personid && assignment.coursename == course.coursename ? html
                          `
                          <mwc-list-item class="mwc-compact" hasmeta @click="${() => this._handleClick(assignment)}">
                              <span ${assignment.missing ? "class='missing'" : ""}>${new Date(Date.parse(assignment.duedate)).toLocaleString('en-US', {month: 'numeric', day:'numeric' })} - ${assignment.assignmentname} ${assignment.missing ? "<span class='missing'>missing</span>" : ""}</span>
                              ${new Date(Date.parse(assignment.duedate)).toLocaleDateString('en-CA') <= this.date ? html`<span slot='meta'><ha-icon icon='mdi:calendar-alert' style='color:#F1D019'></ha-icon></span>` : ""}
                          </mwc-list-item>
                          `
                      :""}
                      `
                    )}
                    `
                  :""}
                  </mwc-list>
                  `
                )}
                </div>
              </div>
            </div>
          `
        )}
        <assignment-dialog></assignment-dialog>
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
          height: 24px !important
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
    this.config = config;
  }

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  getCardSize() {
    return 3;
  }

  static getConfigElement() {
    return document.createElement("content-card-editor");
  }

  static getStubConfig() {
    return { 
      entities: [
        {entity:'sensor.infinite_campus_students'},
        {entity:'sensor.infinite_campus_courses'},
        {entity:'sensor.infinite_campus_assignments'}
      ] 
    }
  }

  _handleClick(e,assignment) {
    this.dispatchEvent(new CustomEvent('check-homework', {detail: {e}}));
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
              ${this.missing ? "<mwc-list-item style='color:#a3262c;'><ha-icon icon='mdi:alert-box'></ha-icon>MISSING</mwc-list-item>" : ""}
              <mwc-list-item><ha-icon icon="mdi:counter"></ha-icon><span class="assignment-style">&ensp;Points: </span>${this.totalpoints}</mwc-list-item>
              <mwc-list-item><ha-icon icon="mdi:calendar"></ha-icon><span class="assignment-style">&ensp;Assigned On: </span>${new Date(Date.parse(this.assigneddate)).toLocaleString('en-US', {month: 'numeric', day:'numeric' })}</mwc-list-item>
              <mwc-list-item>${new Date(Date.parse(this.duedate)).toLocaleDateString('en-CA') <= this.date ? html`<ha-icon icon='mdi:calendar-alert' class='assignment-due'></ha-icon>` : html`<ha-icon icon='mdi:calendar-alert' ></ha-icon>`}<span class="assignment-style">&ensp;Due On: </span>${new Date(Date.parse(this.duedate)).toLocaleString('en-US', {month: 'numeric', day:'numeric' })}</mwc-list-item>
              <mwc-list-item><ha-icon icon="mdi:comment-text"></ha-icon><span class="assignment-style">&ensp;Comments: </span>${this.comments}</mwc-list-item>
            </mwc-list>
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

customElements.define('assignment-dialog', AssignmentDialog);
customElements.define('infinite-campus-test-hw', InfiniteCampusStudent);