import { html, css, define, observe, raw, state } from "./BlissElement";

const Tabs = {
  styles: css`
    :host nav {
      display: inline-flex;
    }
  `,
  attrs: {
    activeTab: { type: Number },
  },
  // constructorCallback() {
  //   console.log("CONSTRUCTOR", this);
  //   debugger;
  // },
  // componentWillLoad() {
  //   return {
  //     promise: new Promise((resolve, reject) => {
  //       setTimeout(() => {
  //         resolve("aoeu");
  //       }, 3000);
  //     }),
  //     placeholder: html`FOO BAR`,
  //     error: {
  //       message: html`This is an error`,
  //       callback: function () {
  //         console.log("ERROR", this);
  //       },
  //     },
  //   };
  // },
  // componentDidLoad() {
  //   debugger;
  // },
  connectedCallback() {
    observe(() => {
      this[state].activeTab = this[state].activeTab ?? 0;
    });
  },
  render() {
    return html`
      <nav part="tabs">
        <slot name="bliss-tab"></slot>
      </nav>
      <div part="content">
        <slot name="bliss-tab-content"></slot>
      </div>
    `;
  },
};
define("bliss-tabs", Tabs);

function tabbable(rootNode = "bliss-tabs") {
  return {
    attrs: {
      active: { type: Boolean },
    },
    connectedCallback() {
      this.tabs = this.getContext(rootNode);
      const nodes = Array.from(
        this.tabs.querySelectorAll(`:scope > ${this.tagName}`)
      );
      this[state].index = nodes.findIndex((node) => node === this);

      // If this.active is true, then set tabs[state]activeTab to be this tab.
      observe(() => {
        if (this[state].active) this.tabs[state].activeTab = this[state].index;
      });

      // If tabs[state].activeTab is this tab, then set this tab's active prop to true.
      observe(() => {
        this[state].active = this.tabs[state].activeTab === this[state].index;
      });
    },

    disconnectedCallback() {
      if (this.tabs[state].activeTab === this[state].index)
        this.tabs[state].activeTab = undefined;
    },
  };
}

const keyboardNavigable = {
  attrs: { tabindex: { type: Number, default: 0 } },
  connectedCallback() {
    this.addEventListener("keypress", (e) => {
      if (
        e.target === this &&
        !this[state].disabled &&
        ["Enter", " "].includes(e.key)
      ) {
        this.click(e);
      }
    });
  },
  onclick(e) {
    debugger;
  },
};

const Tab = {
  styles: css`
    :host {
      border-bottom: 2px solid transparent;
      cursor: pointer;
    }
    :host([active]) {
      border-bottom-color: blueviolet;
    }
    :host([disabled]) {
      opacity: 0.5;
      cursor: not-allowed;
    }
    :host(:not(:nth-of-type(1))) {
      margin-left: 1rem;
    }
  `,
  render() {
    return html`<slot></slot>`;
  },
  onclick(e) {
    if (!this[state].disabled) {
      this.tabs[state].activeTab = this[state].index;
    }
  },
};
define("bliss-tab", Tab, {
  mixins: [tabbable("bliss-tabs"), keyboardNavigable],
});

const TabContent = {
  connectedCallback() {
    observe(() => {
      const activeIsNotHost = this.tabs[state].activeTab !== this[state].index;
      this[state].disabled = activeIsNotHost;
      this[state].hidden = activeIsNotHost;
    });
  },
  render() {
    return html`<slot></slot>`;
  },
};
define("bliss-tab-content", TabContent, { mixins: tabbable("bliss-tabs") });

const AlertButton = {
  onclick() {
    alert("You have been alerted");
  },
};
define("bliss-alert-button", AlertButton, {
  base: HTMLButtonElement,
  extend: "button",
});
